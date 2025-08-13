// core/logging/Logger.ts
import * as fs from 'fs'
import * as path from 'path'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  details?: Record<string, unknown>
  error?: Error
}

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  logDir: string
  maxFileSize: number // MB
  maxFiles: number
}

export class Logger {
  private config: LoggerConfig
  private logFile: string
  private currentFileSize: number = 0

  constructor(config: LoggerConfig) {
    this.config = config
    this.logFile = path.join(config.logDir, `app-${this.getDateString()}.log`)
    this.ensureLogDirectory()
  }

  /**
   * 디버그 레벨 로그
   */
  debug(category: string, message: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, category, message, details)
  }

  /**
   * 정보 레벨 로그
   */
  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, category, message, details)
  }

  /**
   * 경고 레벨 로그
   */
  warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, category, message, details)
  }

  /**
   * 에러 레벨 로그
   */
  error(category: string, message: string, error?: Error, details?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, category, message, details, error)
  }

  /**
   * 치명적 에러 레벨 로그
   */
  fatal(category: string, message: string, error?: Error, details?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, category, message, details, error)
  }

  /**
   * 시스템 초기화 로그
   */
  systemInit(message: string, details?: Record<string, unknown>): void {
    this.info('SYSTEM_INIT', message, details)
  }

  /**
   * 시스템 종료 로그
   */
  systemShutdown(message: string, details?: Record<string, unknown>): void {
    this.info('SYSTEM_SHUTDOWN', message, details)
  }

  /**
   * IPC 통신 로그
   */
  ipc(
    channel: string,
    action: 'request' | 'response' | 'error',
    data?: Record<string, unknown>
  ): void {
    this.debug('IPC', `${channel} ${action}`, data)
  }

  /**
   * LLM 요청/응답 로그
   */
  llm(
    action: 'request' | 'response' | 'error',
    model: string,
    details?: Record<string, unknown>
  ): void {
    this.info('LLM', `${action} for model: ${model}`, details)
  }

  /**
   * MCP 도구 실행 로그
   */
  mcp(
    action: 'call' | 'success' | 'error',
    toolName: string,
    details?: Record<string, unknown>
  ): void {
    this.info('MCP', `${action} tool: ${toolName}`, details)
  }

  /**
   * 데이터베이스 작업 로그
   */
  database(
    action: 'read' | 'write' | 'delete' | 'migrate',
    entity: string,
    details?: Record<string, unknown>
  ): void {
    this.debug('DATABASE', `${action} ${entity}`, details)
  }

  /**
   * 설정 변경 로그
   */
  logConfig(
    action: 'read' | 'write' | 'reset',
    key: string,
    details?: Record<string, unknown>
  ): void {
    this.info('CONFIG', `${action} ${key}`, details)
  }

  /**
   * 성능 측정 로그
   */
  performance(operation: string, duration: number, details?: Record<string, unknown>): void {
    this.debug('PERFORMANCE', `${operation} took ${duration}ms`, details)
  }

  /**
   * 내부 로그 처리
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    details?: Record<string, unknown>,
    error?: Error
  ): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      error
    }

    const logMessage = this.formatLogEntry(entry)

    // 콘솔 출력
    if (this.config.enableConsole) {
      this.writeToConsole(entry)
    }

    // 파일 출력
    if (this.config.enableFile) {
      this.writeToFile(logMessage)
    }
  }

  /**
   * 로그 엔트리 포맷팅
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level].padEnd(5)
    const timestamp = entry.timestamp
    const category = entry.category.padEnd(15)
    const message = entry.message

    let logLine = `[${timestamp}] ${levelStr} [${category}] ${message}`

    if (entry.details) {
      logLine += ` | Details: ${JSON.stringify(entry.details)}`
    }

    if (entry.error) {
      logLine += ` | Error: ${entry.error.message}`
      if (entry.error.stack) {
        logLine += `\nStack: ${entry.error.stack}`
      }
    }

    return logLine + '\n'
  }

  /**
   * 콘솔 출력
   */
  private writeToConsole(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m' // Magenta
    }

    const reset = '\x1b[0m'
    const color = colors[entry.level]
    const levelStr = LogLevel[entry.level].padEnd(5)
    const category = entry.category.padEnd(15)

    let output = `${color}[${levelStr}]${reset} [${category}] ${entry.message}`

    if (entry.details) {
      output += ` ${color}| Details: ${JSON.stringify(entry.details)}${reset}`
    }

    if (entry.error) {
      output += ` ${color}| Error: ${entry.error.message}${reset}`
    }

    console.log(output)

    if (entry.error && entry.error.stack) {
      console.log(`${color}Stack: ${entry.error.stack}${reset}`)
    }
  }

  /**
   * 파일 출력
   */
  private writeToFile(logMessage: string): void {
    try {
      // 파일 크기 체크 및 로테이션
      this.checkFileRotation()

      fs.appendFileSync(this.logFile, logMessage, 'utf8')
      this.currentFileSize += Buffer.byteLength(logMessage, 'utf8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  /**
   * 파일 로테이션 체크
   */
  private checkFileRotation(): void {
    const maxSizeBytes = this.config.maxFileSize * 1024 * 1024 // MB to bytes

    if (this.currentFileSize >= maxSizeBytes) {
      this.rotateLogFile()
    }
  }

  /**
   * 로그 파일 로테이션
   */
  private rotateLogFile(): void {
    try {
      // 기존 로그 파일들을 확인하고 오래된 것들 삭제
      const files = fs
        .readdirSync(this.config.logDir)
        .filter((file) => file.startsWith('app-') && file.endsWith('.log'))
        .sort()
        .reverse()

      // 최대 파일 수를 초과하는 오래된 파일들 삭제
      while (files.length >= this.config.maxFiles) {
        const oldFile = files.pop()
        if (oldFile) {
          fs.unlinkSync(path.join(this.config.logDir, oldFile))
        }
      }

      // 새 로그 파일 생성
      this.logFile = path.join(this.config.logDir, `app-${this.getDateString()}.log`)
      this.currentFileSize = 0
    } catch (error) {
      console.error('Failed to rotate log file:', error)
    }
  }

  /**
   * 로그 디렉토리 생성
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true })
      }
    } catch (error) {
      console.error('Failed to create log directory:', error)
    }
  }

  /**
   * 날짜 문자열 생성
   */
  private getDateString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0] // YYYY-MM-DD
  }

  /**
   * 로그 레벨 설정 변경
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level
    this.info('LOGGER', `Log level changed to ${LogLevel[level]}`)
  }

  /**
   * 로그 파일 경로 반환
   */
  getLogFilePath(): string {
    return this.logFile
  }

  /**
   * 로그 통계 정보 반환
   */
  getLogStats(): { currentFileSize: number; logFile: string } {
    return {
      currentFileSize: this.currentFileSize,
      logFile: this.logFile
    }
  }
}
