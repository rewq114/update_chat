// core/monitoring/PerformanceMonitor.ts
import { Logger } from '../logging/Logger'

export interface PerformanceMetric {
  operation: string
  startTime: number
  endTime: number
  duration: number
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
}

export interface PerformanceStats {
  operation: string
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
}

export interface SystemMetrics {
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpuUsage: {
    user: number
    system: number
  }
  uptime: number
  activeConnections: number
}

export class PerformanceMonitor {
  private logger: Logger
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private operationTimers: Map<string, number> = new Map()
  private systemMetricsInterval?: NodeJS.Timeout

  constructor(logger: Logger) {
    this.logger = logger
    this.startSystemMetricsCollection()
  }

  /**
   * 작업 시작 시간 기록
   */
  startOperation(operation: string): string {
    const startTime = Date.now()
    this.operationTimers.set(operation, startTime)
    return operation
  }

  /**
   * 작업 완료 및 성능 측정
   */
  endOperation(
    operation: string,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, unknown>
  ): PerformanceMetric | null {
    const startTime = this.operationTimers.get(operation)
    if (!startTime) {
      this.logger.warn('PERFORMANCE', `No start time found for operation: ${operation}`)
      return null
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    const metric: PerformanceMetric = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      error,
      metadata
    }

    // 메트릭 저장
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    this.metrics.get(operation)!.push(metric)

    // 타이머 제거
    this.operationTimers.delete(operation)

    // 성능 로그 기록
    this.logMetric(metric)

    return metric
  }

  /**
   * 비동기 작업 래퍼
   */
  async measureAsync<T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.startOperation(operation)

    try {
      const result = await asyncFn()
      this.endOperation(operation, true, undefined, metadata)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.endOperation(operation, false, errorMessage, metadata)
      throw error
    }
  }

  /**
   * 동기 작업 래퍼
   */
  measureSync<T>(operation: string, syncFn: () => T, metadata?: Record<string, unknown>): T {
    this.startOperation(operation)

    try {
      const result = syncFn()
      this.endOperation(operation, true, undefined, metadata)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.endOperation(operation, false, errorMessage, metadata)
      throw error
    }
  }

  /**
   * 성능 메트릭 로깅
   */
  private logMetric(metric: PerformanceMetric): void {
    const details: Record<string, unknown> = {
      duration: metric.duration,
      success: metric.success,
      timestamp: metric.startTime,
      metadata: metric.metadata
    }

    if (metric.error) {
      details.error = metric.error
    }

    this.logger.debug('PERFORMANCE', `${metric.operation} took ${metric.duration}ms`, details)
  }

  /**
   * 시스템 메트릭 수집 시작
   */
  private startSystemMetricsCollection(): void {
    this.systemMetricsInterval = setInterval(() => {
      const metrics = this.collectSystemMetrics()
      this.logger.debug('SYSTEM_METRICS', 'System metrics collected', {
        uptime: metrics.uptime,
        memoryUsage: {
          heapUsedMB: (metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
          heapTotalMB: (metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)
        },
        activeConnections: metrics.activeConnections
      })
    }, 30000) // 30초마다 수집
  }

  /**
   * 시스템 메트릭 수집 중지
   */
  stopSystemMetricsCollection(): void {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval)
      this.systemMetricsInterval = undefined
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  private collectSystemMetrics(): SystemMetrics {
    const usage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const metrics: SystemMetrics = {
      uptime: process.uptime(),
      memoryUsage: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      activeConnections: this.getActiveOperationCount()
    }

    return metrics
  }

  /**
   * 특정 작업의 성능 통계 조회
   */
  getOperationStats(operation: string): PerformanceStats | null {
    const metrics = this.metrics.get(operation)
    if (!metrics || metrics.length === 0) {
      return null
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b)
    const successfulCalls = metrics.filter((m) => m.success).length
    const failedCalls = metrics.length - successfulCalls

    return {
      operation,
      totalCalls: metrics.length,
      successfulCalls,
      failedCalls,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.getPercentile(durations, 50),
      p95Duration: this.getPercentile(durations, 95),
      p99Duration: this.getPercentile(durations, 99)
    }
  }

  /**
   * 모든 작업의 성능 통계 조회
   */
  getAllOperationStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {}

    for (const operation of Array.from(this.metrics.keys())) {
      const operationStats = this.getOperationStats(operation)
      if (operationStats) {
        stats[operation] = operationStats
      }
    }

    return stats
  }

  /**
   * 백분위수 계산
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * 성능 경고 체크
   */
  checkPerformanceWarnings(): void {
    const stats = this.getAllOperationStats()

    for (const [operation, stat] of Object.entries(stats)) {
      // 평균 응답 시간이 5초를 초과하는 경우
      if (stat.averageDuration > 5000) {
        this.logger.warn('PERFORMANCE', `Slow operation detected: ${operation}`, {
          averageDuration: stat.averageDuration,
          totalCalls: stat.totalCalls
        })
      }

      // 실패율이 10%를 초과하는 경우
      const failureRate = (stat.failedCalls / stat.totalCalls) * 100
      if (failureRate > 10) {
        this.logger.warn('PERFORMANCE', `High failure rate detected: ${operation}`, {
          failureRate: `${failureRate.toFixed(2)}%`,
          failedCalls: stat.failedCalls,
          totalCalls: stat.totalCalls
        })
      }

      // P95 응답 시간이 10초를 초과하는 경우
      if (stat.p95Duration > 10000) {
        this.logger.warn('PERFORMANCE', `High P95 latency detected: ${operation}`, {
          p95Duration: stat.p95Duration,
          totalCalls: stat.totalCalls
        })
      }
    }
  }

  /**
   * 메모리 사용량 경고 체크
   */
  checkMemoryWarnings(): void {
    const metrics = this.getSystemMetrics()
    const heapUsedMB = metrics.memoryUsage.heapUsed / 1024 / 1024
    const heapTotalMB = metrics.memoryUsage.heapTotal / 1024 / 1024
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100

    if (memoryUsagePercent > 80) {
      this.logger.warn('PERFORMANCE', 'High memory usage detected', {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        usagePercent: memoryUsagePercent.toFixed(2)
      })
    }

    if (memoryUsagePercent > 95) {
      this.logger.error('PERFORMANCE', 'Critical memory usage detected', undefined, {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        usagePercent: memoryUsagePercent.toFixed(2)
      })
    }
  }

  /**
   * 오래된 메트릭 정리
   */
  cleanupOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    // 기본 24시간
    const cutoff = Date.now() - maxAge
    let cleanedCount = 0

    for (const [operation, metrics] of Array.from(this.metrics.entries())) {
      const filteredMetrics = metrics.filter((m) => m.startTime > cutoff)
      const removedCount = metrics.length - filteredMetrics.length

      if (removedCount > 0) {
        this.metrics.set(operation, filteredMetrics)
        cleanedCount += removedCount
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('PERFORMANCE', 'Old metrics cleaned up', {
        cleanedCount,
        remainingMetrics: this.getTotalMetricsCount()
      })
    }
  }

  /**
   * 전체 메트릭 수 조회
   */
  getTotalMetricsCount(): number {
    let total = 0
    for (const metrics of Array.from(this.metrics.values())) {
      total += metrics.length
    }
    return total
  }

  /**
   * 활성 작업 수 조회
   */
  private getActiveOperationCount(): number {
    return this.operationTimers.size
  }

  /**
   * 성능 요약 리포트 생성
   */
  generatePerformanceReport(): {
    summary: {
      totalOperations: number
      totalMetrics: number
      averageResponseTime: number
      successRate: number
    }
    topSlowOperations: Array<{ operation: string; avgDuration: number }>
    topFailedOperations: Array<{ operation: string; failureRate: number }>
    systemHealth: {
      memoryUsage: number
      uptime: number
      activeConnections: number
    }
  } {
    const stats = this.getAllOperationStats()
    const systemMetrics = this.getSystemMetrics()

    // 전체 통계 계산
    let totalOperations = 0
    let totalCalls = 0
    let totalSuccessfulCalls = 0
    let totalDuration = 0

    for (const stat of Object.values(stats)) {
      totalOperations++
      totalCalls += stat.totalCalls
      totalSuccessfulCalls += stat.successfulCalls
      totalDuration += stat.averageDuration * stat.totalCalls
    }

    // 상위 느린 작업들
    const topSlowOperations = Object.entries(stats)
      .map(([operation, stat]) => ({ operation, avgDuration: stat.averageDuration }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)

    // 상위 실패 작업들
    const topFailedOperations = Object.entries(stats)
      .map(([operation, stat]) => ({
        operation,
        failureRate: (stat.failedCalls / stat.totalCalls) * 100
      }))
      .filter((item) => item.failureRate > 0)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5)

    return {
      summary: {
        totalOperations,
        totalMetrics: this.getTotalMetricsCount(),
        averageResponseTime: totalCalls > 0 ? totalDuration / totalCalls : 0,
        successRate: totalCalls > 0 ? (totalSuccessfulCalls / totalCalls) * 100 : 100
      },
      topSlowOperations,
      topFailedOperations,
      systemHealth: {
        memoryUsage:
          (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100,
        uptime: systemMetrics.uptime,
        activeConnections: systemMetrics.activeConnections
      }
    }
  }

  /**
   * 성능 모니터링 리소스 정리
   */
  dispose(): void {
    this.stopSystemMetricsCollection()
    this.metrics.clear()
    this.operationTimers.clear()
  }

  /**
   * 시스템 메트릭 조회
   */
  getSystemMetrics(): SystemMetrics {
    return this.collectSystemMetrics()
  }
}
