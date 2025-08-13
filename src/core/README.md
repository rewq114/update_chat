# Core System - 로깅 및 에러 처리

이 문서는 백엔드 시스템의 로깅 및 에러 처리 인프라에 대해 설명합니다.

## 📁 구조

```
src/core/
├── logging/
│   ├── Logger.ts          # 메인 로거 클래스
│   └── LogAnalyzer.ts     # 로그 분석기
├── error/
│   ├── ErrorHandler.ts    # 에러 처리 핸들러
│   ├── CustomErrors.ts    # 커스텀 에러 클래스들
│   └── ErrorMiddleware.ts # 에러 처리 미들웨어
├── monitoring/
│   ├── PerformanceMonitor.ts # 성능 모니터링
│   └── SystemMonitor.ts      # 시스템 모니터링
├── system/
│   └── SystemInitializer.ts  # 시스템 초기화
└── test/
    └── logging-error-test.ts # 통합 테스트
```

## 🚀 주요 기능

### 1. 로깅 시스템 (Logger)

#### 기본 사용법
```typescript
import { Logger, LogLevel } from './logging/Logger';

const logger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: true,
  logDir: './logs',
  maxFileSize: 10, // MB
  maxFiles: 5
});

// 기본 로깅
logger.debug('CATEGORY', '디버그 메시지', { details: 'test' });
logger.info('CATEGORY', '정보 메시지', { details: 'test' });
logger.warn('CATEGORY', '경고 메시지', { details: 'test' });
logger.error('CATEGORY', '에러 메시지', error, { details: 'test' });
logger.fatal('CATEGORY', '치명적 에러', error, { details: 'test' });

// 특화된 로깅
logger.systemInit('시스템 시작', { version: '1.0.0' });
logger.ipc('channel-name', 'request', { data: 'test' });
logger.llm('request', 'claude-opus-4', { prompt: 'test' });
logger.mcp('call', 'tool-name', { params: 'test' });
logger.database('read', 'users', { query: 'test' });
logger.performance('operation', 150, { metadata: 'test' });
```

#### 특징
- **파일 로테이션**: 자동으로 로그 파일 크기 관리
- **레벨별 필터링**: DEBUG, INFO, WARN, ERROR, FATAL
- **구조화된 로깅**: JSON 형태의 상세 정보 포함
- **색상 출력**: 콘솔에서 레벨별 색상 구분
- **카테고리별 분류**: 시스템, 네트워크, 데이터베이스 등

### 2. 에러 처리 시스템 (ErrorHandler)

#### 기본 사용법
```typescript
import { ErrorHandler, ErrorCategory, ErrorSeverity } from './error/ErrorHandler';

const errorHandler = new ErrorHandler(logger);

await errorHandler.handleError(
  new Error('에러 메시지'),
  ErrorCategory.NETWORK,
  {
    operation: 'api-call',
    component: 'chat-service',
    userId: 'user123',
    sessionId: 'session456',
    requestId: 'req789',
    additionalData: { endpoint: '/api/chat' }
  },
  ErrorSeverity.MEDIUM
);
```

#### 에러 카테고리
- `SYSTEM`: 시스템 레벨 에러
- `NETWORK`: 네트워크 관련 에러
- `DATABASE`: 데이터베이스 에러
- `CONFIGURATION`: 설정 관련 에러
- `LLM`: LLM 서비스 에러
- `MCP`: MCP 도구 에러
- `IPC`: IPC 통신 에러
- `UI`: 사용자 인터페이스 에러

#### 에러 심각도
- `LOW`: 낮은 심각도 (정보성)
- `MEDIUM`: 중간 심각도 (경고)
- `HIGH`: 높은 심각도 (중요)
- `CRITICAL`: 치명적 심각도 (시스템 중단)

### 3. 커스텀 에러 클래스들

#### 사용법
```typescript
import { ErrorFactory } from './error/CustomErrors';

// 다양한 에러 타입
const configError = ErrorFactory.createConfigurationError('설정 파일을 찾을 수 없습니다');
const networkError = ErrorFactory.createNetworkError('네트워크 연결 실패');
const llmError = ErrorFactory.createLLMError('LLM API 호출 실패');
const dbError = ErrorFactory.createDatabaseError('데이터베이스 연결 실패');

// 에러 유틸리티
import { ErrorUtils } from './error/CustomErrors';

const canRetry = ErrorUtils.canRetry(error);
const serialized = ErrorUtils.serializeError(error);
const baseError = ErrorUtils.toBaseError(unknownError);
```

### 4. 에러 처리 미들웨어

#### 사용법
```typescript
import { createErrorMiddleware } from './error/ErrorMiddleware';

const errorMiddleware = createErrorMiddleware(errorHandler, logger, {
  enableGlobalErrorHandling: true,
  enableErrorRecovery: true,
  enableErrorReporting: true,
  maxRetryAttempts: 3,
  retryDelayMs: 1000
});

// 비동기 함수 래핑
const wrappedAsyncFn = errorMiddleware.wrapAsync(
  async (param: string) => {
    // 원본 함수 로직
    return await apiCall(param);
  },
  { operation: 'api-call', component: 'service' },
  ErrorCategory.NETWORK,
  ErrorSeverity.MEDIUM
);

// 동기 함수 래핑
const wrappedSyncFn = errorMiddleware.wrapSync(
  (data: any) => {
    // 원본 함수 로직
    return processData(data);
  },
  { operation: 'data-processing', component: 'service' },
  ErrorCategory.DATABASE,
  ErrorSeverity.LOW
);
```

### 5. 성능 모니터링

#### 사용법
```typescript
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';

const performanceMonitor = new PerformanceMonitor(logger);

// 비동기 성능 측정
const result = await performanceMonitor.measureAsync(
  'api-call',
  async () => {
    return await fetch('/api/data');
  },
  { endpoint: '/api/data' }
);

// 동기 성능 측정
const result = performanceMonitor.measureSync(
  'data-processing',
  () => {
    return processLargeDataset(data);
  },
  { datasetSize: data.length }
);

// 성능 통계 조회
const stats = performanceMonitor.getAllOperationStats();
const report = performanceMonitor.generatePerformanceReport();
```

### 6. 시스템 모니터링

#### 사용법
```typescript
import { SystemMonitor, SystemMonitorConfig } from './monitoring/SystemMonitor';

const config: SystemMonitorConfig = {
  logConfig: loggerConfig,
  enablePerformanceMonitoring: true,
  enableErrorHandling: true,
  enableSystemMetrics: true,
  cleanupInterval: 3600000 // 1시간
};

const systemMonitor = new SystemMonitor(config);

// 시스템 헬스 체크
const health = systemMonitor.getSystemHealth();
console.log('시스템 상태:', health.status);
console.log('메모리 사용량:', health.memoryUsage.usagePercent);
console.log('성능 지표:', health.performance);

// 시스템 메트릭
const metrics = systemMonitor.getSystemMetrics();
console.log('CPU 사용량:', metrics.cpuUsage);
console.log('메모리 사용량:', metrics.memoryUsage);
console.log('업타임:', metrics.uptime);
```

### 7. 로그 분석기

#### 사용법
```typescript
import { LogAnalyzer } from './logging/LogAnalyzer';

const logAnalyzer = new LogAnalyzer('./logs');

// 로그 분석
const analysis = logAnalyzer.analyzeLogs();
console.log('총 로그 엔트리:', analysis.summary.totalEntries);
console.log('에러율:', analysis.patterns.frequentErrors);
console.log('느린 작업:', analysis.patterns.slowOperations);
console.log('알림:', analysis.alerts);
console.log('권장사항:', analysis.recommendations);

// 필터링된 로그 조회
const errorLogs = logAnalyzer.getLogEntries({
  levels: [LogLevel.ERROR, LogLevel.FATAL],
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-02'),
  searchTerm: 'network'
});

// 실시간 모니터링
const interval = logAnalyzer.startRealTimeMonitoring((analysis) => {
  if (analysis.alerts.length > 0) {
    console.log('새로운 알림:', analysis.alerts);
  }
}, 60000); // 1분마다
```

## 🔧 설정

### 로거 설정
```typescript
interface LoggerConfig {
  level: LogLevel;           // 로그 레벨
  enableConsole: boolean;    // 콘솔 출력 활성화
  enableFile: boolean;       // 파일 출력 활성화
  logDir: string;           // 로그 디렉토리
  maxFileSize: number;      // 최대 파일 크기 (MB)
  maxFiles: number;         // 최대 파일 수
}
```

### 시스템 모니터 설정
```typescript
interface SystemMonitorConfig {
  logConfig: LoggerConfig;
  enablePerformanceMonitoring: boolean;
  enableErrorHandling: boolean;
  enableSystemMetrics: boolean;
  cleanupInterval: number; // 정리 작업 간격 (ms)
}
```

### 에러 미들웨어 설정
```typescript
interface ErrorMiddlewareConfig {
  enableGlobalErrorHandling: boolean;
  enableErrorRecovery: boolean;
  enableErrorReporting: boolean;
  maxRetryAttempts: number;
  retryDelayMs: number;
}
```

## 🧪 테스트

### 통합 테스트 실행
```bash
# TypeScript 컴파일
npx tsc src/core/test/logging-error-test.ts

# 테스트 실행
node src/core/test/logging-error-test.js
```

### 개별 컴포넌트 테스트
```typescript
import { runLoggingErrorTests } from './test/logging-error-test';

// 전체 테스트 실행
await runLoggingErrorTests();
```

## 📊 모니터링 대시보드

### 시스템 헬스 상태
- **Healthy**: 모든 시스템이 정상 작동
- **Warning**: 일부 경고사항 있음
- **Critical**: 심각한 문제 발생

### 주요 지표
- 메모리 사용량 (%)
- CPU 사용량
- 평균 응답 시간 (ms)
- 성공률 (%)
- 에러율 (%)
- 활성 작업 수

### 알림 시스템
- 에러 스파이크 감지
- 성능 저하 감지
- 메모리 사용량 경고
- 디스크 공간 부족

## 🔄 복구 전략

### 자동 복구
- **네트워크 에러**: 최대 3회 재시도, 지수 백오프
- **LLM 에러**: 최대 2회 재시도, 2초 지연
- **데이터베이스 에러**: 최대 2회 재시도, 0.5초 지연
- **MCP 에러**: 최대 1회 재시도, 1초 지연

### 폴백 액션
- **네트워크**: 캐시된 데이터 사용
- **LLM**: 오프라인 모드 전환
- **데이터베이스**: 메모리 캐시 사용
- **MCP**: MCP 기능 비활성화

## 📈 성능 최적화

### 로그 최적화
- 파일 로테이션으로 디스크 공간 절약
- 레벨별 필터링으로 불필요한 로그 제거
- 구조화된 로깅으로 파싱 성능 향상

### 에러 처리 최적화
- 에러 카테고리별 차별화된 처리
- 재시도 로직으로 일시적 실패 대응
- 에러 통계로 패턴 분석

### 모니터링 최적화
- 주기적 메트릭 수집으로 리소스 절약
- 임계값 기반 알림으로 불필요한 알림 방지
- 자동 정리로 메모리 사용량 관리

## 🛡️ 보안 고려사항

### 로그 보안
- 민감한 정보 마스킹
- 로그 파일 접근 권한 제한
- 로그 암호화 (필요시)

### 에러 정보 보안
- 스택 트레이스에서 민감 정보 제거
- 에러 로그 접근 제한
- 에러 보고 시 개인정보 제외

## 📚 추가 리소스

### 관련 문서
- [Logger API 문서](./logging/Logger.ts)
- [ErrorHandler API 문서](./error/ErrorHandler.ts)
- [PerformanceMonitor API 문서](./monitoring/PerformanceMonitor.ts)
- [SystemMonitor API 문서](./monitoring/SystemMonitor.ts)

### 예제 코드
- [통합 테스트](./test/logging-error-test.ts)
- [사용 예제](./examples/)

### 모니터링 도구
- 로그 분석기: 실시간 로그 분석
- 성능 대시보드: 시스템 성능 시각화
- 알림 시스템: 자동 알림 및 보고
