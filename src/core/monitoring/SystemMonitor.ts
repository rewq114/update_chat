// core/monitoring/SystemMonitor.ts
import { Logger, LogLevel, LoggerConfig } from '../logging/Logger';
import { ErrorHandler, ErrorCategory, ErrorSeverity, ErrorContext } from '../error/ErrorHandler';
import { PerformanceMonitor } from './PerformanceMonitor';
import * as path from 'path';

export interface SystemMonitorConfig {
  logConfig: LoggerConfig;
  enablePerformanceMonitoring: boolean;
  enableErrorHandling: boolean;
  enableSystemMetrics: boolean;
  cleanupInterval: number; // ms
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    usagePercent: number;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    activeOperations: number;
  };
  errors: {
    totalErrors: number;
    unhandledErrors: number;
    criticalErrors: number;
  };
  warnings: string[];
}

export class SystemMonitor {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private config: SystemMonitorConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: SystemMonitorConfig) {
    this.config = config;
    
    // 로거 초기화
    this.logger = new Logger(config.logConfig);
    
    // 에러 핸들러 초기화
    this.errorHandler = new ErrorHandler(this.logger);
    
    // 성능 모니터 초기화
    this.performanceMonitor = new PerformanceMonitor(this.logger);
    
    // 시스템 모니터링 시작
    this.startMonitoring();
  }

  /**
   * 시스템 모니터링 시작
   */
  private startMonitoring(): void {
    this.logger.systemInit('System monitoring started', {
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      enableErrorHandling: this.config.enableErrorHandling,
      enableSystemMetrics: this.config.enableSystemMetrics
    });

    // 정기적인 정리 작업
    if (this.config.cleanupInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, this.config.cleanupInterval);
    }

    // 정기적인 헬스 체크
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // 1분마다

    // 프로세스 종료 시 정리
    process.on('exit', () => {
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.shutdown();
      process.exit(0);
    });

    // 예상치 못한 에러 처리
    process.on('uncaughtException', (error) => {
      this.handleUncaughtError(error, 'uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.handleUncaughtError(
        reason instanceof Error ? reason : new Error(String(reason)),
        'unhandledRejection'
      );
    });
  }

  /**
   * 예상치 못한 에러 처리
   */
  private handleUncaughtError(error: Error, type: string): void {
    this.logger.fatal('SYSTEM_MONITOR', `Uncaught ${type}`, {
      errorType: type,
      errorMessage: error.message,
      stack: error.stack
    }, error);

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
    );

    // 치명적 에러인 경우 프로세스 종료
    if (type === 'uncaughtException') {
      this.shutdown();
      process.exit(1);
    }
  }

  /**
   * 정기적인 정리 작업
   */
  private performCleanup(): void {
    try {
      // 오래된 로그 정리
      this.logger.info('SYSTEM_MONITOR', 'Starting cleanup process');

      // 오래된 에러 정리
      this.errorHandler.cleanupOldErrors();

      // 오래된 성능 메트릭 정리
      this.performanceMonitor.cleanupOldMetrics();

      // 성능 경고 체크
      this.performanceMonitor.checkPerformanceWarnings();

      // 메모리 경고 체크
      this.performanceMonitor.checkMemoryWarnings();

      this.logger.info('SYSTEM_MONITOR', 'Cleanup process completed');
    } catch (error) {
      this.logger.error('SYSTEM_MONITOR', 'Cleanup process failed', error as Error);
    }
  }

  /**
   * 정기적인 헬스 체크
   */
  private performHealthCheck(): void {
    try {
      const health = this.getSystemHealth();
      
      if (health.status === 'critical') {
        this.logger.error('SYSTEM_MONITOR', 'Critical system health detected', {
          health
        });
      } else if (health.status === 'warning') {
        this.logger.warn('SYSTEM_MONITOR', 'Warning system health detected', {
          health
        });
      } else {
        this.logger.debug('SYSTEM_MONITOR', 'System health check passed', {
          health
        });
      }
    } catch (error) {
      this.logger.error('SYSTEM_MONITOR', 'Health check failed', error as Error);
    }
  }

  /**
   * 시스템 헬스 상태 조회
   */
  getSystemHealth(): SystemHealth {
    const systemMetrics = this.performanceMonitor.getSystemMetrics();
    const performanceStats = this.performanceMonitor.getAllOperationStats();
    const errorStats = this.errorHandler.getErrorStats();

    // 메모리 사용량 계산
    const heapUsedMB = systemMetrics.memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = systemMetrics.memoryUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    // 성능 통계 계산
    let totalCalls = 0;
    let totalSuccessfulCalls = 0;
    let totalDuration = 0;

    for (const stat of Object.values(performanceStats)) {
      totalCalls += stat.totalCalls;
      totalSuccessfulCalls += stat.successfulCalls;
      totalDuration += stat.averageDuration * stat.totalCalls;
    }

    const averageResponseTime = totalCalls > 0 ? totalDuration / totalCalls : 0;
    const successRate = totalCalls > 0 ? (totalSuccessfulCalls / totalCalls) * 100 : 100;

    // 경고 메시지 수집
    const warnings: string[] = [];

    if (memoryUsagePercent > 80) {
      warnings.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    if (successRate < 95) {
      warnings.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }

    if (averageResponseTime > 5000) {
      warnings.push(`Slow average response time: ${averageResponseTime.toFixed(0)}ms`);
    }

    if (errorStats.unhandledErrors > 0) {
      warnings.push(`${errorStats.unhandledErrors} unhandled errors`);
    }

    // 상태 결정
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (memoryUsagePercent > 95 || successRate < 80 || errorStats.criticalErrors > 0) {
      status = 'critical';
    } else if (warnings.length > 0) {
      status = 'warning';
    }

    return {
      status,
      uptime: systemMetrics.uptime,
      memoryUsage: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        usagePercent: memoryUsagePercent
      },
      performance: {
        averageResponseTime,
        successRate,
        activeOperations: systemMetrics.activeConnections
      },
      errors: {
        totalErrors: errorStats.totalErrors,
        unhandledErrors: errorStats.unhandledErrors,
        criticalErrors: errorStats.errorsBySeverity[ErrorSeverity.CRITICAL] || 0
      },
      warnings
    };
  }

  /**
   * 에러 처리
   */
  async handleError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): Promise<void> {
    await this.errorHandler.handleError(error, category, context, severity);
  }

  /**
   * 성능 측정
   */
  async measureAsync<T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    return this.performanceMonitor.measureAsync(operation, asyncFn, metadata);
  }

  measureSync<T>(
    operation: string,
    syncFn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    return this.performanceMonitor.measureSync(operation, syncFn, metadata);
  }

  /**
   * 로그 기록
   */
  log(level: LogLevel, category: string, message: string, details?: Record<string, unknown>): void {
    this.logger.log(level, category, message, details);
  }

  debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.logger.debug(category, message, details);
  }

  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.logger.info(category, message, details);
  }

  warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.logger.warn(category, message, details);
  }

  error(category: string, message: string, error?: Error, details?: Record<string, unknown>): void {
    this.logger.error(category, message, error, details);
  }

  fatal(category: string, message: string, error?: Error, details?: Record<string, unknown>): void {
    this.logger.fatal(category, message, error, details);
  }

  /**
   * 성능 리포트 생성
   */
  generatePerformanceReport() {
    return this.performanceMonitor.generatePerformanceReport();
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * 시스템 메트릭 조회
   */
  getSystemMetrics() {
    return this.performanceMonitor.getSystemMetrics();
  }

  /**
   * 로그 레벨 변경
   */
  setLogLevel(level: LogLevel): void {
    this.logger.setLogLevel(level);
  }

  /**
   * 시스템 모니터링 종료
   */
  shutdown(): void {
    this.logger.systemShutdown('System monitoring shutdown started');

    // 정리 작업 중지
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // 성능 모니터 정리
    this.performanceMonitor.dispose();

    this.logger.systemShutdown('System monitoring shutdown completed');
  }

  /**
   * 로거 인스턴스 반환
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * 에러 핸들러 인스턴스 반환
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 성능 모니터 인스턴스 반환
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }
}
