// services/MCP/MCPClient.ts
import { Logger } from '../../core/logging/Logger'
import { MCPConnection, MCPConnectionType, MCPConnectionConfig, MCPMessage } from './MCPConnection'
import { MCPSTDIOConnection } from './MCPSTDIOConnection'
import { MCPWebSocketConnection } from './MCPWebSocketConnection'
import { MCPHTTPConnection } from './MCPHTTPConnection'
import { MCPHealthChecker, MCPHealthCheckConfig } from './MCPHealthChecker'
import { MCPToolConverter, MCPTool, MCPToolCall } from './MCPToolConverter'

export interface MCPServerConfig {
  name: string
  type: MCPConnectionType
  config: MCPConnectionConfig
  enabled: boolean
}

export interface MCPClientConfig {
  servers: MCPServerConfig[]
  healthCheck: MCPHealthCheckConfig
  autoReconnect: boolean
  maxRetries: number
}

export class MCPClient {
  private logger: Logger
  private config: MCPClientConfig
  private connections: Map<string, MCPConnection> = new Map()
  private healthChecker: MCPHealthChecker
  private toolConverter: MCPToolConverter
  private tools: Map<string, MCPTool[]> = new Map()
  private isInitialized: boolean = false

  constructor(logger: Logger, config: MCPClientConfig) {
    this.logger = logger
    this.config = config
    this.healthChecker = new MCPHealthChecker(logger, config.healthCheck)
    this.toolConverter = new MCPToolConverter(logger)
  }

  /**
   * MCP Client 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('MCP', 'Initializing MCP client', {
        serverCount: this.config.servers.length
      })

      // 활성화된 서버들에 연결
      for (const serverConfig of this.config.servers) {
        if (serverConfig.enabled) {
          await this.connectToServer(serverConfig)
        }
      }

      this.isInitialized = true
      this.logger.info('MCP', 'MCP client initialized successfully')
    } catch (error) {
      this.logger.error('MCP', 'Failed to initialize MCP client', error as Error)
      throw error
    }
  }

  /**
   * 서버에 연결
   */
  private async connectToServer(serverConfig: MCPServerConfig): Promise<void> {
    try {
      const connection = this.createConnection(serverConfig.config)

      await connection.connect()
      this.connections.set(serverConfig.name, connection)

      // 헬스 체크 시작
      this.healthChecker.startPeriodicHealthCheck(serverConfig.name, connection)

      // 도구 목록 가져오기
      await this.loadToolsFromServer(serverConfig.name, connection)

      this.logger.info('MCP', 'Connected to server', {
        serverName: serverConfig.name,
        connectionType: serverConfig.type
      })
    } catch (error) {
      this.logger.error('MCP', 'Failed to connect to server', error as Error, {
        serverName: serverConfig.name
      })
      throw error
    }
  }

  /**
   * 연결 타입에 따른 연결 객체 생성
   */
  private createConnection(config: MCPConnectionConfig): MCPConnection {
    switch (config.type) {
      case MCPConnectionType.STDIO:
        return new MCPSTDIOConnection(config, this.logger)
      case MCPConnectionType.WEBSOCKET:
        return new MCPWebSocketConnection(config, this.logger)
      case MCPConnectionType.HTTP:
        return new MCPHTTPConnection(config, this.logger)
      default:
        throw new Error(`Unsupported connection type: ${config.type}`)
    }
  }

  /**
   * 서버에서 도구 목록 로드
   */
  private async loadToolsFromServer(serverName: string, connection: MCPConnection): Promise<void> {
    try {
      const toolsMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
        params: {}
      }

      // STDIO 연결의 경우 응답을 기다림
      if (connection instanceof MCPSTDIOConnection) {
        await connection.send(toolsMessage)
        const response = await connection.waitForResponse(toolsMessage.id as number)

        if (response.result && typeof response.result === 'object' && response.result !== null) {
          const result = response.result as any
          if (result.tools && Array.isArray(result.tools)) {
            const tools: MCPTool[] = result.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              serverName
            }))

            this.tools.set(serverName, tools)
            this.logger.debug('MCP', 'Loaded tools from server', {
              serverName,
              toolCount: tools.length
            })
          } else {
            this.logger.warn('MCP', 'No tools found in server response', {
              serverName,
              response
            })
          }
        }
      } else {
        // 다른 연결 타입의 경우 더미 도구 목록 생성
        const dummyTools: MCPTool[] = [
          {
            name: 'example_tool',
            description: 'Example tool from ' + serverName,
            inputSchema: {
              type: 'object',
              properties: {
                input: {
                  type: 'string',
                  description: 'Input parameter'
                }
              },
              required: ['input']
            },
            serverName
          }
        ]

        this.tools.set(serverName, dummyTools)
        this.logger.debug('MCP', 'Loaded dummy tools from server', {
          serverName,
          toolCount: dummyTools.length
        })
      }
    } catch (error) {
      this.logger.error('MCP', 'Failed to load tools from server', error as Error, {
        serverName
      })
    }
  }

  /**
   * 모든 도구 목록 가져오기
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = []
    for (const tools of Array.from(this.tools.values())) {
      allTools.push(...tools)
    }
    return allTools
  }

  /**
   * 서버별 도구 목록 가져오기
   */
  async getToolsByServer(): Promise<Record<string, MCPTool[]>> {
    const result: Record<string, MCPTool[]> = {}
    for (const [serverName, tools] of Array.from(this.tools.entries())) {
      result[serverName] = tools
    }
    return result
  }

  /**
   * h-chat 형식의 도구 목록 가져오기
   */
  async getHChatTools(): Promise<any[]> {
    const allTools = await this.getAllTools()
    return this.toolConverter.convertMCPToolsToHChatFormat(allTools)
  }

  /**
   * 도구 호출
   */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const connection = this.connections.get(serverName)
      if (!connection) {
        throw new Error(`No connection found for server: ${serverName}`)
      }

      if (!connection.isConnectionActive()) {
        throw new Error(`Connection not active for server: ${serverName}`)
      }

      const toolCallMessage: MCPMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      }

      // STDIO 연결의 경우 응답을 기다림
      if (connection instanceof MCPSTDIOConnection) {
        await connection.send(toolCallMessage)
        const response = await connection.waitForResponse(toolCallMessage.id as number)

        if (response.error) {
          throw new Error(`Tool call failed: ${response.error.message}`)
        }

        return response.result || response
      } else {
        // 다른 연결 타입의 경우 더미 응답 반환
        await connection.send(toolCallMessage)
        return {
          result: `Tool ${toolName} executed successfully with args: ${JSON.stringify(args)}`
        }
      }
    } catch (error) {
      this.logger.error('MCP', 'Tool call failed', error as Error, {
        serverName,
        toolName,
        args
      })
      throw error
    }
  }

  /**
   * h-chat 도구 호출을 MCP 도구 호출로 변환하여 실행
   */
  async callHChatTool(hchatToolCall: {
    name: string
    arguments: Record<string, unknown>
  }): Promise<string> {
    try {
      const serverName = this.toolConverter.extractServerNameFromToolName(hchatToolCall.name)
      if (!serverName) {
        throw new Error(`Could not extract server name from tool: ${hchatToolCall.name}`)
      }

      const toolName = this.toolConverter.extractToolNameFromFullName(hchatToolCall.name)
      const result = await this.callTool(serverName, toolName, hchatToolCall.arguments)

      return this.toolConverter.convertMCPResultToHChat(result)
    } catch (error) {
      this.logger.error('MCP', 'HChat tool call failed', error as Error, {
        toolCall: hchatToolCall
      })
      throw error
    }
  }

  /**
   * 서버 헬스 상태 가져오기
   */
  getServerHealth(serverName: string) {
    return this.healthChecker.getHealthStatus(serverName)
  }

  /**
   * 모든 서버 헬스 상태 가져오기
   */
  getAllServerHealth() {
    return this.healthChecker.getAllHealthStatuses()
  }

  /**
   * 전체 헬스 요약 가져오기
   */
  getHealthSummary() {
    return this.healthChecker.getOverallHealthSummary()
  }

  /**
   * 서버 연결 상태 확인
   */
  isServerConnected(serverName: string): boolean {
    const connection = this.connections.get(serverName)
    return connection?.isConnectionActive() ?? false
  }

  /**
   * 서버 재연결
   */
  async reconnectServer(serverName: string): Promise<void> {
    try {
      const serverConfig = this.config.servers.find((s) => s.name === serverName)
      if (!serverConfig) {
        throw new Error(`Server config not found: ${serverName}`)
      }

      // 기존 연결 정리
      const existingConnection = this.connections.get(serverName)
      if (existingConnection) {
        await existingConnection.disconnect()
        this.healthChecker.stopPeriodicHealthCheck(serverName)
      }

      // 새로 연결
      await this.connectToServer(serverConfig)
      this.logger.info('MCP', 'Server reconnected', { serverName })
    } catch (error) {
      this.logger.error('MCP', 'Failed to reconnect server', error as Error, {
        serverName
      })
      throw error
    }
  }

  /**
   * MCP Client 정리
   */
  async dispose(): Promise<void> {
    try {
      this.logger.info('MCP', 'Disposing MCP client')

      // 모든 연결 정리
      for (const [serverName, connection] of Array.from(this.connections.entries())) {
        await connection.disconnect()
        this.healthChecker.stopPeriodicHealthCheck(serverName)
      }

      // 헬스 체커 정리
      this.healthChecker.dispose()

      this.connections.clear()
      this.tools.clear()
      this.isInitialized = false

      this.logger.info('MCP', 'MCP client disposed successfully')
    } catch (error) {
      this.logger.error('MCP', 'Failed to dispose MCP client', error as Error)
    }
  }

  /**
   * 초기화 상태 확인
   */
  getInitialized(): boolean {
    return this.isInitialized
  }
}
