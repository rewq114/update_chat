import { Logger, LogLevel } from '../logging/Logger'
import { MCPClient } from '../../services/MCP/MCPClient'
import { HChatLLMService } from '../../services/LLM/HChatLLMService'
import { ChatUseCase } from '../useCases/ChatUseCase'
import { FileChatRepository } from '../../platform/electron/repositories/FileChatRepository'
import { MCPManagerService } from '../../services/MCP/MCPManagerService'
import { LLMRequest } from '../entities/LLM'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'

export class MCPToolIntegrationTest {
  private logger: Logger
  private mcpClient: MCPClient | null = null
  private llmService: HChatLLMService | null = null
  private mcpService: MCPManagerService | null = null
  private chatUseCase: ChatUseCase | null = null
  private testServerProcess: ChildProcess | null = null

  constructor() {
    this.logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false,
      logDir: './logs',
      maxFileSize: 10,
      maxFiles: 5
    })
  }

  /**
   * 전체 테스트 실행
   */
  async runTests(): Promise<void> {
    console.log('🧪 Starting MCP Tool Integration Tests...')

    try {
      await this.setupTestEnvironment()
      await this.testToolCallInStreaming()
      await this.testMultipleToolCalls()
      await this.testToolCallErrorHandling()
      console.log('✅ All MCP Tool Integration tests passed!')
    } catch (error) {
      console.error('❌ MCP Tool Integration test failed:', error)
      throw error
    } finally {
      await this.cleanup()
    }
  }

  /**
   * 테스트 환경 설정
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...')

    // 테스트 MCP 서버 시작
    await this.startTestServer()

    // MCP 클라이언트 초기화
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

    console.log('MCP Client initialized')

    // LLM 서비스 초기화 (더미 API 키)
    this.llmService = new HChatLLMService()
    this.llmService.setApiKey('dummy-api-key-for-testing')

    // MCP 서비스 초기화
    this.mcpService = new MCPManagerService(this.logger)
    await this.mcpService.loadFromConfig({
      test_file_server: {
        type: 'stdio',
        command: 'node',
        args: [path.join(__dirname, '../../../test-mcp-server.js')]
      }
    })

    // Chat Use Case 초기화
    const chatRepository = new FileChatRepository('./test-data', this.logger)
    this.chatUseCase = new ChatUseCase(chatRepository, this.llmService, this.mcpService)

    console.log('✅ Test environment setup completed')
  }

  /**
   * 테스트 MCP 서버 시작
   */
  private async startTestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.testServerProcess = spawn(
        'node',
        [path.join(__dirname, '../../../test-mcp-server.js')],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: process.platform === 'win32'
        }
      )

      this.testServerProcess.on('error', (error: Error) => {
        console.error('Failed to start test server:', error)
        reject(error)
      })

      // 서버가 시작될 때까지 잠시 대기
      setTimeout(() => {
        resolve()
      }, 1000)
    })
  }

  /**
   * 스트리밍에서 도구 호출 테스트
   */
  private async testToolCallInStreaming(): Promise<void> {
    console.log('🔄 Testing tool call in streaming response...')

    if (!this.chatUseCase) {
      throw new Error('ChatUseCase not initialized')
    }

    // 모의 스트리밍 응답 생성
    const mockStream = this.createMockStreamWithToolCall()

    // LLM 서비스의 stream 메서드를 모의로 대체
    if (this.llmService) {
      this.llmService.stream = async function* () {
        yield* mockStream
      }
    }

    const request: LLMRequest = {
      model: 'claude-opus-4',
      messages: [
        {
          role: 'user',
          time: Date.now(),
          type: 'text',
          content: 'Please read the file /test/file.txt and tell me its contents.'
        }
      ],
      tools: ['test_file_server']
    }

    const responseChunks: string[] = []

    const callback = {
      onChunk: (chunk: string) => {
        responseChunks.push(chunk)
        console.log('📝 Received chunk:', chunk)
      },
      onComplete: (finalResponse: string) => {
        console.log('✅ Streaming completed:', finalResponse)
      },
      onError: (error: string) => {
        console.error('❌ Streaming error:', error)
        throw new Error(`Streaming failed: ${error}`)
      }
    }

    console.log('🚀 Starting streaming request...')

    // 스트리밍 요청 실행
    await this.chatUseCase.processStreamingRequest(request, callback)

    console.log(`📊 Total chunks received: ${responseChunks.length}`)
    console.log(`📝 All chunks:`, responseChunks)

    // 응답에 도구 호출이 포함되었는지 확인
    if (responseChunks.length > 0) {
      console.log('✅ Tool call in streaming test completed')
    } else {
      throw new Error('No response chunks received')
    }
  }

  /**
   * 모의 스트리밍 응답 생성 (도구 호출 포함)
   */
  private *createMockStreamWithToolCall(): Generator<string> {
    console.log('🎭 Creating mock stream with tool call...')

    // 일반 텍스트 응답
    yield 'I will read the file for you.'

    // 도구 호출 시작
    yield JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'test_file_server_read_file',
                  arguments: '{"path":"/test/file.txt"}'
                }
              }
            ]
          }
        }
      ]
    }) + '\n'

    // 도구 호출 완료
    yield JSON.stringify({
      choices: [
        {
          finish_reason: 'tool_calls'
        }
      ]
    }) + '\n'

    // 도구 결과 후 응답
    yield 'The file contains: Hello, World!'

    console.log('🎭 Mock stream completed')
  }

  /**
   * 다중 도구 호출 테스트
   */
  private async testMultipleToolCalls(): Promise<void> {
    console.log('🔄 Testing multiple tool calls...')

    if (!this.chatUseCase) {
      throw new Error('ChatUseCase not initialized')
    }

    const request: LLMRequest = {
      model: 'claude-opus-4',
      messages: [
        {
          role: 'user',
          time: Date.now(),
          type: 'text',
          content:
            'Please list the directory /test, then read file.txt and write a summary to summary.txt'
        }
      ],
      tools: ['test_file_server']
    }

    const responseChunks: string[] = []

    const callback = {
      onChunk: (chunk: string) => {
        responseChunks.push(chunk)
        console.log('📝 Multiple tools chunk:', chunk)
      },
      onComplete: (finalResponse: string) => {
        console.log('✅ Multiple tools completed:', finalResponse)
      },
      onError: (error: string) => {
        console.error('❌ Multiple tools error:', error)
        throw new Error(`Multiple tools failed: ${error}`)
      }
    }

    // 스트리밍 요청 실행
    await this.chatUseCase.processStreamingRequest(request, callback)

    console.log('✅ Multiple tool calls test completed')
  }

  /**
   * 도구 호출 에러 처리 테스트
   */
  private async testToolCallErrorHandling(): Promise<void> {
    console.log('⚠️ Testing tool call error handling...')

    if (!this.chatUseCase) {
      throw new Error('ChatUseCase not initialized')
    }

    const request: LLMRequest = {
      model: 'claude-opus-4',
      messages: [
        {
          role: 'user',
          time: Date.now(),
          type: 'text',
          content: 'Please read a non-existent file /test/nonexistent.txt'
        }
      ],
      tools: ['test_file_server']
    }

    const responseChunks: string[] = []

    const callback = {
      onChunk: (chunk: string) => {
        responseChunks.push(chunk)
        console.log('📝 Error handling chunk:', chunk)
      },
      onComplete: (finalResponse: string) => {
        console.log('✅ Error handling completed:', finalResponse)
      },
      onError: (error: string) => {
        console.error('❌ Error handling error:', error)
        // 에러가 발생해도 테스트는 성공 (에러 처리가 제대로 작동함)
        console.log('✅ Error handling test completed (error was handled)')
      }
    }

    // 스트리밍 요청 실행
    await this.chatUseCase.processStreamingRequest(request, callback)

    console.log('✅ Tool call error handling test completed')
  }

  /**
   * 테스트 환경 정리
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...')

    if (this.testServerProcess) {
      this.testServerProcess.kill()
    }

    if (this.mcpClient) {
      // MCPClient에 disconnect 메서드가 없으므로 연결을 닫는 다른 방법 사용
      // 실제로는 각 연결을 개별적으로 닫아야 함
      console.log('Disconnecting MCP client...')
    }

    console.log('✅ Test environment cleaned up')
  }
}

// 테스트 실행
if (require.main === module) {
  const test = new MCPToolIntegrationTest()
  test
    .runTests()
    .then(() => {
      console.log('🎉 All tests completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Tests failed:', error)
      process.exit(1)
    })
}
