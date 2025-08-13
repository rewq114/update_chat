// services/MCP/MCPHTTPConnection.ts
import * as http from 'http'
import * as https from 'https'
import { MCPConnection, MCPConnectionConfig, MCPMessage } from './MCPConnection'
import { Logger } from '../../core/logging/Logger'

export class MCPHTTPConnection extends MCPConnection {
  private baseUrl: string
  private headers: Record<string, string>
  private pendingMessages: Map<
    number,
    { resolve: (value: MCPMessage) => void; reject: (error: Error) => void }
  > = new Map()

  constructor(config: MCPConnectionConfig, logger: Logger) {
    super(config, logger)
    
    // HTTP URL 구성
    const protocol = config.port === 443 ? 'https' : 'http'
    this.baseUrl = `${protocol}://${config.host}:${config.port}${config.path || ''}`
    
    // 기본 헤더 설정
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'update-chat/1.0.0'
    }
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.host || !this.config.port) {
        throw new Error('HTTP connection requires host and port to be specified')
      }

      this.logger.info('MCP', 'Starting HTTP connection', {
        baseUrl: this.baseUrl,
        host: this.config.host,
        port: this.config.port,
        path: this.config.path
      })

      // 연결 테스트를 위한 ping 요청
      await this.sendPingRequest()
      
      this.isConnected = true
      this.logger.info('MCP', 'HTTP connection established')
    } catch (error) {
      this.handleError(error as Error, 'HTTP connection')
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.isConnected = false
      this.logger.info('MCP', 'HTTP connection disconnected')
    } catch (error) {
      this.handleError(error as Error, 'HTTP disconnection')
    }
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.isConnected) {
      throw new Error('HTTP connection not established')
    }

    try {
      const response = await this.sendHTTPRequest('POST', '/', message)
      this.logMessage('send', message)
      
      // 응답 처리
      if (response && typeof message.id === 'number') {
        this.handleIncomingMessage(response)
      }
    } catch (error) {
      this.handleError(error as Error, 'HTTP send')
      throw error
    }
  }

  onMessage(callback: (message: MCPMessage) => void): void {
    // HTTP는 stateless이므로 콜백을 저장만 하고 실제 처리는 send에서 수행
    // 이 메서드는 인터페이스 호환성을 위해 구현
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

  // HTTP 요청 전송
  private async sendHTTPRequest(
    method: string,
    path: string,
    data?: MCPMessage
  ): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl)
      const isHttps = url.protocol === 'https:'
      const client = isHttps ? https : http

      const requestData = data ? JSON.stringify(data) : ''
      const requestHeaders = {
        ...this.headers,
        'Content-Length': Buffer.byteLength(requestData)
      }

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: requestHeaders,
        timeout: this.config.timeout || 30000
      }

      const req = client.request(options, (res) => {
        let responseData = ''

        res.on('data', (chunk) => {
          responseData += chunk
        })

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              if (responseData) {
                const response = JSON.parse(responseData) as MCPMessage
                resolve(response)
              } else {
                resolve({} as MCPMessage)
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      if (requestData) {
        req.write(requestData)
      }

      req.end()
    })
  }

  // Ping 요청으로 연결 테스트
  private async sendPingRequest(): Promise<void> {
    const pingMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateMessageId(),
      method: 'ping',
      params: {}
    }

    try {
      await this.sendHTTPRequest('POST', '/', pingMessage)
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`)
    }
  }

  // 도구 목록 요청
  async requestTools(): Promise<MCPMessage> {
    const toolsMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateMessageId(),
      method: 'tools/list',
      params: {}
    }

    return await this.sendHTTPRequest('POST', '/', toolsMessage)
  }

  // 도구 호출 요청
  async callTool(toolName: string, args: Record<string, unknown>): Promise<MCPMessage> {
    const toolCallMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: this.generateMessageId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }

    return await this.sendHTTPRequest('POST', '/', toolCallMessage)
  }

  private handleIncomingMessage(message: MCPMessage): void {
    // 대기 중인 응답인지 확인
    if (typeof message.id === 'number' && this.pendingMessages.has(message.id)) {
      const { resolve } = this.pendingMessages.get(message.id)!
      resolve(message)
    }
  }

  // 연결 정보 가져오기
  getConnectionInfo(): {
    isConnected: boolean
    baseUrl: string
    protocol: string
  } {
    return {
      isConnected: this.isConnected,
      baseUrl: this.baseUrl,
      protocol: this.baseUrl.startsWith('https') ? 'https' : 'http'
    }
  }

  // 헤더 설정
  setHeader(name: string, value: string): void {
    this.headers[name] = value
  }

  // 헤더 제거
  removeHeader(name: string): void {
    delete this.headers[name]
  }
}
