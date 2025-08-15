// services/MCP/MCPWebSocketConnection.ts
import WebSocket from 'ws'
import { MCPConnection, MCPConnectionConfig, MCPMessage } from './MCPConnection'
import { Logger } from '../../core/logging/Logger'

export class MCPWebSocketConnection extends MCPConnection {
  private ws: WebSocket | null = null
  private messageCallback: ((message: MCPMessage) => void) | null = null
  private pendingMessages: Map<
    number,
    { resolve: (value: MCPMessage) => void; reject: (error: Error) => void }
  > = new Map()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000

  constructor(config: MCPConnectionConfig, logger: Logger) {
    super(config, logger)
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.host || !this.config.port) {
        throw new Error('WebSocket connection requires host and port to be specified')
      }

      const url = `ws://${this.config.host}:${this.config.port}${this.config.path || ''}`
      
      this.logger.info('MCP', 'Starting WebSocket connection', {
        url,
        host: this.config.host,
        port: this.config.port,
        path: this.config.path
      })

      // WebSocket 연결 생성
      this.ws = new WebSocket(url)

      // 연결 이벤트 처리
      this.ws?.on('open', () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.logger.info('MCP', 'WebSocket connection opened')
        
        // 초기화 메시지 전송
        this.sendInitializeMessage().catch(error => {
          this.logger.error('MCP', 'Failed to send initialize message', error as Error)
        })
      })

      // 메시지 수신 처리
      this.ws?.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as MCPMessage
          this.logMessage('receive', message)
          this.handleIncomingMessage(message)
        } catch (error) {
          this.logger.error('MCP', 'Failed to parse WebSocket message', error as Error, {
            data: data.toString()
          })
        }
      })

      // 에러 처리
      this.ws?.on('error', (error) => {
        this.isConnected = false
        this.handleError(error, 'WebSocket error')
      })

      // 연결 종료 처리
      this.ws?.on('close', (code, reason) => {
        this.isConnected = false
        this.logger.info('MCP', 'WebSocket connection closed', { code, reason: reason.toString() })
        
        // 대기 중인 메시지들 거부
        for (const [_id, { reject }] of Array.from(this.pendingMessages.entries())) {
          reject(new Error(`Connection closed with code ${code}: ${reason}`))
        }
        this.pendingMessages.clear()

        // 자동 재연결 시도
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      })

      // 연결 타임아웃 설정
      if (this.config.timeout) {
        setTimeout(() => {
          if (!this.isConnected) {
            this.logger.error('MCP', 'WebSocket connection timeout')
            this.ws?.terminate()
          }
        }, this.config.timeout)
      }

    } catch (error) {
      this.handleError(error as Error, 'WebSocket connection')
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.ws) {
        this.ws.close(1000, 'Client disconnect')
        this.ws = null
      }
      this.isConnected = false
      this.logger.info('MCP', 'WebSocket connection disconnected')
    } catch (error) {
      this.handleError(error as Error, 'WebSocket disconnection')
    }
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket connection not established')
    }

    try {
      const messageStr = JSON.stringify(message)
      this.ws.send(messageStr)
      this.logMessage('send', message)
    } catch (error) {
      this.handleError(error as Error, 'WebSocket send')
      throw error
    }
  }

  onMessage(callback: (message: MCPMessage) => void): void {
    this.messageCallback = callback
  }

  // 특정 ID의 응답을 기다리는 메서드
  async waitForResponse(id: number, timeout: number = 30000): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingMessages.delete(id)
        reject(new Error(`Timeout waiting for response with id ${id}`))
      }, timeout)

      this.pendingMessages.set(id, {
        resolve: (message) => {
          clearTimeout(timer)
          this.pendingMessages.delete(id)
          resolve(message)
        },
        reject: (error) => {
          clearTimeout(timer)
          this.pendingMessages.delete(id)
          reject(error)
        }
      })
    })
  }

  // 자동 재연결 스케줄링
  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1) // 지수 백오프
    
    this.logger.info('MCP', 'Scheduling WebSocket reconnection', {
      attempt: this.reconnectAttempts,
      delay
    })

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        this.logger.error('MCP', 'WebSocket reconnection failed', error as Error)
      }
    }, delay)
  }

  private async sendInitializeMessage(): Promise<void> {
    const initMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateMessageId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'update-chat',
          version: '1.0.0'
        }
      }
    }

    await this.send(initMessage)
  }

  private handleIncomingMessage(message: MCPMessage): void {
    // 대기 중인 응답인지 확인
    if (typeof message.id === 'number' && this.pendingMessages.has(message.id)) {
      const { resolve } = this.pendingMessages.get(message.id)!
      resolve(message)
      return
    }

    // 콜백으로 전달
    if (this.messageCallback) {
      this.messageCallback(message)
    }
  }

  // 연결 상태 상세 정보
  getConnectionInfo(): {
    isConnected: boolean
    reconnectAttempts: number
    maxReconnectAttempts: number
    url?: string
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      url: this.ws ? `ws://${this.config.host}:${this.config.port}${this.config.path || ''}` : undefined
    }
  }
}
