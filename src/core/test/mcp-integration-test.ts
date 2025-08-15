// core/test/mcp-integration-test.ts
import { Logger, LogLevel } from '../logging/Logger'
import { MCPClient, MCPClientConfig } from '../../services/MCP/MCPClient'
import { MCPConnectionType } from '../../services/MCP/MCPConnection'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export class MCPIntegrationTest {
  private logger: Logger
  private testDataDir: string
  private mcpClient: MCPClient | null = null
  private mcpServerProcess: ChildProcess | null = null

  constructor() {
    // 테스트용 데이터 디렉토리 설정
    this.testDataDir = path.join(process.cwd(), 'test-data')

    // 로거 초기화 (테스트용으로 파일 로깅 비활성화)
    this.logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false,
      logDir: path.join(this.testDataDir, 'logs'),
      maxFileSize: 10,
      maxFiles: 5
    })
  }

  /**
   * 모든 MCP 통합 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting MCP Integration tests...')

    try {
      await this.setupTestEnvironment()
      await this.startMCPServer()
      await this.testMCPConnection()
      await this.testToolDiscovery()
      await this.testToolExecution()
      await this.testErrorHandling()

      console.log('✅ All MCP Integration tests completed successfully!')
    } catch (error) {
      console.error('❌ MCP Integration tests failed:', error)
      throw error
    } finally {
      await this.cleanupTestEnvironment()
    }
  }

  /**
   * 테스트 환경 설정
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up MCP integration test environment...')

    // 테스트 디렉토리 생성
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true })
    }

    this.logger.info('TEST', 'MCP integration test environment setup completed', {
      testDataDir: this.testDataDir
    })
  }

  /**
   * MCP 서버 시작
   */
  private async startMCPServer(): Promise<void> {
    console.log('🖥️ Starting MCP server...')

    const serverPath = path.join(process.cwd(), 'test-mcp-server.js')

    if (!fs.existsSync(serverPath)) {
      throw new Error('MCP server file not found: test-mcp-server.js')
    }

    this.mcpServerProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // 서버 시작 대기
    await new Promise((resolve) => setTimeout(resolve, 1000))

    this.logger.info('TEST', 'MCP server started')
  }

  /**
   * MCP 연결 테스트
   */
  private async testMCPConnection(): Promise<void> {
    console.log('🔌 Testing MCP connection...')

    const healthConfig = {
      checkInterval: 10000,
      timeout: 5000,
      maxRetries: 3
    }

    const clientConfig: MCPClientConfig = {
      servers: [
        {
          name: 'test_file_server',
          type: MCPConnectionType.STDIO,
          config: {
            type: MCPConnectionType.STDIO,
            command: 'node',
            args: [path.join(process.cwd(), 'test-mcp-server.js')]
          },
          enabled: true
        }
      ],
      healthCheck: healthConfig,
      autoReconnect: true,
      maxRetries: 3
    }

    this.mcpClient = new MCPClient(this.logger, clientConfig)

    // 초기화
    await this.mcpClient.initialize()

    // 연결 상태 확인
    const isConnected = this.mcpClient.isServerConnected('test_file_server')
    if (!isConnected) {
      throw new Error('Failed to connect to MCP server')
    }

    console.log('✅ MCP connection established successfully')

    this.logger.info('TEST', 'MCP connection test completed')
  }

  /**
   * 도구 발견 테스트
   */
  private async testToolDiscovery(): Promise<void> {
    console.log('🔍 Testing tool discovery...')

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized')
    }

    // 모든 도구 가져오기
    const allTools = await this.mcpClient.getAllTools()
    console.log(
      `Found ${allTools.length} tools:`,
      allTools.map((t) => t.name)
    )

    // 서버별 도구 가져오기
    const toolsByServer = await this.mcpClient.getToolsByServer()
    console.log('Tools by server:', Object.keys(toolsByServer))

    // h-chat 형식 도구 가져오기
    const hchatTools = await this.mcpClient.getHChatTools()
    console.log(`Converted to ${hchatTools.length} h-chat tools`)

    // 예상 도구 확인
    const expectedTools = ['read_file', 'write_file', 'list_directory']
    for (const expectedTool of expectedTools) {
      const found = allTools.find((tool) => tool.name === expectedTool)
      if (!found) {
        throw new Error(`Expected tool not found: ${expectedTool}`)
      }
    }

    console.log('✅ Tool discovery completed successfully')

    this.logger.info('TEST', 'Tool discovery test completed')
  }

  /**
   * 도구 실행 테스트
   */
  private async testToolExecution(): Promise<void> {
    console.log('🛠️ Testing tool execution...')

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized')
    }

    // 파일 읽기 도구 테스트
    console.log('Testing read_file tool...')
    const readResult = await this.mcpClient.callTool('test_file_server', 'read_file', {
      path: '/test/file.txt'
    })
    console.log('Read file result:', readResult)

    // 파일 쓰기 도구 테스트
    console.log('Testing write_file tool...')
    const writeResult = await this.mcpClient.callTool('test_file_server', 'write_file', {
      path: '/test/output.txt',
      content: 'Hello, MCP!'
    })
    console.log('Write file result:', writeResult)

    // 디렉토리 목록 도구 테스트
    console.log('Testing list_directory tool...')
    const listResult = await this.mcpClient.callTool('test_file_server', 'list_directory', {
      path: '/test'
    })
    console.log('List directory result:', listResult)

    // h-chat 도구 호출 테스트
    console.log('Testing h-chat tool call...')
    const hchatResult = await this.mcpClient.callHChatTool({
      name: 'test_file_server_read_file',
      arguments: { path: '/test/hchat.txt' }
    })
    console.log('HChat tool call result:', hchatResult)

    console.log('✅ Tool execution completed successfully')

    this.logger.info('TEST', 'Tool execution test completed')
  }

  /**
   * 에러 처리 테스트
   */
  private async testErrorHandling(): Promise<void> {
    console.log('⚠️ Testing error handling...')

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized')
    }

    // 존재하지 않는 도구 호출
    try {
      await this.mcpClient.callTool('test_file_server', 'nonexistent_tool', {})
      throw new Error('Should throw error for nonexistent tool')
    } catch (error) {
      console.log('Expected error for nonexistent tool:', error)
    }

    // 잘못된 인수로 도구 호출
    try {
      await this.mcpClient.callTool('test_file_server', 'read_file', {})
      throw new Error('Should throw error for invalid arguments')
    } catch (error) {
      console.log('Expected error for invalid arguments:', error)
    }

    // 헬스 상태 확인
    const healthStatus = this.mcpClient.getServerHealth('test_file_server')
    console.log('Server health status:', healthStatus)

    const healthSummary = this.mcpClient.getHealthSummary()
    console.log('Overall health summary:', healthSummary)

    console.log('✅ Error handling completed successfully')

    this.logger.info('TEST', 'Error handling test completed')
  }

  /**
   * 테스트 환경 정리
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up MCP integration test environment...')

    if (this.mcpClient) {
      await this.mcpClient.dispose()
    }

    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill()
      this.mcpServerProcess = null
    }

    this.logger.info('TEST', 'MCP integration test environment cleanup completed')
  }
}

// 직접 실행
if (require.main === module) {
  const test = new MCPIntegrationTest()
  test.runAllTests().catch(console.error)
}

export const runMCPIntegrationTests = async (): Promise<void> => {
  const test = new MCPIntegrationTest()
  await test.runAllTests()
}
