// core/error/ErrorMiddleware.ts
import { ErrorHandler, ErrorCategory, ErrorSeverity, ErrorContext } from './ErrorHandler'
import { Logger } from '../logging/Logger'
import { ErrorUtils } from './CustomErrors'

export interface ErrorMiddlewareConfig {
  enableGlobalErrorHandling: boolean
  enableRecovery: boolean
  enableErrorReporting: boolean
  maxRetryAttempts: number
  retryDelayMs: number
}

export type AsyncFunction<T> = (...args: any[]) => Promise<T>
export type SyncFunction<T> = (...args: any[]) => T

export class ErrorMiddleware {
  private errorHandler: ErrorHandler
  private logger: Logger
  private config: ErrorMiddlewareConfig

  constructor(errorHandler: ErrorHandler, logger: Logger, config: Partial<ErrorMiddlewareConfig> = {}) {
    this.errorHandler = errorHandler
    this.logger = logger
    this.config = {
      enableGlobalErrorHandling: true,
      enableRecovery: true,
      enableErrorReporting: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      ...config
    }
  }

  /**
   * 비동기 함수를 에러 핸들링으로 래핑
   */
  wrapAsync<T>(
    asyncFn: AsyncFunction<T>,
    context: ErrorContext,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): AsyncFunction<T> {
    return async (...args: any[]): Promise<T> => {
      let lastError: Error | null = null

      for (let attempt = 1; attempt <= this.config.maxRetryAttempts; attempt++) {
        try {
          return await asyncFn(...args)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))

          // 에러 핸들러에 전달
          await this.errorHandler.handleError(
            lastError,
            category,
            context,
            severity
          )

          // 마지막 시도가 아니면 재시도
          if (attempt < this.config.maxRetryAttempts) {
            const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1) // 지수 백오프
            await this.delay(delay)
            continue
          }

          // 모든 재시도 실패
          this.logger.warn('ERROR_MIDDLEWARE', 'Max retries exceeded', {
            context: context.operation,
            attempts: attempt,
            error: lastError.message
          })
          throw lastError
        }
      }

      throw lastError!
    }
  }

  /**
   * 동기 함수를 에러 핸들링으로 래핑
   */
  wrapSync<T>(
    syncFn: SyncFunction<T>,
    context: ErrorContext,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): SyncFunction<T> {
    return (...args: any[]): T => {
      try {
        return syncFn(...args)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))

        // 에러 핸들러에 전달
        this.errorHandler.handleError(err, category, context, severity)
        throw err
      }
    }
  }

  /**
   * 전역 에러 핸들링 설정
   */
  setupGlobalErrorHandling(): void {
    if (!this.config.enableGlobalErrorHandling) {
      return
    }

    // 예상치 못한 예외 처리
    process.on('uncaughtException', (error) => {
      this.handleUncaughtError(error, 'uncaughtException')
    })

    // 처리되지 않은 Promise 거부 처리
    process.on('unhandledRejection', (reason) => {
      this.handleUncaughtError(
        reason instanceof Error ? reason : new Error(String(reason)),
        'unhandledRejection'
      )
    })
  }

  /**
   * 예상치 못한 에러 처리
   */
  private handleUncaughtError(error: Error, type: string): void {
    this.logger.fatal('ERROR_MIDDLEWARE', `Uncaught ${type}`, error, {
      // errorType: type, // Error 객체에 직접 속성 추가는 피함
      type
    })

    // 에러 핸들러에 전달
    this.errorHandler.handleError(
      error,
      ErrorCategory.SYSTEM,
      {
        operation: type,
        component: 'system',
        additionalData: { type }
      },
      ErrorSeverity.CRITICAL
    )

    // 치명적 에러인 경우 프로세스 종료
    if (type === 'uncaughtException') {
      process.exit(1)
    }
  }

  /**
   * 복구 시도
   */
  async attemptRecovery<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    category: ErrorCategory = ErrorCategory.UNKNOWN
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      this.logger.warn('ERROR_MIDDLEWARE', 'Recovery attempt failed', {
        context: context.operation,
        error: err.message
      })

      // 에러 핸들러에 전달
      await this.errorHandler.handleError(err, category, context, ErrorSeverity.HIGH)
      throw err
    }
  }

  /**
   * 에러 리포트
   */
  async reportError(
    error: Error,
    context: ErrorContext,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<void> {
    if (!this.config.enableErrorReporting) {
      return
    }

    try {
      // 에러 핸들러에 전달
      await this.errorHandler.handleError(error, category, context, severity)

      this.logger.info('ERROR_MIDDLEWARE', 'Error reported successfully', {
        errorId: ErrorUtils.serializeError(error as any).code,
        category,
        severity
      })
    } catch (reportError) {
      this.logger.error('ERROR_MIDDLEWARE', 'Failed to report error', reportError as Error)
    }
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats()
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 설정 업데이트
   */
  updateConfig(config: Partial<ErrorMiddlewareConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    config: ErrorMiddlewareConfig
    errorStats: ReturnType<ErrorHandler['getErrorStats']>
  } {
    return {
      config: this.config,
      errorStats: this.getErrorStats()
    }
  }
}

/**
 * ErrorMiddleware 팩토리 함수
 */
export const createErrorMiddleware = (
  errorHandler: ErrorHandler,
  logger: Logger,
  config: Partial<ErrorMiddlewareConfig> = {}
): ErrorMiddleware => {
  const defaultConfig: ErrorMiddlewareConfig = {
    enableGlobalErrorHandling: true,
    enableRecovery: true,
    enableErrorReporting: true,
    maxRetryAttempts: 3,
    retryDelayMs: 1000,
    ...config
  }
  return new ErrorMiddleware(errorHandler, logger, defaultConfig)
}

/**
 * 데코레이터 스타일 래퍼 (비동기)
 */
export const withErrorHandling = <T>(
  asyncFn: AsyncFunction<T>,
  context: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) => {
  return (errorHandler: ErrorHandler, logger: Logger) => {
    const defaultConfig: ErrorMiddlewareConfig = {
      enableGlobalErrorHandling: true,
      enableRecovery: true,
      enableErrorReporting: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000
    }
    const middleware = new ErrorMiddleware(errorHandler, logger, defaultConfig)
    return middleware.wrapAsync(
      asyncFn,
      { operation: context, component: 'unknown' },
      category,
      severity
    )
  }
}

/**
 * 데코레이터 스타일 래퍼 (동기)
 */
export const withSyncErrorHandling = <T>(
  syncFn: SyncFunction<T>,
  context: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) => {
  return (errorHandler: ErrorHandler, logger: Logger) => {
    const defaultConfig: ErrorMiddlewareConfig = {
      enableGlobalErrorHandling: true,
      enableRecovery: true,
      enableErrorReporting: true,
      maxRetryAttempts: 3,
      retryDelayMs: 1000
    }
    const middleware = new ErrorMiddleware(errorHandler, logger, defaultConfig)
    return middleware.wrapSync(
      syncFn,
      { operation: context, component: 'unknown' },
      category,
      severity
    )
  }
}
