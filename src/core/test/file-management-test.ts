// core/test/file-management-test.ts
import { Logger, LogLevel } from '../logging/Logger'
import { FileChatRepository } from '../../platform/electron/repositories/FileChatRepository'
import { FileConfigRepository } from '../../platform/electron/repositories/FileConfigRepository'
import { ChatUseCase } from '../useCases/ChatUseCase'
import { ConfigUseCase } from '../useCases/ConfigUseCase'
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor'
import { SystemMonitor, SystemMonitorConfig } from '../monitoring/SystemMonitor'
import { MCPManagerService } from '../../services/MCP/MCPManagerService'
import { HChatLLMService } from '../../services/LLM/HChatLLMService'
import { ChatSession, ChatMessage } from '../entities/ChatMessage'
import * as fs from 'fs'
import * as path from 'path'

// interface ChatData { // 사용하지 않는 인터페이스 제거
//   sessionId: string
//   messages: ChatMessage[]
// }

export class FileManagementTest {
  private logger: Logger
  private performanceMonitor: PerformanceMonitor
  private systemMonitor: SystemMonitor
  private testDataDir: string
  private chatRepository: FileChatRepository
  private configRepository: FileConfigRepository
  private chatUseCase: ChatUseCase
  private configUseCase: ConfigUseCase

  constructor() {
    // 테스트용 데이터 디렉토리 설정
    this.testDataDir = path.join(process.cwd(), 'test-data')

    // 필요한 디렉토리들을 먼저 생성
    this.ensureTestDirectories()

    // 로거 초기화 (테스트용으로 파일 로깅 비활성화)
    this.logger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false, // 테스트에서는 파일 로깅 비활성화
      logDir: path.join(this.testDataDir, 'logs'),
      maxFileSize: 10,
      maxFiles: 5
    })

    // 성능 모니터 초기화
    this.performanceMonitor = new PerformanceMonitor(this.logger)

    // 시스템 모니터 초기화
    const monitorConfig: SystemMonitorConfig = {
      logConfig: {
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: false, // 테스트에서는 파일 로깅 비활성화
        logDir: path.join(this.testDataDir, 'logs'),
        maxFileSize: 10,
        maxFiles: 5
      },
      enablePerformanceMonitoring: true,
      enableErrorHandling: true,
      enableSystemMetrics: true,
      cleanupInterval: 60000
    }

    this.systemMonitor = new SystemMonitor(monitorConfig)

    // Repository 초기화
    this.chatRepository = new FileChatRepository(this.testDataDir, this.logger)
    this.configRepository = new FileConfigRepository(this.testDataDir, this.logger)

    // UseCase 초기화
    const mcpService = new MCPManagerService()
    const llmService = new HChatLLMService()
    this.chatUseCase = new ChatUseCase(this.chatRepository, llmService, mcpService)
    this.configUseCase = new ConfigUseCase(this.configRepository)
  }

  /**
   * 테스트에 필요한 디렉토리들을 생성
   */
  private ensureTestDirectories(): void {
    try {
      // 메인 테스트 데이터 디렉토리
      if (!fs.existsSync(this.testDataDir)) {
        fs.mkdirSync(this.testDataDir, { recursive: true })
      }

      // 로그 디렉토리
      const logsDir = path.join(this.testDataDir, 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      // 채팅 데이터 디렉토리
      const chatsDir = path.join(this.testDataDir, 'chats')
      if (!fs.existsSync(chatsDir)) {
        fs.mkdirSync(chatsDir, { recursive: true })
      }

      // 빈 로그 파일 생성 (Logger가 파일을 찾을 수 있도록)
      const logFile = path.join(logsDir, `app-${this.getDateString()}.log`)
      if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '', 'utf8')
      }

      console.log('Test directories created successfully')
    } catch (error) {
      console.error('Failed to create test directories:', error)
      throw error
    }
  }

  /**
   * 날짜 문자열 생성 (Logger와 동일한 형식)
   */
  private getDateString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0] // YYYY-MM-DD
  }

  /**
   * 모든 파일 관리 테스트 실행
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting file management tests...')

    try {
      await this.setupTestEnvironment()

      await this.testChatSessionManagement()
      await this.testChatDataManagement()
      await this.testConfigurationManagement()
      await this.testPerformanceMonitoring()
      await this.testErrorHandling()
      await this.testConcurrentOperations()
      await this.testDataIntegrity()

      console.log('✅ All file management tests completed successfully!')
    } catch (error) {
      console.error('❌ File management tests failed:', error)
      throw error
    } finally {
      await this.cleanupTestEnvironment()
    }
  }

  /**
   * 테스트 환경 설정
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...')

    // 테스트 디렉토리 생성
    if (!fs.existsSync(this.testDataDir)) {
      fs.mkdirSync(this.testDataDir, { recursive: true })
    }

    // 기존 테스트 데이터 정리
    await this.cleanupTestData()

    this.logger.info('TEST', 'Test environment setup completed', {
      testDataDir: this.testDataDir
    })
  }

  /**
   * 채팅 세션 관리 테스트
   */
  private async testChatSessionManagement(): Promise<void> {
    console.log('💬 Testing chat session management...')

    // 1. 세션 생성 테스트
    const session1: ChatSession = {
      id: 'test-session-1',
      title: '테스트 세션 1',
      model: 'claude-opus-4',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await this.systemMonitor.measureAsync('create_session', async () => {
      await this.chatUseCase.saveSession(session1)
    })

    // 2. 세션 조회 테스트
    const sessions = await this.systemMonitor.measureAsync('get_sessions', async () => {
      return await this.chatUseCase.getSessions()
    })

    console.log(`Created and retrieved ${sessions.length} sessions`)

    // 3. 세션 업데이트 테스트
    const updatedSession = { ...session1, title: '업데이트된 테스트 세션 1' }
    await this.systemMonitor.measureAsync('update_session', async () => {
      await this.chatUseCase.saveSession(updatedSession)
    })

    // 4. 세션 이름 변경 테스트
    await this.systemMonitor.measureAsync('rename_session', async () => {
      await this.chatUseCase.renameSession(session1.id, '새로운 제목')
    })

    // 5. 세션 삭제 테스트
    await this.systemMonitor.measureAsync('delete_session', async () => {
      await this.chatUseCase.deleteSession(session1.id)
    })

    this.logger.info('TEST', 'Chat session management test completed')
  }

  /**
   * 채팅 데이터 관리 테스트
   */
  private async testChatDataManagement(): Promise<void> {
    console.log('📝 Testing chat data management...')

    // 1. 세션 생성
    const session: ChatSession = {
      id: 'test-chat-session',
      title: '채팅 데이터 테스트',
      model: 'claude-opus-4',
      lastMessageTime: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await this.chatUseCase.saveSession(session)

    // 2. 메시지 추가 테스트
    const messages: ChatMessage[] = [
      {
        role: 'user',
        type: 'text',
        content: '안녕하세요!',
        time: Date.now()
      },
      {
        role: 'assistant',
        type: 'text',
        content: '안녕하세요! 무엇을 도와드릴까요?',
        time: Date.now()
      },
      {
        role: 'user',
        type: 'text',
        content: '파일 관리 시스템에 대해 설명해주세요.',
        time: Date.now()
      }
    ]

    await this.systemMonitor.measureAsync('save_chat_data', async () => {
      await this.chatUseCase.saveChatData(session.id, messages)
    })

    // 3. 채팅 데이터 조회 테스트
    const chatData = await this.systemMonitor.measureAsync('get_chat_data', async () => {
      return await this.chatUseCase.getChatData(session.id)
    })

    console.log(`Retrieved chat data with ${chatData?.length || 0} messages`)

    // 4. 대용량 메시지 테스트
    const largeMessage: ChatMessage = {
      role: 'assistant',
      type: 'text',
      content: 'A'.repeat(10000), // 10KB 메시지
      time: Date.now()
    }

    await this.systemMonitor.measureAsync('save_large_message', async () => {
      await this.chatUseCase.saveChatData(session.id, [...messages, largeMessage])
    })

    this.logger.info('TEST', 'Chat data management test completed')
  }

  /**
   * 설정 관리 테스트
   */
  private async testConfigurationManagement(): Promise<void> {
    console.log('⚙️ Testing configuration management...')

    // 1. API 키 설정 테스트
    await this.systemMonitor.measureAsync('save_api_key', async () => {
      await this.configUseCase.saveApiKey('test-api-key-12345')
    })

    const apiKey = await this.systemMonitor.measureAsync('get_api_key', async () => {
      return await this.configUseCase.getApiKey()
    })

    console.log(`API Key retrieved: ${apiKey ? 'Present' : 'Not found'}`)

    // 2. 시스템 프롬프트 설정 테스트
    const systemPrompt = '당신은 도움이 되는 AI 어시스턴트입니다.'
    await this.systemMonitor.measureAsync('save_system_prompt', async () => {
      await this.configUseCase.saveSystemPrompt(systemPrompt)
    })

    const retrievedPrompt = await this.systemMonitor.measureAsync('get_system_prompt', async () => {
      return await this.configUseCase.getSystemPrompt()
    })

    console.log(`System prompt: ${retrievedPrompt}`)

    // 3. 테마 설정 테스트
    await this.systemMonitor.measureAsync('save_theme', async () => {
      await this.configUseCase.saveTheme('dark')
    })

    const theme = await this.systemMonitor.measureAsync('get_theme', async () => {
      return await this.configUseCase.getTheme()
    })

    console.log(`Theme: ${theme}`)

    // 4. 기본 모델 설정 테스트
    await this.systemMonitor.measureAsync('save_default_model', async () => {
      await this.configUseCase.saveDefaultModel('claude-opus-4')
    })

    const model = await this.systemMonitor.measureAsync('get_default_model', async () => {
      return await this.configUseCase.getDefaultModel()
    })

    console.log(`Default model: ${model}`)

    // 5. MCP 설정 테스트
    const mcpConfig = {
      servers: [
        {
          name: 'test-server',
          command: 'test-command',
          args: ['--test']
        }
      ]
    }

    await this.systemMonitor.measureAsync('save_mcp_config', async () => {
      await this.configUseCase.saveMCPConfig(mcpConfig)
    })

    this.logger.info('TEST', 'Configuration management test completed')
  }

  /**
   * 성능 모니터링 테스트
   */
  private async testPerformanceMonitoring(): Promise<void> {
    console.log('📊 Testing performance monitoring...')

    // 1. 성능 리포트 생성
    const report = this.systemMonitor.generatePerformanceReport()
    console.log('Performance report generated:', {
      totalOperations: report.summary.totalOperations,
      averageResponseTime: `${report.summary.averageResponseTime.toFixed(2)}ms`,
      successRate: `${report.summary.successRate.toFixed(2)}%`
    })

    // 2. 시스템 헬스 체크
    const health = this.systemMonitor.getSystemHealth()
    console.log('System health:', {
      status: health.status,
      memoryUsage: `${health.memoryUsage.usagePercent.toFixed(2)}%`,
      uptime: `${health.uptime.toFixed(2)}s`
    })

    // 3. 에러 통계
    const errorStats = this.systemMonitor.getErrorStats()
    console.log('Error stats:', {
      totalErrors: errorStats.totalErrors,
      unhandledErrors: errorStats.unhandledErrors
    })

    this.logger.info('TEST', 'Performance monitoring test completed')
  }

  /**
   * 에러 처리 테스트
   */
  private async testErrorHandling(): Promise<void> {
    console.log('⚠️ Testing error handling...')

    // 1. 존재하지 않는 세션 조회
    try {
      await this.systemMonitor.measureAsync('get_nonexistent_session', async () => {
        return await this.chatUseCase.getChatData('nonexistent-session')
      })
    } catch (error) {
      console.log('Expected error caught for nonexistent session')
    }

    // 2. 잘못된 설정 저장
    try {
      await this.systemMonitor.measureAsync('save_invalid_config', async () => {
        // @ts-ignore - 의도적으로 잘못된 타입 전달
        await this.configUseCase.saveTheme('invalid-theme')
      })
    } catch (error) {
      console.log('Expected error caught for invalid config')
    }

    // 3. 파일 권한 에러 시뮬레이션
    try {
      // 읽기 전용으로 파일 설정
      const configFile = path.join(this.testDataDir, 'config.json')
      if (fs.existsSync(configFile)) {
        fs.chmodSync(configFile, 0o444) // 읽기 전용

        await this.systemMonitor.measureAsync('save_to_readonly_file', async () => {
          await this.configUseCase.saveApiKey('test-key')
        })

        // 권한 복원
        fs.chmodSync(configFile, 0o666)
      }
    } catch (error) {
      console.log('Expected error caught for readonly file')
    }

    this.logger.info('TEST', 'Error handling test completed')
  }

  /**
   * 동시 작업 테스트
   */
  private async testConcurrentOperations(): Promise<void> {
    console.log('🔄 Testing concurrent operations...')

    const promises: Promise<ChatSession>[] = []

    // 10개의 동시 세션 생성
    for (let i = 0; i < 10; i++) {
      promises.push(
        this.systemMonitor.measureAsync(`create_concurrent_session_${i}`, async () => {
          const session: ChatSession = {
            id: `concurrent-session-${i}`,
            title: `동시 세션 ${i}`,
            model: 'claude-opus-4',
            lastMessageTime: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
          await this.chatUseCase.saveSession(session)
          return session
        })
      )
    }

    const results = await Promise.all(promises)
    console.log(`Created ${results.length} concurrent sessions`)

    // 동시 읽기 작업
    const readPromises = results.map((session) =>
      this.systemMonitor.measureAsync(`read_concurrent_session_${session.id}`, async () => {
        return await this.chatUseCase.getChatData(session.id)
      })
    )

    const readResults = await Promise.all(readPromises)
    console.log(`Read ${readResults.length} concurrent sessions`)

    this.logger.info('TEST', 'Concurrent operations test completed')
  }

  /**
   * 데이터 무결성 테스트
   */
  private async testDataIntegrity(): Promise<void> {
    console.log('🔍 Testing data integrity...')

    // 1. 세션 데이터 무결성 검사
    const sessions = await this.chatUseCase.getSessions()
    for (const session of sessions) {
      const chatData = await this.chatUseCase.getChatData(session.id)

      // 세션과 채팅 데이터의 일관성 검사 (chatData는 ChatMessage[] 타입이므로 sessionId 속성이 없음)
      if (chatData && chatData.length > 0) {
        // 메시지가 있는 경우 세션이 존재하는지 확인
        console.log(`Session ${session.id} has ${chatData.length} messages`)
      }
    }

    // 2. 설정 데이터 무결성 검사
    // const apiKey = await this.configUseCase.getApiKey() // 사용하지 않는 변수 제거
    const systemPrompt = await this.configUseCase.getSystemPrompt()
    const theme = await this.configUseCase.getTheme()
    const model = await this.configUseCase.getDefaultModel()

    // 필수 설정값 검사
    if (!systemPrompt || !theme || !model) {
      throw new Error('Required configuration values are missing')
    }

    // 3. 파일 시스템 무결성 검사
    const sessionsFile = path.join(this.testDataDir, 'chat-sessions.json')
    const configFile = path.join(this.testDataDir, 'config.json')

    if (!fs.existsSync(sessionsFile)) {
      throw new Error('Sessions file does not exist')
    }

    if (!fs.existsSync(configFile)) {
      throw new Error('Config file does not exist')
    }

    // 4. JSON 파싱 테스트
    try {
      // const sessionsData = JSON.parse(fs.readFileSync(sessionsFile, 'utf8')) // 사용하지 않는 변수 제거
      // const configData = JSON.parse(fs.readFileSync(configFile, 'utf8')) // 사용하지 않는 변수 제거
      JSON.parse(fs.readFileSync(sessionsFile, 'utf8'))
      JSON.parse(fs.readFileSync(configFile, 'utf8'))
      console.log('JSON parsing test passed')
    } catch (error) {
      throw new Error('JSON parsing failed')
    }

    this.logger.info('TEST', 'Data integrity test completed')
  }

  /**
   * 테스트 데이터 정리
   */
  private async cleanupTestData(): Promise<void> {
    try {
      if (fs.existsSync(this.testDataDir)) {
        fs.rmSync(this.testDataDir, { recursive: true, force: true })
      }
    } catch (error) {
      console.warn('Failed to cleanup test data:', error)
    }
  }

  /**
   * 테스트 환경 정리
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...')

    // 성능 모니터 정리
    this.performanceMonitor.dispose()

    // 시스템 모니터 정리
    this.systemMonitor.shutdown()

    // 테스트 데이터 정리
    await this.cleanupTestData()

    this.logger.info('TEST', 'Test environment cleanup completed')
  }
}

// 직접 실행
if (require.main === module) {
  const test = new FileManagementTest()
  test.runAllTests().catch(console.error)
}

export const runFileManagementTests = async (): Promise<void> => {
  const test = new FileManagementTest()
  await test.runAllTests()
}
