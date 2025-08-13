// services/MCP/MCPHealthChecker.ts
import { Logger } from '../../core/logging/Logger'
import { MCPConnection, MCPMessage } from './MCPConnection'

export interface MCPHealthStatus {
  isHealthy: boolean
  responseTime: number
  lastCheck: Date
  error?: string
  toolsCount: number
  serverInfo?: {
    name: string
    version: string
    capabilities: Record<string, unknown>
  }
}

export interface MCPHealthCheckConfig {
  checkInterval: number // ms
  timeout: number // ms
  maxRetries: number
}

export class MCPHealthChecker {
  private logger: Logger
  private config: MCPHealthCheckConfig
  private healthStatus: Map<string, MCPHealthStatus> = new Map()
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(logger: Logger, config: MCPHealthCheckConfig) {
    this.logger = logger
    this.config = config
  }

  async checkHealth(serverName: string, connection: MCPConnection): Promise<MCPHealthStatus> {
    const startTime = Date.now()

    try {
      // 연결 상태 확인
      if (!connection.isConnectionActive()) {
        const status: MCPHealthStatus = {
          isHealthy: false,
          responseTime: 0,
          lastCheck: new Date(),
          error: 'Connection not active',
          toolsCount: 0
        }
        this.healthStatus.set(serverName, status)
        return status
      }

      // ping 메시지 전송
      const pingMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'ping',
        params: {}
      }

      await connection.send(pingMessage)

      // 도구 목록 요청
      const toolsMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: Date.now() + 1,
        method: 'tools/list',
        params: {}
      }

      await connection.send(toolsMessage)

      const responseTime = Date.now() - startTime

      const status: MCPHealthStatus = {
        isHealthy: true,
        responseTime,
        lastCheck: new Date(),
        toolsCount: 0 // 실제로는 응답에서 도구 수를 파싱해야 함
      }

      this.healthStatus.set(serverName, status)
      this.logger.debug('MCP', 'Health check passed', {
        serverName,
        responseTime,
        toolsCount: status.toolsCount
      })

      return status
    } catch (error) {
      const responseTime = Date.now() - startTime
      const status: MCPHealthStatus = {
        isHealthy: false,
        responseTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
        toolsCount: 0
      }

      this.healthStatus.set(serverName, status)
      this.logger.warn('MCP', 'Health check failed', {
        serverName,
        error: status.error,
        responseTime
      })

      return status
    }
  }

  startPeriodicHealthCheck(serverName: string, connection: MCPConnection): void {
    // 기존 체크 중지
    this.stopPeriodicHealthCheck(serverName)

    const interval = setInterval(async () => {
      await this.checkHealth(serverName, connection)
    }, this.config.checkInterval)

    this.checkIntervals.set(serverName, interval)
    this.logger.info('MCP', 'Started periodic health check', { serverName })
  }

  stopPeriodicHealthCheck(serverName: string): void {
    const interval = this.checkIntervals.get(serverName)
    if (interval) {
      clearInterval(interval)
      this.checkIntervals.delete(serverName)
      this.logger.info('MCP', 'Stopped periodic health check', { serverName })
    }
  }

  getHealthStatus(serverName: string): MCPHealthStatus | undefined {
    return this.healthStatus.get(serverName)
  }

  getAllHealthStatuses(): Record<string, MCPHealthStatus> {
    const result: Record<string, MCPHealthStatus> = {}
    for (const [serverName, status] of Array.from(this.healthStatus.entries())) {
      result[serverName] = status
    }
    return result
  }

  isServerHealthy(serverName: string): boolean {
    const status = this.healthStatus.get(serverName)
    return status?.isHealthy ?? false
  }

  getAverageResponseTime(serverName: string): number {
    const status = this.healthStatus.get(serverName)
    return status?.responseTime ?? 0
  }

  // 모든 서버의 전체 헬스 상태 요약
  getOverallHealthSummary(): {
    totalServers: number
    healthyServers: number
    averageResponseTime: number
    unhealthyServers: string[]
  } {
    const servers = Array.from(this.healthStatus.keys())
    const healthyServers = servers.filter((server) => this.isServerHealthy(server))
    const unhealthyServers = servers.filter((server) => !this.isServerHealthy(server))

    const totalResponseTime = servers.reduce((sum, server) => {
      return sum + this.getAverageResponseTime(server)
    }, 0)

    return {
      totalServers: servers.length,
      healthyServers: healthyServers.length,
      averageResponseTime: servers.length > 0 ? totalResponseTime / servers.length : 0,
      unhealthyServers
    }
  }

  // 헬스 체커 정리
  dispose(): void {
    for (const [serverName] of Array.from(this.checkIntervals.entries())) {
      this.stopPeriodicHealthCheck(serverName)
    }
    this.healthStatus.clear()
    this.logger.info('MCP', 'Health checker disposed')
  }
}
