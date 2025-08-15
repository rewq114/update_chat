// renderer/src/components/performance/PerformanceDashboard.tsx
import React, { useState, useEffect } from 'react'

interface PerformanceReport {
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
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    usagePercent: number
  }
  performance: {
    averageResponseTime: number
    successRate: number
    activeOperations: number
  }
  errors: {
    totalErrors: number
    unhandledErrors: number
    criticalErrors: number
  }
  warnings: string[]
}

interface ErrorStats {
  totalErrors: number
  errorsByCategory: Record<string, number>
  errorsBySeverity: Record<string, number>
  unhandledErrors: number
}

export const PerformanceDashboard: React.FC = () => {
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPerformanceData()
    const interval = setInterval(loadPerformanceData, 30000) // 30초마다 갱신
    return () => clearInterval(interval)
  }, [])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 성능 리포트 로드
      const reportResponse = await window.electron.ipcRenderer.invoke('get-performance-report')
      if (reportResponse.success) {
        setPerformanceReport(reportResponse.report)
      }

      // 시스템 헬스 로드
      const healthResponse = await window.electron.ipcRenderer.invoke('get-system-health')
      if (healthResponse.success) {
        setSystemHealth(healthResponse.health)
      }

      // 에러 통계 로드
      const errorResponse = await window.electron.ipcRenderer.invoke('get-error-stats')
      if (errorResponse.success) {
        setErrorStats(errorResponse.errorStats)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'critical':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // const formatBytes = (bytes: number) => {
  //   const mb = bytes / 1024 / 1024
  //   return `${mb.toFixed(2)} MB`
  // }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 시스템 헬스 */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">시스템 헬스</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStatusColor(systemHealth.status)}`}>
                {systemHealth.status.toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">상태</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatUptime(systemHealth.uptime)}
              </div>
              <div className="text-sm text-gray-600">업타임</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {systemHealth.memoryUsage.usagePercent.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">메모리 사용량</div>
            </div>
          </div>
        </div>
      )}

      {/* 성능 요약 */}
      {performanceReport && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">성능 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {performanceReport.summary.totalOperations}
              </div>
              <div className="text-sm text-gray-600">총 작업 수</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {performanceReport.summary.averageResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-600">평균 응답 시간</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {performanceReport.summary.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">성공률</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {performanceReport.systemHealth.activeConnections}
              </div>
              <div className="text-sm text-gray-600">활성 연결</div>
            </div>
          </div>
        </div>
      )}

      {/* 에러 통계 */}
      {errorStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">에러 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorStats.totalErrors}</div>
              <div className="text-sm text-gray-600">총 에러</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{errorStats.unhandledErrors}</div>
              <div className="text-sm text-gray-600">미처리 에러</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {errorStats.errorsBySeverity.critical || 0}
              </div>
              <div className="text-sm text-gray-600">치명적 에러</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(errorStats.errorsByCategory).length}
              </div>
              <div className="text-sm text-gray-600">에러 카테고리</div>
            </div>
          </div>
        </div>
      )}

      {/* 느린 작업 TOP 5 */}
      {performanceReport && performanceReport.topSlowOperations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">느린 작업 TOP 5</h2>
          <div className="space-y-2">
            {performanceReport.topSlowOperations.map((op, _index) => (
              <div
                key={op.operation}
                className="flex justify-between items-center p-2 bg-gray-50 rounded"
              >
                <span className="font-medium">{op.operation}</span>
                <span className="text-red-600 font-semibold">{op.avgDuration.toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실패 작업 TOP 5 */}
      {performanceReport && performanceReport.topFailedOperations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">실패 작업 TOP 5</h2>
          <div className="space-y-2">
            {performanceReport.topFailedOperations.map((op, _index) => (
              <div
                key={op.operation}
                className="flex justify-between items-center p-2 bg-gray-50 rounded"
              >
                <span className="font-medium">{op.operation}</span>
                <span className="text-red-600 font-semibold">{op.failureRate.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <div className="text-center">
        <button
          onClick={loadPerformanceData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  )
}
