// services/MCP/MCPConnection.ts
import { Logger } from '../../core/logging/Logger'

export enum MCPConnectionType {
  STDIO = 'stdio',
  WEBSOCKET = 'websocket',
  HTTP = 'http'
}

export interface MCPConnectionConfig {
  type: MCPConnectionType
  host?: string
  port?: number
  path?: string
  command?: string
  args?: string[]
  timeout?: number
}

export interface MCPMessage {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export abstract class MCPConnection {
  protected config: MCPConnectionConfig
  protected logger: Logger
  protected isConnected: boolean = false
  protected messageId: number = 1

  constructor(config: MCPConnectionConfig, logger: Logger) {
    this.config = config
    this.logger = logger
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract send(message: MCPMessage): Promise<void>
  abstract onMessage(callback: (message: MCPMessage) => void): void

  isConnectionActive(): boolean {
    return this.isConnected
  }

  protected generateMessageId(): number {
    return this.messageId++
  }

  protected logMessage(direction: 'send' | 'receive', message: MCPMessage): void {
    this.logger.debug('MCP', `${direction} message`, {
      id: message.id,
      method: message.method,
      hasParams: !!message.params,
      hasResult: !!message.result,
      hasError: !!message.error
    })
  }

  protected handleError(error: Error, context: string): void {
    this.logger.error('MCP', `${context} failed`, error, {
      connectionType: this.config.type,
      config: this.config
    })
  }
}
