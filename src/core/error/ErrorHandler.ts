// core/error/ErrorHandler.ts
import { Logger, LogLevel } from '../logging/Logger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SYSTEM = 'system',
  NETWORK = 'network',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',
  LLM = 'llm',
  MCP = 'mcp',
  IPC = 'ipc',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  operation: string;
  component: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorInfo {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error: Error;
  context: ErrorContext;
  handled: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecoveryStrategy {
  canRetry: boolean;
  maxRetries: number;
  retryDelay: number; // ms
  fallbackAction?: () => Promise<void>;
  cleanupAction?: () => Promise<void>;
}

export class ErrorHandler {
  private logger: Logger;
  private errors: Map<string, ErrorInfo> = new Map();
  private recoveryStrategies: Map<ErrorCategory, ErrorRecoveryStrategy> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeRecoveryStrategies();
  }

  /**
   * 에러 처리 메인 메서드
   */
  async handleError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<void> {
    const errorId = this.generateErrorId();
    const errorInfo: ErrorInfo = {
      id: errorId,
      timestamp: new Date(),
      severity,
      category,
      message: error.message,
      error,
      context,
      handled: false,
      retryCount: 0,
      maxRetries: this.getRecoveryStrategy(category).maxRetries
    };

    this.errors.set(errorId, errorInfo);

    // 로그 기록
    this.logError(errorInfo);

    // 심각도에 따른 처리
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        await this.handleCriticalError(errorInfo);
        break;
      case ErrorSeverity.HIGH:
        await this.handleHighSeverityError(errorInfo);
        break;
      case ErrorSeverity.MEDIUM:
        await this.handleMediumSeverityError(errorInfo);
        break;
      case ErrorSeverity.LOW:
        await this.handleLowSeverityError(errorInfo);
        break;
    }
  }

  /**
   * 치명적 에러 처리
   */
  private async handleCriticalError(errorInfo: ErrorInfo): Promise<void> {
    this.logger.fatal('ERROR_HANDLER', 'Critical error occurred', {
      errorId: errorInfo.id,
      category: errorInfo.category,
      context: errorInfo.context
    }, errorInfo.error);

    // 시스템 안전 모드로 전환
    await this.enterSafeMode(errorInfo);

    // 사용자에게 알림
    this.notifyUser('critical', errorInfo);

    // 복구 시도
    await this.attemptRecovery(errorInfo);
  }

  /**
   * 높은 심각도 에러 처리
   */
  private async handleHighSeverityError(errorInfo: ErrorInfo): Promise<void> {
    this.logger.error('ERROR_HANDLER', 'High severity error occurred', {
      errorId: errorInfo.id,
      category: errorInfo.category,
      context: errorInfo.context
    }, errorInfo.error);

    // 자동 복구 시도
    await this.attemptRecovery(errorInfo);

    // 사용자에게 알림
    this.notifyUser('high', errorInfo);
  }

  /**
   * 중간 심각도 에러 처리
   */
  private async handleMediumSeverityError(errorInfo: ErrorInfo): Promise<void> {
    this.logger.warn('ERROR_HANDLER', 'Medium severity error occurred', {
      errorId: errorInfo.id,
      category: errorInfo.category,
      context: errorInfo.context
    });

    // 복구 시도
    await this.attemptRecovery(errorInfo);
  }

  /**
   * 낮은 심각도 에러 처리
   */
  private async handleLowSeverityError(errorInfo: ErrorInfo): Promise<void> {
    this.logger.info('ERROR_HANDLER', 'Low severity error occurred', {
      errorId: errorInfo.id,
      category: errorInfo.category,
      context: errorInfo.context
    });

    // 단순 로그만 기록
  }

  /**
   * 복구 시도
   */
  private async attemptRecovery(errorInfo: ErrorInfo): Promise<void> {
    const strategy = this.getRecoveryStrategy(errorInfo.category);

    if (!strategy.canRetry || errorInfo.retryCount >= strategy.maxRetries) {
      // 최대 재시도 횟수 초과
      errorInfo.handled = true;
      this.logger.warn('ERROR_HANDLER', 'Max retries exceeded', {
        errorId: errorInfo.id,
        retryCount: errorInfo.retryCount,
        maxRetries: strategy.maxRetries
      });

      // 폴백 액션 실행
      if (strategy.fallbackAction) {
        try {
          await strategy.fallbackAction();
          this.logger.info('ERROR_HANDLER', 'Fallback action executed successfully', {
            errorId: errorInfo.id
          });
        } catch (fallbackError) {
          this.logger.error('ERROR_HANDLER', 'Fallback action failed', {
            errorId: errorInfo.id
          }, fallbackError as Error);
        }
      }

      return;
    }

    // 재시도 지연
    await this.delay(strategy.retryDelay);

    // 재시도 카운트 증가
    errorInfo.retryCount++;

    this.logger.info('ERROR_HANDLER', 'Retrying operation', {
      errorId: errorInfo.id,
      retryCount: errorInfo.retryCount,
      maxRetries: strategy.maxRetries
    });

    // 재시도 로직은 호출자가 구현해야 함
  }

  /**
   * 안전 모드 진입
   */
  private async enterSafeMode(errorInfo: ErrorInfo): Promise<void> {
    this.logger.warn('ERROR_HANDLER', 'Entering safe mode', {
      errorId: errorInfo.id,
      category: errorInfo.category
    });

    // 중요하지 않은 기능들 비활성화
    // 기본 기능만 유지
    // 사용자에게 안전 모드 알림
  }

  /**
   * 사용자 알림
   */
  private notifyUser(severity: 'critical' | 'high' | 'medium', errorInfo: ErrorInfo): void {
    const messages = {
      critical: '치명적인 오류가 발생했습니다. 시스템이 안전 모드로 전환됩니다.',
      high: '중요한 오류가 발생했습니다. 일부 기능이 제한될 수 있습니다.',
      medium: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    };

    // IPC를 통해 프론트엔드에 알림 전송
    // 실제 구현에서는 IPC 이벤트를 발생시켜야 함
    this.logger.info('ERROR_HANDLER', 'User notification sent', {
      errorId: errorInfo.id,
      severity,
      message: messages[severity]
    });
  }

  /**
   * 에러 로그 기록
   */
  private logError(errorInfo: ErrorInfo): void {
    const logLevel = this.getLogLevelForSeverity(errorInfo.severity);
    
    this.logger.log(logLevel, 'ERROR_HANDLER', errorInfo.message, {
      errorId: errorInfo.id,
      severity: errorInfo.severity,
      category: errorInfo.category,
      context: errorInfo.context,
      stack: errorInfo.error.stack
    }, errorInfo.error);
  }

  /**
   * 복구 전략 초기화
   */
  private initializeRecoveryStrategies(): void {
    // 시스템 에러
    this.recoveryStrategies.set(ErrorCategory.SYSTEM, {
      canRetry: false,
      maxRetries: 0,
      retryDelay: 0,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'System error fallback: restarting components');
      }
    });

    // 네트워크 에러
    this.recoveryStrategies.set(ErrorCategory.NETWORK, {
      canRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'Network error fallback: using cached data');
      }
    });

    // 데이터베이스 에러
    this.recoveryStrategies.set(ErrorCategory.DATABASE, {
      canRetry: true,
      maxRetries: 2,
      retryDelay: 500,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'Database error fallback: using memory cache');
      }
    });

    // LLM 에러
    this.recoveryStrategies.set(ErrorCategory.LLM, {
      canRetry: true,
      maxRetries: 2,
      retryDelay: 2000,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'LLM error fallback: using offline mode');
      }
    });

    // MCP 에러
    this.recoveryStrategies.set(ErrorCategory.MCP, {
      canRetry: true,
      maxRetries: 1,
      retryDelay: 1000,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'MCP error fallback: disabling MCP features');
      }
    });

    // IPC 에러
    this.recoveryStrategies.set(ErrorCategory.IPC, {
      canRetry: true,
      maxRetries: 2,
      retryDelay: 500,
      fallbackAction: async () => {
        this.logger.warn('ERROR_HANDLER', 'IPC error fallback: reconnecting to renderer');
      }
    });

    // 기본 전략
    this.recoveryStrategies.set(ErrorCategory.UNKNOWN, {
      canRetry: false,
      maxRetries: 0,
      retryDelay: 0
    });
  }

  /**
   * 복구 전략 가져오기
   */
  private getRecoveryStrategy(category: ErrorCategory): ErrorRecoveryStrategy {
    return this.recoveryStrategies.get(category) || this.recoveryStrategies.get(ErrorCategory.UNKNOWN)!;
  }

  /**
   * 심각도에 따른 로그 레벨 결정
   */
  private getLogLevelForSeverity(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return LogLevel.FATAL;
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 에러 ID 생성
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    unhandledErrors: number;
  } {
    const stats = {
      totalErrors: this.errors.size,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      unhandledErrors: 0
    };

    for (const error of this.errors.values()) {
      // 카테고리별 통계
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;
      
      // 심각도별 통계
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      
      // 미처리 에러 통계
      if (!error.handled) {
        stats.unhandledErrors++;
      }
    }

    return stats;
  }

  /**
   * 에러 목록 조회
   */
  getErrors(): ErrorInfo[] {
    return Array.from(this.errors.values());
  }

  /**
   * 특정 에러 조회
   */
  getError(errorId: string): ErrorInfo | undefined {
    return this.errors.get(errorId);
  }

  /**
   * 에러 처리 완료 표시
   */
  markErrorAsHandled(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.handled = true;
      this.logger.info('ERROR_HANDLER', 'Error marked as handled', { errorId });
    }
  }

  /**
   * 오래된 에러 정리
   */
  cleanupOldErrors(maxAge: number = 24 * 60 * 60 * 1000): void { // 기본 24시간
    const now = new Date();
    const cutoff = new Date(now.getTime() - maxAge);

    for (const [errorId, error] of this.errors.entries()) {
      if (error.timestamp < cutoff) {
        this.errors.delete(errorId);
      }
    }

    this.logger.info('ERROR_HANDLER', 'Old errors cleaned up', {
      cleanedCount: this.errors.size
    });
  }
}
