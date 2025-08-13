// core/test/performance-test.ts
import { Logger } from '../logging/Logger'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'
import { SystemMonitor, SystemMonitorConfig } from '../monitoring/SystemMonitor'
import { LogLevel } from '../logging/Logger'

export class PerformanceTest {
  private logger: Logger
  private performanceMonitor: PerformanceMonitor
  private systemMonitor: SystemMonitor

  constructor() {
    // 로거 초기화
    this.logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: true,
      logDir: './logs',
      maxFileSize: 10,
      maxFiles: 5
    })

    // 성능 모니터 초기화
    this.performanceMonitor = new PerformanceMonitor(this.logger)

    // 시스템 모니터 초기화
    const monitorConfig: SystemMonitorConfig = {
      logConfig: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: true,
        logDir: './logs',
        maxFileSize: 10,
        maxFiles: 5
      },
      enablePerformanceMonitoring: true,
      enableErrorHandling: true,
      enableSystemMetrics: true,
      cleanupInterval: 60000 // 1분
    }

    this.systemMonitor = new SystemMonitor(monitorConfig)
  }

  /**
   * 모든 성능 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting performance monitoring tests...')

    try {
      await this.testBasicPerformanceMonitoring()
      await this.testSystemMetrics()
      await this.testPerformanceWarnings()
      await this.testPerformanceReport()
      await this.testSystemHealth()
      await this.testConcurrentOperations()

      console.log('✅ All performance tests completed successfully!')
    } catch (error) {
      console.error('❌ Performance tests failed:', error)
    } finally {
      this.cleanup()
    }
  }

  /**
   * 기본 성능 모니터링 테스트
   */
  private async testBasicPerformanceMonitoring(): Promise<void> {
    console.log('📊 Testing basic performance monitoring...')

    // 동기 작업 테스트
    const syncResult = this.performanceMonitor.measureSync('sync_test', () => {
      let sum = 0
      for (let i = 0; i < 1000000; i++) {
        sum += i
      }
      return sum
    })

    console.log(`Sync test result: ${syncResult}`)

    // 비동기 작업 테스트
    const asyncResult = await this.performanceMonitor.measureAsync('async_test', async () => {
      await this.delay(100)
      return 'async_completed'
    })

    console.log(`Async test result: ${asyncResult}`)

    // 실패하는 작업 테스트
    try {
      await this.performanceMonitor.measureAsync('failing_test', async () => {
        throw new Error('Intentional error for testing')
      })
    } catch (error) {
      console.log('Expected error caught:', error.message)
    }
  }

  /**
   * 시스템 메트릭 테스트
   */
  private async testSystemMetrics(): Promise<void> {
    console.log('💻 Testing system metrics...')

    const metrics = this.performanceMonitor.getSystemMetrics()
    console.log('System metrics:', {
      uptime: `${metrics.uptime.toFixed(2)}s`,
      memoryUsage: {
        heapUsed: `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
      },
      activeConnections: metrics.activeConnections
    })
  }

  /**
   * 성능 경고 테스트
   */
  private async testPerformanceWarnings(): Promise<void> {
    console.log('⚠️ Testing performance warnings...')

    // 느린 작업 시뮬레이션
    await this.performanceMonitor.measureAsync('slow_operation', async () => {
      await this.delay(6000) // 6초 (5초 초과)
    })

    // 실패하는 작업 시뮬레이션
    for (let i = 0; i < 5; i++) {
      try {
        await this.performanceMonitor.measureAsync('failing_operation', async () => {
          if (Math.random() > 0.5) {
            throw new Error('Random failure')
          }
          await this.delay(100)
        })
      } catch (error) {
        // 예상된 실패
      }
    }

    // 경고 체크
    this.performanceMonitor.checkPerformanceWarnings()
    this.performanceMonitor.checkMemoryWarnings()
  }

  /**
   * 성능 리포트 테스트
   */
  private async testPerformanceReport(): Promise<void> {
    console.log('📈 Testing performance report...')

    const report = this.performanceMonitor.generatePerformanceReport()
    console.log('Performance report:', {
      summary: {
        totalOperations: report.summary.totalOperations,
        averageResponseTime: `${report.summary.averageResponseTime.toFixed(2)}ms`,
        successRate: `${report.summary.successRate.toFixed(2)}%`
      },
      topSlowOperations: report.topSlowOperations.slice(0, 3),
      topFailedOperations: report.topFailedOperations.slice(0, 3),
      systemHealth: {
        memoryUsage: `${report.systemHealth.memoryUsage.toFixed(2)}%`,
        uptime: `${report.systemHealth.uptime.toFixed(2)}s`
      }
    })
  }

  /**
   * 시스템 헬스 테스트
   */
  private async testSystemHealth(): Promise<void> {
    console.log('🏥 Testing system health...')

    const health = this.systemMonitor.getSystemHealth()
    console.log('System health:', {
      status: health.status,
      memoryUsage: `${health.memoryUsage.usagePercent.toFixed(2)}%`,
      performance: {
        averageResponseTime: `${health.performance.averageResponseTime.toFixed(2)}ms`,
        successRate: `${health.performance.successRate.toFixed(2)}%`
      },
      errors: health.errors,
      warnings: health.warnings
    })
  }

  /**
   * 동시 작업 테스트
   */
  private async testConcurrentOperations(): Promise<void> {
    console.log('🔄 Testing concurrent operations...')

    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(
        this.performanceMonitor.measureAsync(`concurrent_operation_${i}`, async () => {
          await this.delay(Math.random() * 1000)
          return `completed_${i}`
        })
      )
    }

    const results = await Promise.all(promises)
    console.log(`Completed ${results.length} concurrent operations`)
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 정리 작업
   */
  private cleanup(): void {
    this.performanceMonitor.dispose()
    this.systemMonitor.shutdown()
  }
}

// 직접 실행
if (require.main === module) {
  const test = new PerformanceTest()
  test.runAllTests().catch(console.error)
}

export const runPerformanceTests = async (): Promise<void> => {
  const test = new PerformanceTest()
  await test.runAllTests()
}
