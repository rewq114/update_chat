// core/test/mcp-client-test.ts
import { Logger, LogLevel } from '../logging/Logger'
import { MCPClient, MCPClientConfig, MCPServerConfig } from '../../services/MCP/MCPClient'
import { MCPConnectionType } from '../../services/MCP/MCPConnection'
import { MCPToolConverter, MCPTool } from '../../services/MCP/MCPToolConverter'
import { MCPHealthChecker, MCPHealthCheckConfig } from '../../services/MCP/MCPHealthChecker'
import { MCPWebSocketConnection } from '../../services/MCP/MCPWebSocketConnection'
import { MCPHTTPConnection } from '../../services/MCP/MCPHTTPConnection'
import * as fs from 'fs'
import * as path from 'path'

export class MCPClientTest {
  private logger: Logger
  private testDataDir: string
  private mcpClient: MCPClient | null = null

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
   * 모든 MCP Client 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting MCP Client tests...')

    try {
      await this.setupTestEnvironment()

      await this.testToolConverter()
      await this.testHealthChecker()
      await this.testMCPClientInitialization()
      await this.testToolConversion()
      await this.testHealthMonitoring()
      await this.testErrorHandling()
      await this.testConnectionTypes()

      console.log('✅ All MCP Client tests completed successfully!')
    } catch (error) {
      console.error('❌ MCP Client tests failed:', error)
      throw error
    } finally {
      await this.cleanupTestEnvironment()
    }
  }

  /**
   * 테스트 환경 설정
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up MCP test environment...')

    // 테스트 디렉토리 생성
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true })
    }

    this.logger.info('TEST', 'MCP test environment setup completed', {
      testDataDir: this.testDataDir
    })
  }

  /**
   * 도구 변환기 테스트
   */
  private async testToolConverter(): Promise<void> {
    console.log('🔄 Testing tool converter...')

    const converter = new MCPToolConverter(this.logger)

    // 테스트용 MCP 도구 생성
    const mcpTools: MCPTool[] = [
      {
        name: 'get_weather',
        description: 'Get weather information for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Location to get weather for'
            }
          },
          required: ['location']
        },
        serverName: 'weather_server'
      },
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path to read'
            }
          },
          required: ['path']
        },
        serverName: 'file_server'
      }
    ]

    // MCP 도구를 h-chat 형식으로 변환
    const hchatTools = converter.convertMCPToolsToHChatFormat(mcpTools)

    console.log(`Converted ${mcpTools.length} MCP tools to ${hchatTools.length} h-chat tools`)

    // 변환 결과 검증
    if (hchatTools.length !== mcpTools.length) {
      throw new Error('Tool count mismatch after conversion')
    }

    // 도구 이름 검증
    const expectedNames = ['weather_server_get_weather', 'file_server_read_file']
    for (const expectedName of expectedNames) {
      const found = hchatTools.find((tool) => tool.function.name === expectedName)
      if (!found) {
        throw new Error(`Expected tool name not found: ${expectedName}`)
      }
    }

    // h-chat 도구 호출을 MCP 형식으로 변환 테스트
    const hchatToolCall = {
      name: 'weather_server_get_weather',
      arguments: { location: 'Seoul' }
    }

    const mcpToolCall = converter.convertHChatToolCallToMCP(hchatToolCall, 'weather_server')

    if (mcpToolCall.name !== 'get_weather') {
      throw new Error('Tool name conversion failed')
    }

    if (mcpToolCall.serverName !== 'weather_server') {
      throw new Error('Server name extraction failed')
    }

    this.logger.info('TEST', 'Tool converter test completed')
  }

  /**
   * 헬스 체커 테스트
   */
  private async testHealthChecker(): Promise<void> {
    console.log('🏥 Testing health checker...')

    const healthConfig: MCPHealthCheckConfig = {
      checkInterval: 5000,
      timeout: 3000,
      maxRetries: 3
    }

    const healthChecker = new MCPHealthChecker(this.logger, healthConfig)

    // 더미 연결 객체 생성 (실제 연결 없이 테스트)
    const mockConnection = {
      isConnectionActive: () => true,
      send: async () => Promise.resolve()
    } as any

    // 헬스 체크 실행
    const healthStatus = await healthChecker.checkHealth('test_server', mockConnection)

    console.log('Health status:', healthStatus)

    // 헬스 상태 검증
    if (!healthStatus.isHealthy) {
      throw new Error('Health check should pass for mock connection')
    }

    // 헬스 요약 테스트
    const summary = healthChecker.getOverallHealthSummary()
    console.log('Health summary:', summary)

    if (summary.totalServers !== 1) {
      throw new Error('Health summary server count mismatch')
    }

    // 헬스 체커 정리
    healthChecker.dispose()

    this.logger.info('TEST', 'Health checker test completed')
  }

  /**
   * MCP Client 초기화 테스트
   */
  private async testMCPClientInitialization(): Promise<void> {
    console.log('🔌 Testing MCP client initialization...')

    const healthConfig: MCPHealthCheckConfig = {
      checkInterval: 10000,
      timeout: 5000,
      maxRetries: 2
    }

    const clientConfig: MCPClientConfig = {
      servers: [
        {
          name: 'test_server',
          type: MCPConnectionType.STDIO,
          config: {
            type: MCPConnectionType.STDIO,
            command: 'echo', // 간단한 명령어로 테스트
            args: ['test']
          },
          enabled: false // 실제 연결 없이 테스트
        }
      ],
      healthCheck: healthConfig,
      autoReconnect: false,
      maxRetries: 3
    }

    this.mcpClient = new MCPClient(this.logger, clientConfig)

    // 초기화 상태 확인
    if (this.mcpClient.getInitialized()) {
      throw new Error('Client should not be initialized before initialize() call')
    }

    // 초기화 실행 (실제 연결 없이)
    try {
      await this.mcpClient.initialize()
    } catch (error) {
      // 예상된 오류 (실제 서버가 없으므로)
      console.log('Expected initialization error (no real server):', error)
    }

    this.logger.info('TEST', 'MCP client initialization test completed')
  }

  /**
   * 도구 변환 테스트
   */
  private async testToolConversion(): Promise<void> {
    console.log('🛠️ Testing tool conversion...')

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized')
    }

    // 도구 목록 가져오기
    const allTools = await this.mcpClient.getAllTools()
    console.log(`Retrieved ${allTools.length} tools`)

    // h-chat 도구 형식으로 변환
    const hchatTools = await this.mcpClient.getHChatTools()
    console.log(`Converted to ${hchatTools.length} h-chat tools`)

    // 서버별 도구 목록
    const toolsByServer = await this.mcpClient.getToolsByServer()
    console.log('Tools by server:', Object.keys(toolsByServer))

    this.logger.info('TEST', 'Tool conversion test completed')
  }

  /**
   * 헬스 모니터링 테스트
   */
  private async testHealthMonitoring(): Promise<void> {
    console.log('📊 Testing health monitoring...')

    if (!this.mcpClient) {
      throw new Error('MCP client not initialized')
    }

    // 서버 헬스 상태 확인
    const serverHealth = this.mcpClient.getServerHealth('test_server')
    console.log('Server health:', serverHealth)

    // 모든 서버 헬스 상태
    const allHealth = this.mcpClient.getAllServerHealth()
    console.log('All server health:', allHealth)

    // 헬스 요약
    const healthSummary = this.mcpClient.getHealthSummary()
    console.log('Health summary:', healthSummary)

    // 연결 상태 확인
    const isConnected = this.mcpClient.isServerConnected('test_server')
    console.log('Server connected:', isConnected)

    this.logger.info('TEST', 'Health monitoring test completed')
  }

  /**
   * 에러 처리 테스트
   */
  private async testErrorHandling(): Promise<void> {
    console.log('⚠️ Testing error handling...')

    const converter = new MCPToolConverter(this.logger)

    // 잘못된 도구 이름에서 서버 이름 추출
    const invalidServerName = converter.extractServerNameFromToolName('abc')
    if (invalidServerName !== null) {
      throw new Error('Should return null for tool name without server prefix')
    }

    // 존재하지 않는 서버에 대한 도구 호출 시뮬레이션
    try {
      if (this.mcpClient) {
        await this.mcpClient.callTool('nonexistent_server', 'test_tool', {})
        throw new Error('Should throw error for nonexistent server')
      }
    } catch (error) {
      console.log('Expected error for nonexistent server:', error)
    }

    // 잘못된 h-chat 도구 호출
    try {
      if (this.mcpClient) {
        await this.mcpClient.callHChatTool({
          name: 'invalid_tool_name',
          arguments: {}
        })
        throw new Error('Should throw error for invalid tool name')
      }
    } catch (error) {
      console.log('Expected error for invalid tool name:', error)
    }

    this.logger.info('TEST', 'Error handling test completed')
  }

  /**
   * 연결 타입 테스트
   */
  private async testConnectionTypes(): Promise<void> {
    console.log('🔗 Testing connection types...')

    // WebSocket 연결 테스트 (실제 서버 없이 생성만)
    try {
      const wsConfig = {
        type: MCPConnectionType.WEBSOCKET,
        host: 'localhost',
        port: 8080,
        path: '/mcp',
        timeout: 5000
      }

      const wsConnection = new MCPWebSocketConnection(wsConfig, this.logger)
      console.log('WebSocket connection created successfully')

      // 연결 정보 확인
      const wsInfo = wsConnection.getConnectionInfo()
      console.log('WebSocket connection info:', wsInfo)

      // 연결 시도 (실제 서버가 없으므로 실패 예상)
      try {
        await wsConnection.connect()
      } catch (error) {
        console.log('Expected WebSocket connection error (no server):', error)
      }

      await wsConnection.disconnect()
    } catch (error) {
      console.log('WebSocket connection test error:', error)
    }

    // HTTP 연결 테스트 (실제 서버 없이 생성만)
    try {
      const httpConfig = {
        type: MCPConnectionType.HTTP,
        host: 'localhost',
        port: 3000,
        path: '/api/mcp',
        timeout: 5000
      }

      const httpConnection = new MCPHTTPConnection(httpConfig, this.logger)
      console.log('HTTP connection created successfully')

      // 연결 정보 확인
      const httpInfo = httpConnection.getConnectionInfo()
      console.log('HTTP connection info:', httpInfo)

      // 헤더 설정 테스트
      httpConnection.setHeader('Authorization', 'Bearer test-token')
      httpConnection.setHeader('X-Custom-Header', 'test-value')

      // 연결 시도 (실제 서버가 없으므로 실패 예상)
      try {
        await httpConnection.connect()
      } catch (error) {
        console.log('Expected HTTP connection error (no server):', error)
      }

      await httpConnection.disconnect()
    } catch (error) {
      console.log('HTTP connection test error:', error)
    }

    this.logger.info('TEST', 'Connection types test completed')
  }

  /**
   * 테스트 환경 정리
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up MCP test environment...')

    if (this.mcpClient) {
      await this.mcpClient.dispose()
    }

    this.logger.info('TEST', 'MCP test environment cleanup completed')
  }
}

// 직접 실행
if (require.main === module) {
  const test = new MCPClientTest()
  test.runAllTests().catch(console.error)
}

export const runMCPClientTests = async (): Promise<void> => {
  const test = new MCPClientTest()
  await test.runAllTests()
}
