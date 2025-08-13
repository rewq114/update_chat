// services/MCP/MCPSTDIOConnection.ts
import { spawn, ChildProcess } from 'child_process'
import { MCPConnection, MCPConnectionConfig, MCPMessage } from './MCPConnection'
import { Logger } from '../../core/logging/Logger'

export class MCPSTDIOConnection extends MCPConnection {
  private process: ChildProcess | null = null
  private messageCallback: ((message: MCPMessage) => void) | null = null
  private pendingMessages: Map<
    number,
    { resolve: (value: MCPMessage) => void; reject: (error: Error) => void }
  > = new Map()

  constructor(config: MCPConnectionConfig, logger: Logger) {
    super(config, logger)
  }

  async connect(): Promise<void> {
    try {
      if (!this.config.command) {
        throw new Error('STDIO connection requires command to be specified')
      }

      this.logger.info('MCP', 'Starting STDIO connection', {
        command: this.config.command,
        args: this.config.args
      })

      // MCP 서버 프로세스 시작 (Windows 호환성을 위해 shell 옵션 추가)
      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      })

      // stdout에서 메시지 읽기
      let buffer = ''
      this.process.stdout?.on('data', (data) => {
        buffer += data.toString()

        // 줄바꿈으로 구분된 JSON 메시지들을 파싱
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 마지막 줄은 완전하지 않을 수 있으므로 버퍼에 보관

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line) as MCPMessage
              this.logMessage('receive', message)
              this.handleIncomingMessage(message)
            } catch (error) {
              this.logger.error('MCP', 'Failed to parse STDIO message', error as Error, {
                data: line
              })
            }
          }
        }
      })

      // stderr 처리
      this.process.stderr?.on('data', (data) => {
        this.logger.warn('MCP', 'STDIO stderr', { data: data.toString() })
      })

      // 프로세스 종료 처리
      this.process.on('close', (code) => {
        this.isConnected = false
        this.logger.info('MCP', 'STDIO connection closed', { code })

        // 대기 중인 메시지들 거부
        for (const [, { reject }] of Array.from(this.pendingMessages.entries())) {
          reject(new Error(`Connection closed with code ${code}`))
        }
        this.pendingMessages.clear()
      })

      this.process.on('error', (error) => {
        this.isConnected = false
        this.handleError(error, 'STDIO process error')
      })

      this.isConnected = true
      this.logger.info('MCP', 'STDIO connection established')

      // 초기화 메시지 전송
      await this.sendInitializeMessage()
    } catch (error) {
      this.handleError(error as Error, 'STDIO connection')
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.process) {
        this.process.kill()
        this.process = null
      }
      this.isConnected = false
      this.logger.info('MCP', 'STDIO connection disconnected')
    } catch (error) {
      this.handleError(error as Error, 'STDIO disconnection')
    }
  }

  async send(message: MCPMessage): Promise<void> {
    if (!this.process || !this.isConnected) {
      throw new Error('STDIO connection not established')
    }

    try {
      const messageStr = JSON.stringify(message) + '\n'
      this.process.stdin?.write(messageStr)
      this.logMessage('send', message)
    } catch (error) {
      this.handleError(error as Error, 'STDIO send')
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
}
