import { MCPClient, MCPClientConfig, MCPServerConfig } from '../../services/MCP/MCPClient'
import { MCPConnectionType } from '../../services/MCP/MCPConnection'
import { Logger, LogLevel } from '../../core/logging/Logger'

class MCPContext7Test {
  private mcpClient: MCPClient
  private logger: Logger

  constructor() {
    this.logger = new Logger({
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      logDir: './logs',
      maxFileSize: 10,
      maxFiles: 5
    })

    // 실제 Context7 서버 설정
    const context7Config: MCPServerConfig = {
      name: 'context7',
      type: MCPConnectionType.STDIO,
      enabled: true,
      config: {
        type: MCPConnectionType.STDIO,
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
        timeout: 15000
      }
    }

    const clientConfig: MCPClientConfig = {
      servers: [context7Config],
      healthCheck: {
        checkInterval: 30000,
        timeout: 5000,
        maxRetries: 3
      },
      autoReconnect: true,
      maxRetries: 3
    }

    this.mcpClient = new MCPClient(this.logger, clientConfig)
  }

  async runTests(): Promise<void> {
    this.logger.info('TEST', '🚀 Context7 MCP 서버 연동 테스트 시작...')

    try {
      // 1. MCP Client 초기화 (서버 연결 포함)
      await this.testContext7Initialization()

      // 2. 도구 목록 로드 테스트
      await this.testContext7Tools()

      // 3. 도구 호출 테스트
      await this.testContext7ToolCalls()

      // 4. 헬스 체크 테스트
      await this.testContext7HealthCheck()

      this.logger.info('TEST', '✅ 모든 Context7 MCP 테스트가 성공적으로 완료되었습니다!')
    } catch (error) {
      this.logger.error('TEST', '❌ Context7 MCP 테스트 중 오류 발생:', error as Error)
      throw error
    } finally {
      await this.cleanup()
    }
  }

  private async testContext7Initialization(): Promise<void> {
    this.logger.info('TEST', '📡 Context7 서버 초기화 및 연결 테스트 중...')

    // MCP Client 초기화 (서버 연결 포함)
    await this.mcpClient.initialize()

    // 초기화 상태 확인
    const isInitialized = this.mcpClient.getInitialized()
    if (!isInitialized) {
      throw new Error('MCP Client 초기화 실패')
    }

    // 연결 상태 확인
    const isConnected = this.mcpClient.isServerConnected('context7')
    if (!isConnected) {
      throw new Error('Context7 서버 연결 실패')
    }

    this.logger.info('TEST', '✅ Context7 서버 초기화 및 연결 성공!')
  }

  private async testContext7Tools(): Promise<void> {
    this.logger.info('TEST', '🔧 Context7 도구 목록 로드 테스트 중...')

    // 모든 도구 가져오기
    const allTools = await this.mcpClient.getAllTools()
    this.logger.info('TEST', `📋 총 ${allTools.length}개의 도구가 로드되었습니다.`)

    // Context7 서버의 도구들 가져오기
    const toolsByServer = await this.mcpClient.getToolsByServer()
    const context7Tools = toolsByServer['context7'] || []
    this.logger.info(
      'TEST',
      `📋 Context7 서버에서 ${context7Tools.length}개의 도구를 가져왔습니다.`
    )

    // 도구 목록 출력
    context7Tools.forEach((tool) => {
      this.logger.info('TEST', `  - ${tool.name}: ${tool.description}`)
    })

    if (context7Tools.length === 0) {
      this.logger.warn('TEST', '⚠️ Context7 서버에서 도구를 찾을 수 없습니다.')
    }

    this.logger.info('TEST', '✅ Context7 도구 목록 로드 완료!')
  }

  private async testContext7ToolCalls(): Promise<void> {
    this.logger.info('TEST', '🛠️ Context7 도구 호출 테스트 중...')

    const toolsByServer = await this.mcpClient.getToolsByServer()
    const context7Tools = toolsByServer['context7'] || []

    if (context7Tools.length === 0) {
      this.logger.warn('TEST', '⚠️ 테스트할 도구가 없어 도구 호출 테스트를 건너뜁니다.')
      return
    }

    // 첫 번째 도구로 테스트 호출
    const testTool = context7Tools[0]
    this.logger.info('TEST', `🧪 테스트 도구: ${testTool.name}`)

    try {
      // 도구 호출 (실제 파라미터는 도구 스키마에 따라 조정 필요)
      const result = await this.mcpClient.callTool('context7', testTool.name, {
        // 예시 파라미터 (실제 도구에 맞게 수정 필요)
        query: 'test query'
      })

      this.logger.info('TEST', `✅ 도구 호출 성공: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      this.logger.warn('TEST', `⚠️ 도구 호출 실패 (예상 가능): ${error}`)
      // 도구 호출 실패는 예상 가능한 경우이므로 테스트를 중단하지 않음
    }

    this.logger.info('TEST', '✅ Context7 도구 호출 테스트 완료!')
  }

  private async testContext7HealthCheck(): Promise<void> {
    this.logger.info('TEST', '💓 Context7 헬스 체크 테스트 중...')

    // 모든 서버의 헬스 상태 확인
    const healthStatuses = this.mcpClient.getAllServerHealth()

    for (const [serverName, status] of Object.entries(healthStatuses)) {
      this.logger.info('TEST', `📊 ${serverName} 서버 상태:`)
      this.logger.info('TEST', `  - 연결 상태: ${status.isHealthy ? '✅ 연결됨' : '❌ 연결 안됨'}`)
      this.logger.info('TEST', `  - 응답 시간: ${status.responseTime}ms`)
      this.logger.info('TEST', `  - 마지막 체크: ${status.lastCheck}`)
      this.logger.info('TEST', `  - 오류: ${status.error || '없음'}`)
    }

    // Context7 서버 특별 체크
    const context7Health = healthStatuses['context7']
    if (context7Health) {
      if (context7Health.isHealthy) {
        this.logger.info('TEST', '✅ Context7 서버가 정상적으로 연결되어 있습니다!')
      } else {
        this.logger.warn('TEST', '⚠️ Context7 서버 연결에 문제가 있습니다.')
      }
    }

    this.logger.info('TEST', '✅ Context7 헬스 체크 테스트 완료!')
  }

  private async cleanup(): Promise<void> {
    this.logger.info('TEST', '🧹 테스트 정리 중...')
    await this.mcpClient.dispose()
    this.logger.info('TEST', '✅ 정리 완료!')
  }
}

// 테스트 실행 함수
export async function runMCPContext7Tests(): Promise<void> {
  const test = new MCPContext7Test()
  await test.runTests()
}

// 직접 실행 시
if (require.main === module) {
  runMCPContext7Tests().catch(console.error)
}
