// core/test/logging-error-test.ts
import { Logger, LogLevel, LoggerConfig } from '../logging/Logger';
import { ErrorHandler, ErrorCategory, ErrorSeverity, ErrorContext } from '../error/ErrorHandler';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { SystemMonitor, SystemMonitorConfig } from '../monitoring/SystemMonitor';
import { LogAnalyzer } from '../logging/LogAnalyzer';
import { ErrorMiddleware, createErrorMiddleware } from '../error/ErrorMiddleware';
import { ErrorFactory, ErrorUtils } from '../error/CustomErrors';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 로깅 및 에러 처리 시스템 통합 테스트
 */
export class LoggingErrorTest {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private systemMonitor: SystemMonitor;
  private logAnalyzer: LogAnalyzer;
  private errorMiddleware: ErrorMiddleware;
  private testLogDir: string;

  constructor() {
    this.testLogDir = path.join(__dirname, '../../test-logs');
    // 속성들을 기본값으로 초기화
    this.logger = new Logger({ 
      level: LogLevel.DEBUG, 
      enableConsole: true, 
      enableFile: false,
      logDir: this.testLogDir,
      maxFileSize: 1,
      maxFiles: 3
    });
    this.errorHandler = new ErrorHandler(this.logger);
    this.performanceMonitor = new PerformanceMonitor(this.logger);
    this.systemMonitor = new SystemMonitor({ 
      logConfig: { 
        level: LogLevel.DEBUG, 
        enableConsole: true, 
        enableFile: false,
        logDir: this.testLogDir,
        maxFileSize: 1,
        maxFiles: 3
      },
      enablePerformanceMonitoring: true,
      enableErrorHandling: true,
      enableSystemMetrics: true,
      cleanupInterval: 5000
    });
    this.logAnalyzer = new LogAnalyzer(this.testLogDir);
    this.errorMiddleware = createErrorMiddleware(this.errorHandler, this.logger);
    
    this.initializeComponents();
  }

  /**
   * 컴포넌트 초기화
   */
  private initializeComponents(): void {
    // 테스트 로그 디렉토리 생성
    if (!fs.existsSync(this.testLogDir)) {
      fs.mkdirSync(this.testLogDir, { recursive: true });
    }

    // 로거 설정
    const loggerConfig: LoggerConfig = {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: true,
      logDir: this.testLogDir,
      maxFileSize: 1, // 1MB
      maxFiles: 3
    };

    this.logger = new Logger(loggerConfig);
    this.errorHandler = new ErrorHandler(this.logger);
    this.performanceMonitor = new PerformanceMonitor(this.logger);

    // 시스템 모니터 설정
    const systemMonitorConfig: SystemMonitorConfig = {
      logConfig: loggerConfig,
      enablePerformanceMonitoring: true,
      enableErrorHandling: true,
      enableSystemMetrics: true,
      cleanupInterval: 5000 // 5초
    };

    this.systemMonitor = new SystemMonitor(systemMonitorConfig);
    this.logAnalyzer = new LogAnalyzer(this.testLogDir);
    this.errorMiddleware = createErrorMiddleware(this.errorHandler, this.logger);
  }

  /**
   * 전체 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 로깅 및 에러 처리 시스템 테스트 시작...\n');

    try {
      await this.testBasicLogging();
      await this.testErrorHandling();
      await this.testPerformanceMonitoring();
      await this.testSystemMonitoring();
      await this.testErrorMiddleware();
      await this.testCustomErrors();
      await this.testLogAnalysis();
      await this.testIntegration();

      console.log('\n✅ 모든 테스트가 성공적으로 완료되었습니다!');
    } catch (error) {
      console.error('\n❌ 테스트 실패:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 기본 로깅 테스트
   */
  private async testBasicLogging(): Promise<void> {
    console.log('📝 기본 로깅 테스트...');

    // 다양한 레벨의 로그 테스트
    this.logger.debug('TEST', '디버그 메시지', { debugInfo: 'test' });
    this.logger.info('TEST', '정보 메시지', { info: 'test' });
    this.logger.warn('TEST', '경고 메시지', { warning: 'test' });
    this.logger.error('TEST', '에러 메시지', new Error('Test error'), { error: 'test' });
    this.logger.fatal('TEST', '치명적 에러 메시지', new Error('Fatal error'), { fatal: 'test' });

    // 특화된 로그 메서드 테스트
    this.logger.systemInit('시스템 초기화 테스트', { version: '1.0.0' });
    this.logger.systemShutdown('시스템 종료 테스트', { reason: 'test' });
    this.logger.ipc('test-channel', 'request', { data: 'test' });
    this.logger.llm('request', 'claude-opus-4', { prompt: 'test' });
    this.logger.mcp('call', 'test-tool', { params: 'test' });
    this.logger.database('read', 'users', { query: 'test' });
    this.logger.logConfig('read', 'apiKey', { key: 'test' });
    this.logger.performance('test-operation', 150, { metadata: 'test' });

    console.log('✅ 기본 로깅 테스트 완료');
  }

  /**
   * 에러 처리 테스트
   */
  private async testErrorHandling(): Promise<void> {
    console.log('⚠️ 에러 처리 테스트...');

    // 다양한 카테고리의 에러 테스트
    const testContext: ErrorContext = {
      operation: 'test-operation',
      component: 'test-component',
      userId: 'test-user',
      sessionId: 'test-session',
      requestId: 'test-request',
      additionalData: { test: true }
    };

    // 시스템 에러
    await this.errorHandler.handleError(
      new Error('시스템 에러 테스트'),
      ErrorCategory.SYSTEM,
      testContext,
      ErrorSeverity.HIGH
    );

    // 네트워크 에러
    await this.errorHandler.handleError(
      new Error('네트워크 에러 테스트'),
      ErrorCategory.NETWORK,
      testContext,
      ErrorSeverity.MEDIUM
    );

    // 데이터베이스 에러
    await this.errorHandler.handleError(
      new Error('데이터베이스 에러 테스트'),
      ErrorCategory.DATABASE,
      testContext,
      ErrorSeverity.HIGH
    );

    // LLM 에러
    await this.errorHandler.handleError(
      new Error('LLM 에러 테스트'),
      ErrorCategory.LLM,
      testContext,
      ErrorSeverity.MEDIUM
    );

    // 치명적 에러
    await this.errorHandler.handleError(
      new Error('치명적 에러 테스트'),
      ErrorCategory.SYSTEM,
      testContext,
      ErrorSeverity.CRITICAL
    );

    // 에러 통계 확인
    const stats = this.errorHandler.getErrorStats();
    console.log('📊 에러 통계:', stats);

    console.log('✅ 에러 처리 테스트 완료');
  }

  /**
   * 성능 모니터링 테스트
   */
  private async testPerformanceMonitoring(): Promise<void> {
    console.log('⚡ 성능 모니터링 테스트...');

    // 성능 측정 테스트
    await this.performanceMonitor.measureAsync(
      'test-async-operation',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'success';
      },
      { test: true }
    );

    // 동기 성능 측정 테스트
    this.performanceMonitor.measureSync(
      'test-sync-operation',
      () => {
        // 간단한 계산
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += i;
        }
        return sum;
      },
      { test: true }
    );

    // 성능 통계 확인
    const stats = this.performanceMonitor.getAllOperationStats();
    console.log('📊 성능 통계:', stats);

    // 성능 경고 체크
    this.performanceMonitor.checkPerformanceWarnings();
    this.performanceMonitor.checkMemoryWarnings();

    // 성능 리포트 생성
    const report = this.performanceMonitor.generatePerformanceReport();
    console.log('📈 성능 리포트:', report);

    console.log('✅ 성능 모니터링 테스트 완료');
  }

  /**
   * 시스템 모니터링 테스트
   */
  private async testSystemMonitoring(): Promise<void> {
    console.log('🔍 시스템 모니터링 테스트...');

    // 시스템 헬스 체크
    const health = this.systemMonitor.getSystemHealth();
    console.log('🏥 시스템 헬스:', health);

    // 시스템 메트릭 확인
    const metrics = this.systemMonitor.getSystemMetrics();
    console.log('📊 시스템 메트릭:', metrics);

    // 성능 리포트
    const performanceReport = this.systemMonitor.generatePerformanceReport();
    console.log('📈 시스템 성능 리포트:', performanceReport);

    // 에러 통계
    const errorStats = this.systemMonitor.getErrorStats();
    console.log('⚠️ 시스템 에러 통계:', errorStats);

    console.log('✅ 시스템 모니터링 테스트 완료');
  }

  /**
   * 에러 미들웨어 테스트
   */
  private async testErrorMiddleware(): Promise<void> {
    console.log('🛡️ 에러 미들웨어 테스트...');

    // 전역 에러 핸들링 설정
    this.errorMiddleware.setupGlobalErrorHandling();

    // 비동기 함수 래핑 테스트
    const wrappedAsyncFn = this.errorMiddleware.wrapAsync(
      async (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error('의도된 에러');
        }
        return 'success';
      },
      { operation: 'test-async', component: 'test' },
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM
    );

    // 성공 케이스
    const successResult = await wrappedAsyncFn(false);
    console.log('✅ 비동기 성공:', successResult);

    // 실패 케이스 (재시도)
    try {
      await wrappedAsyncFn(true);
    } catch (error) {
      console.log('❌ 비동기 실패 (예상됨):', error instanceof Error ? error.message : error);
    }

    // 동기 함수 래핑 테스트
    const wrappedSyncFn = this.errorMiddleware.wrapSync(
      (shouldFail: boolean) => {
        if (shouldFail) {
          throw new Error('의도된 동기 에러');
        }
        return 'sync-success';
      },
      { operation: 'test-sync', component: 'test' },
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM
    );

    // 성공 케이스
    const syncSuccessResult = wrappedSyncFn(false);
    console.log('✅ 동기 성공:', syncSuccessResult);

    // 실패 케이스
    try {
      wrappedSyncFn(true);
    } catch (error) {
      console.log('❌ 동기 실패 (예상됨):', error instanceof Error ? error.message : error);
    }

    // 미들웨어 상태 확인
    const status = this.errorMiddleware.getStatus();
    console.log('📊 미들웨어 상태:', status);

    console.log('✅ 에러 미들웨어 테스트 완료');
  }

  /**
   * 커스텀 에러 테스트
   */
  private async testCustomErrors(): Promise<void> {
    console.log('🎯 커스텀 에러 테스트...');

    // 다양한 커스텀 에러 생성
    const errors = [
      ErrorFactory.createConfigurationError('설정 에러 테스트'),
      ErrorFactory.createDatabaseError('데이터베이스 에러 테스트'),
      ErrorFactory.createNetworkError('네트워크 에러 테스트'),
      ErrorFactory.createLLMError('LLM 에러 테스트'),
      ErrorFactory.createMCPError('MCP 에러 테스트'),
      ErrorFactory.createIPCError('IPC 에러 테스트'),
      ErrorFactory.createSystemError('시스템 에러 테스트'),
      ErrorFactory.createValidationError('검증 에러 테스트'),
      ErrorFactory.createMigrationError('마이그레이션 에러 테스트'),
      ErrorFactory.createAuthenticationError('인증 에러 테스트'),
      ErrorFactory.createRateLimitError('속도 제한 에러 테스트'),
      ErrorFactory.createTimeoutError('타임아웃 에러 테스트'),
      ErrorFactory.createResourceNotFoundError('리소스 없음 에러 테스트'),
      ErrorFactory.createPermissionError('권한 에러 테스트'),
      ErrorFactory.createDataIntegrityError('데이터 무결성 에러 테스트'),
      ErrorFactory.createServiceUnavailableError('서비스 불가 에러 테스트'),
      ErrorFactory.createInvalidInputError('잘못된 입력 에러 테스트'),
      ErrorFactory.createMemoryError('메모리 에러 테스트'),
      ErrorFactory.createDiskSpaceError('디스크 공간 에러 테스트')
    ];

    // 에러 처리 및 로깅
    for (const error of errors) {
      await this.errorHandler.handleError(
        error,
        error.category,
        { operation: 'custom-error-test', component: 'test' },
        error.severity
      );
    }

    // 에러 유틸리티 테스트
    const testError = new Error('테스트 에러');
    const baseError = ErrorUtils.toBaseError(testError, ErrorCategory.UNKNOWN);
    console.log('🔄 에러 변환:', baseError);

    const canRetry = ErrorUtils.canRetry(baseError);
    console.log('🔄 재시도 가능:', canRetry);

    const serialized = ErrorUtils.serializeError(baseError);
    console.log('📄 직렬화된 에러:', serialized);

    console.log('✅ 커스텀 에러 테스트 완료');
  }

  /**
   * 로그 분석 테스트
   */
  private async testLogAnalysis(): Promise<void> {
    console.log('📊 로그 분석 테스트...');

    // 잠시 대기하여 로그 파일 생성
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 로그 분석 수행
    const analysis = this.logAnalyzer.analyzeLogs();
    console.log('📈 로그 분석 결과:', analysis);

    // 필터링된 로그 조회
    const errorLogs = this.logAnalyzer.getLogEntries({
      levels: [LogLevel.ERROR, LogLevel.FATAL]
    });
    console.log('⚠️ 에러 로그 수:', errorLogs.length);

    // 로그 파일 정보
    const logFileInfo = this.logAnalyzer.getLogFileInfo();
    console.log('📁 로그 파일 정보:', logFileInfo);

    // 분석 결과 내보내기
    const jsonExport = this.logAnalyzer.exportAnalysis(analysis, 'json');
    console.log('📄 JSON 내보내기 길이:', jsonExport.length);

    const csvExport = this.logAnalyzer.exportAnalysis(analysis, 'csv');
    console.log('📄 CSV 내보내기 길이:', csvExport.length);

    console.log('✅ 로그 분석 테스트 완료');
  }

  /**
   * 통합 테스트
   */
  private async testIntegration(): Promise<void> {
    console.log('🔗 통합 테스트...');

    // 복잡한 시나리오 시뮬레이션
    const complexOperation = async () => {
      // 1. 성능 측정 시작
      this.performanceMonitor.startOperation('complex-integration-test');

      // 2. 로그 기록
      this.logger.info('INTEGRATION', '복잡한 통합 테스트 시작');

      // 3. 의도적인 에러 발생
      try {
        throw ErrorFactory.createNetworkError('통합 테스트 네트워크 에러');
      } catch (error) {
        await this.errorHandler.handleError(
          error as Error,
          ErrorCategory.NETWORK,
          { operation: 'complex-integration', component: 'integration-test' },
          ErrorSeverity.MEDIUM
        );
      }

      // 4. 성능 측정 완료
      this.performanceMonitor.endOperation('complex-integration-test', true);

      // 5. 시스템 헬스 확인
      const health = this.systemMonitor.getSystemHealth();
      this.logger.info('INTEGRATION', '통합 테스트 완료', { health });

      return 'integration-success';
    };

    // 에러 미들웨어로 래핑하여 실행
    const wrappedOperation = this.errorMiddleware.wrapAsync(
      complexOperation,
      { operation: 'integration-test', component: 'test' },
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM
    );

    const result = await wrappedOperation();
    console.log('✅ 통합 테스트 결과:', result);

    console.log('✅ 통합 테스트 완료');
  }

  /**
   * 정리 작업
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 정리 작업 중...');

    // 성능 모니터 정리
    this.performanceMonitor.dispose();

    // 시스템 모니터 종료
    this.systemMonitor.shutdown();

    // 오래된 로그 정리
    const cleanedCount = this.logAnalyzer.cleanupOldLogs(0); // 모든 로그 삭제
    console.log(`🗑️ 정리된 로그 파일 수: ${cleanedCount}`);

    // 테스트 로그 디렉토리 삭제
    try {
      if (fs.existsSync(this.testLogDir)) {
        fs.rmSync(this.testLogDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('테스트 로그 디렉토리 삭제 실패:', error);
    }

    console.log('✅ 정리 작업 완료');
  }
}

// 테스트 실행 함수
export const runLoggingErrorTests = async (): Promise<void> => {
  const test = new LoggingErrorTest();
  await test.runAllTests();
};

// 직접 실행 시
if (require.main === module) {
  runLoggingErrorTests().catch(console.error);
}
