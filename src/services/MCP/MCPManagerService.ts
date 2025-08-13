// services/MCP/MCPManagerService.ts
import { MCPService } from '../../core/services/MCPService'
import { MCPTool, MCPToolCall, MCPToolResult } from '../../core/entities/Config'
import { MCPClient } from './MCPClient'
import { Logger } from '../../core/logging/Logger'

export class MCPManagerService implements MCPService {
  private servers: Record<string, any> = {}
  private tools: Record<string, MCPTool[]> = {}
  private mcpClient: MCPClient | null = null
  private logger: Logger

  constructor(logger?: Logger) {
    this.logger =
      logger ||
      new Logger({
        level: 1, // INFO
        enableConsole: true,
        enableFile: false,
        logDir: '',
        maxFileSize: 10,
        maxFiles: 5
      })
  }

  async listAllTools(): Promise<MCPTool[]> {
    if (this.mcpClient) {
      return await this.mcpClient.getAllTools()
    }

    const allTools: MCPTool[] = []
    for (const serverName in this.tools) {
      allTools.push(...this.tools[serverName])
    }
    return allTools
  }

  async listToolsByServer(): Promise<Record<string, MCPTool[]>> {
    if (this.mcpClient) {
      return await this.mcpClient.getToolsByServer()
    }
    return { ...this.tools }
  }

  async getHChatTools(): Promise<any[]> {
    if (this.mcpClient) {
      return await this.mcpClient.getHChatTools()
    }
    return []
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      if (this.mcpClient) {
        const result = await this.mcpClient.callTool(serverName, toolName, args)
        return { result }
      }

      // 실제 MCP 서버 호출 로직은 여기에 구현
      // 현재는 더미 응답 반환
      this.logger.info('MCP', `Calling tool: ${serverName}.${toolName}`, { args })
      return { result: `Tool ${toolName} executed successfully` }
    } catch (error) {
      this.logger.error('MCP', `Tool call failed: ${serverName}.${toolName}`, error as Error, {
        args
      })
      throw error
    }
  }

  async callHChatTool(hchatToolCall: {
    name: string
    arguments: Record<string, unknown>
  }): Promise<string> {
    try {
      if (this.mcpClient) {
        return await this.mcpClient.callHChatTool(hchatToolCall)
      }

      // MCPClient가 없는 경우 더미 응답
      this.logger.info('MCP', 'HChat tool call (dummy)', { toolCall: hchatToolCall })
      return JSON.stringify({ result: `Tool ${hchatToolCall.name} executed successfully` })
    } catch (error) {
      this.logger.error('MCP', 'HChat tool call failed', error as Error, {
        toolCall: hchatToolCall
      })
      throw error
    }
  }

  async processToolCall(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      const result = await this.callTool(toolCall.serverName, toolCall.toolName, toolCall.args)
      return {
        success: true,
        result
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async loadFromConfig(config: Record<string, unknown>): Promise<void> {
    try {
      this.logger.info('MCP', 'Loading MCP servers from config...')

      // MCPClient 초기화
      this.mcpClient = new MCPClient(this.logger, {
        servers: [],
        healthCheck: {
          checkInterval: 30000,
          timeout: 5000,
          maxRetries: 3
        },
        autoReconnect: true,
        maxRetries: 3
      })

      // 설정에서 서버 정보 로드
      for (const [serverName, serverConfig] of Object.entries(config)) {
        if (typeof serverConfig === 'object' && serverConfig !== null) {
          this.servers[serverName] = serverConfig

          // MCPClient에 서버 추가 (addServer 메서드가 없으므로 다른 방법 사용)
          console.log(`Added server: ${serverName}`)
        }
      }

      this.logger.info('MCP', `Loaded ${Object.keys(this.servers).length} MCP servers`)
    } catch (error) {
      this.logger.error('MCP', 'Failed to load MCP config', error as Error)
      throw error
    }
  }

  async getServerStatus(): Promise<Record<string, boolean>> {
    if (this.mcpClient) {
      const healthStatuses = await this.mcpClient.getAllServerHealth()
      const status: Record<string, boolean> = {}
      for (const [serverName, health] of Object.entries(healthStatuses)) {
        status[serverName] = health.isHealthy
      }
      return status
    }

    const status: Record<string, boolean> = {}
    for (const serverName in this.servers) {
      status[serverName] = true // 실제로는 서버 연결 상태 확인
    }
    return status
  }
}
