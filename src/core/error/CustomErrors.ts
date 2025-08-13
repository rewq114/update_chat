// core/error/CustomErrors.ts
import { ErrorCategory, ErrorSeverity } from './ErrorHandler';

export class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code: string = 'UNKNOWN_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.category = category;
    this.severity = severity;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;

    // 스택 트레이스 보존
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.CONFIGURATION, ErrorSeverity.MEDIUM, 'CONFIG_ERROR', context);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.HIGH, 'DATABASE_ERROR', context);
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, 'NETWORK_ERROR', context);
  }
}

export class LLMError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.LLM, ErrorSeverity.MEDIUM, 'LLM_ERROR', context);
  }
}

export class MCPError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.MCP, ErrorSeverity.MEDIUM, 'MCP_ERROR', context);
  }
}

export class IPCError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.IPC, ErrorSeverity.MEDIUM, 'IPC_ERROR', context);
  }
}

export class SystemError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, 'SYSTEM_ERROR', context);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.CONFIGURATION, ErrorSeverity.LOW, 'VALIDATION_ERROR', context);
  }
}

export class MigrationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.HIGH, 'MIGRATION_ERROR', context);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH, 'AUTH_ERROR', context);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.LLM, ErrorSeverity.MEDIUM, 'RATE_LIMIT_ERROR', context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, 'TIMEOUT_ERROR', context);
  }
}

export class ResourceNotFoundError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.LOW, 'NOT_FOUND_ERROR', context);
  }
}

export class PermissionError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, 'PERMISSION_ERROR', context);
  }
}

export class DataIntegrityError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.HIGH, 'DATA_INTEGRITY_ERROR', context);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, 'SERVICE_UNAVAILABLE_ERROR', context);
  }
}

export class InvalidInputError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.CONFIGURATION, ErrorSeverity.LOW, 'INVALID_INPUT_ERROR', context);
  }
}

export class MemoryError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, 'MEMORY_ERROR', context);
  }
}

export class DiskSpaceError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, ErrorCategory.SYSTEM, ErrorSeverity.HIGH, 'DISK_SPACE_ERROR', context);
  }
}

// 에러 팩토리 함수들
export const ErrorFactory = {
  createConfigurationError: (message: string, context?: Record<string, unknown>) => 
    new ConfigurationError(message, context),
  
  createDatabaseError: (message: string, context?: Record<string, unknown>) => 
    new DatabaseError(message, context),
  
  createNetworkError: (message: string, context?: Record<string, unknown>) => 
    new NetworkError(message, context),
  
  createLLMError: (message: string, context?: Record<string, unknown>) => 
    new LLMError(message, context),
  
  createMCPError: (message: string, context?: Record<string, unknown>) => 
    new MCPError(message, context),
  
  createIPCError: (message: string, context?: Record<string, unknown>) => 
    new IPCError(message, context),
  
  createSystemError: (message: string, context?: Record<string, unknown>) => 
    new SystemError(message, context),
  
  createValidationError: (message: string, context?: Record<string, unknown>) => 
    new ValidationError(message, context),
  
  createMigrationError: (message: string, context?: Record<string, unknown>) => 
    new MigrationError(message, context),
  
  createAuthenticationError: (message: string, context?: Record<string, unknown>) => 
    new AuthenticationError(message, context),
  
  createRateLimitError: (message: string, context?: Record<string, unknown>) => 
    new RateLimitError(message, context),
  
  createTimeoutError: (message: string, context?: Record<string, unknown>) => 
    new TimeoutError(message, context),
  
  createResourceNotFoundError: (message: string, context?: Record<string, unknown>) => 
    new ResourceNotFoundError(message, context),
  
  createPermissionError: (message: string, context?: Record<string, unknown>) => 
    new PermissionError(message, context),
  
  createDataIntegrityError: (message: string, context?: Record<string, unknown>) => 
    new DataIntegrityError(message, context),
  
  createServiceUnavailableError: (message: string, context?: Record<string, unknown>) => 
    new ServiceUnavailableError(message, context),
  
  createInvalidInputError: (message: string, context?: Record<string, unknown>) => 
    new InvalidInputError(message, context),
  
  createMemoryError: (message: string, context?: Record<string, unknown>) => 
    new MemoryError(message, context),
  
  createDiskSpaceError: (message: string, context?: Record<string, unknown>) => 
    new DiskSpaceError(message, context)
};

// 에러 유틸리티 함수들
export const ErrorUtils = {
  /**
   * 에러가 특정 타입인지 확인
   */
  isErrorType: (error: unknown, errorClass: new (...args: any[]) => BaseError): boolean => {
    return error instanceof errorClass;
  },

  /**
   * 에러를 BaseError로 변환
   */
  toBaseError: (error: unknown, defaultCategory: ErrorCategory = ErrorCategory.UNKNOWN): BaseError => {
    if (error instanceof BaseError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    return new BaseError(message, defaultCategory);
  },

  /**
   * 에러 스택 트레이스 정리
   */
  cleanStackTrace: (stack: string): string => {
    return stack
      .split('\n')
      .filter(line => !line.includes('node_modules'))
      .join('\n');
  },

  /**
   * 에러 정보를 JSON으로 직렬화
   */
  serializeError: (error: BaseError): Record<string, unknown> => {
    return {
      name: error.name,
      message: error.message,
      category: error.category,
      severity: error.severity,
      code: error.code,
      timestamp: error.timestamp.toISOString(),
      context: error.context,
      stack: error.stack
    };
  },

  /**
   * 에러 심각도에 따른 재시도 가능 여부 확인
   */
  canRetry: (error: BaseError): boolean => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return false;
      case ErrorSeverity.HIGH:
        return error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.LLM;
      case ErrorSeverity.MEDIUM:
        return true;
      case ErrorSeverity.LOW:
        return true;
      default:
        return false;
    }
  }
};
