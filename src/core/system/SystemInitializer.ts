// core/system/SystemInitializer.ts
import * as path from 'path'
import { ChatRepository } from '../repositories/ChatRepository'
import { ConfigRepository } from '../repositories/ConfigRepository'
import { LLMService } from '../services/LLMService'
import { MCPService } from '../services/MCPService'
import { ChatUseCase } from '../useCases/ChatUseCase'
import { ConfigUseCase } from '../useCases/ConfigUseCase'
import { AppConfig } from '../entities/Config'
import { SystemMonitor, SystemMonitorConfig } from '../monitoring/SystemMonitor'
import { LogLevel } from '../logging/Logger'

export interface SystemComponents {
  chatUseCase: ChatUseCase
  configUseCase: ConfigUseCase
  llmService: LLMService
  mcpService: MCPService
  systemMonitor: SystemMonitor
}

export interface InitializationResult {
  success: boolean
  components?: SystemComponents
  errors: string[]
  warnings: string[]
}

export interface SystemStatus {
  isInitialized: boolean
  components: {
    chatRepository: boolean
    configRepository: boolean
    llmService: boolean
    mcpService: boolean
  }
  config: {
    hasApiKey: boolean
    hasDefaultConfig: boolean
    hasMCPConfig: boolean
  }
  data: {
    hasChatSessions: boolean
    needsMigration: boolean
  }
}

export class SystemInitializer {
  private isInitialized = false
  private components?: SystemComponents
  private systemMonitor?: SystemMonitor

  constructor(
    private chatRepository: ChatRepository,
    private configRepository: ConfigRepository,
    private llmService: LLMService,
    private mcpService: MCPService,
    private appDataDir: string
  ) {}

  /**
   * 시스템 전체 초기화
   */
  async initialize(): Promise<InitializationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // 시스템 모니터 초기화
    await this.initializeSystemMonitor(errors, warnings)

    if (this.systemMonitor) {
      this.systemMonitor.info('SYSTEM_INIT', '🚀 Starting system initialization...')
    } else {
      console.log('🚀 Starting system initialization...')
    }

    try {
      // 1단계: 기본 구조 초기화
      await this.initializeBasicStructure(errors, warnings)

      // 2단계: 설정 초기화
      await this.initializeConfiguration(errors, warnings)

      // 3단계: 서비스 초기화
      await this.initializeServices(errors, warnings)

      // 4단계: 데이터 마이그레이션
      await this.initializeDataMigration(errors, warnings)

      // 5단계: Use Cases 초기화
      await this.initializeUseCases(errors, warnings)

      // 6단계: 시스템 상태 검증
      await this.validateSystemState(errors, warnings)

      if (errors.length === 0) {
        this.isInitialized = true

        if (this.systemMonitor) {
          this.systemMonitor.info('SYSTEM_INIT', '✅ System initialization completed successfully')

          // 경고사항 출력
          if (warnings.length > 0) {
            this.systemMonitor.warn('SYSTEM_INIT', '⚠️ Warnings during initialization:', {
              warnings: warnings
            })
          }
        } else {
          console.log('✅ System initialization completed successfully')

          // 경고사항 출력
          if (warnings.length > 0) {
            console.log('⚠️ Warnings during initialization:')
            warnings.forEach((warning) => console.log(`  - ${warning}`))
          }
        }

        return {
          success: true,
          components: this.components!,
          errors: [],
          warnings
        }
      } else {
        if (this.systemMonitor) {
          this.systemMonitor.error('SYSTEM_INIT', '❌ System initialization failed:', undefined, {
            errors: errors
          })
        } else {
          console.error('❌ System initialization failed:', errors)
        }

        return {
          success: false,
          errors,
          warnings
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('❌ Critical initialization error:', errorMessage)
      return {
        success: false,
        errors: [errorMessage],
        warnings
      }
    }
  }

  /**
   * 시스템 모니터 초기화
   */
  private async initializeSystemMonitor(errors: string[], _warnings: string[]): Promise<void> {
    try {
      const logDir = path.join(this.appDataDir, 'logs')
      const monitorConfig: SystemMonitorConfig = {
        logConfig: {
          level: LogLevel.INFO,
          enableConsole: true,
          enableFile: true,
          logDir,
          maxFileSize: 10, // 10MB
          maxFiles: 5
        },
        enablePerformanceMonitoring: true,
        enableErrorHandling: true,
        enableSystemMetrics: true,
        cleanupInterval: 3600000 // 1시간
      }

      this.systemMonitor = new SystemMonitor(monitorConfig)

      // Repository들에게 로거 전달
      if (this.chatRepository && 'logger' in this.chatRepository) {
        ;(this.chatRepository as any).logger = this.systemMonitor.getLogger()
      }
      if (this.configRepository && 'logger' in this.configRepository) {
        ;(this.configRepository as any).logger = this.systemMonitor.getLogger()
      }

      // MCP 서비스에 로거 전달
      if (this.mcpService && 'logger' in this.mcpService) {
        ;(this.mcpService as any).logger = this.systemMonitor.getLogger()
      }

      console.log('✅ System monitor initialized')
    } catch (error) {
      const errorMessage = `Failed to initialize system monitor: ${error}`
      errors.push(errorMessage)
      console.error('❌ System monitor initialization failed:', error)
    }
  }

  /**
   * 1단계: 기본 구조 초기화
   */
  private async initializeBasicStructure(errors: string[], _warnings: string[]): Promise<void> {
    console.log('📁 Initializing basic structure...')

    try {
      // 디렉토리 구조 확인 및 생성
      // (Repository 생성자에서 자동으로 처리됨)
      console.log('✅ Basic structure initialized')
    } catch (error) {
      const errorMessage = `Failed to initialize basic structure: ${error}`
      errors.push(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 2단계: 설정 초기화
   */
  private async initializeConfiguration(errors: string[], warnings: string[]): Promise<void> {
    console.log('⚙️ Initializing configuration...')

    try {
      const config = await this.configRepository.getConfig()

      // API 키 확인
      if (!config.apiKey || config.apiKey.trim() === '') {
        warnings.push('No API key found. Please set your API key in settings.')
      }

      // 기본 설정 확인
      if (!config.systemPrompt || !config.defaultModel) {
        console.log('⚠️ Creating default configuration...')
        await this.createDefaultConfiguration()
      }

      console.log('✅ Configuration initialized')
    } catch (error) {
      const errorMessage = `Failed to initialize configuration: ${error}`
      errors.push(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 3단계: 서비스 초기화
   */
  private async initializeServices(errors: string[], warnings: string[]): Promise<void> {
    console.log('🔧 Initializing services...')

    try {
      // LLM 서비스 초기화
      const config = await this.configRepository.getConfig()
      if (config.apiKey) {
        this.llmService.setApiKey(config.apiKey)
        console.log('✅ LLM service initialized')
      } else {
        warnings.push('LLM service not fully initialized (no API key)')
      }

      // MCP 서비스 초기화
      if (config.mcpConfig) {
        await this.mcpService.loadFromConfig(config.mcpConfig)
        console.log('✅ MCP service initialized')
      } else {
        console.log('ℹ️ No MCP configuration found')
      }
    } catch (error) {
      const errorMessage = `Failed to initialize services: ${error}`
      errors.push(errorMessage)
      // 서비스 초기화 실패는 치명적이지 않을 수 있음
      warnings.push(errorMessage)
    }
  }

  /**
   * 4단계: 데이터 마이그레이션
   */
  private async initializeDataMigration(errors: string[], _warnings: string[]): Promise<void> {
    console.log('🔄 Checking data migration...')

    try {
      const needsMigration = await this.chatRepository.needsMigration()

      if (needsMigration) {
        console.log('🔄 Running data migration...')
        const result = await this.chatRepository.migrate()

        if (result.success) {
          console.log(`✅ Migration completed: ${result.migratedCount} items migrated`)
        } else {
          errors.push(`Migration failed: ${result.error}`)
        }
      } else {
        console.log('ℹ️ No migration needed')
      }
    } catch (error) {
      const errorMessage = `Failed to check migration: ${error}`
      errors.push(errorMessage)
    }
  }

  /**
   * 5단계: Use Cases 초기화
   */
  private async initializeUseCases(errors: string[], _warnings: string[]): Promise<void> {
    if (this.systemMonitor) {
      this.systemMonitor.info('SYSTEM_INIT', '🎯 Initializing use cases...')
    } else {
      console.log('🎯 Initializing use cases...')
    }

    try {
      const chatUseCase = new ChatUseCase(this.chatRepository, this.llmService, this.mcpService)
      const configUseCase = new ConfigUseCase(this.configRepository)

      this.components = {
        chatUseCase,
        configUseCase,
        llmService: this.llmService,
        mcpService: this.mcpService,
        systemMonitor: this.systemMonitor!
      }

      if (this.systemMonitor) {
        this.systemMonitor.info('SYSTEM_INIT', '✅ Use cases initialized')
      } else {
        console.log('✅ Use cases initialized')
      }
    } catch (error) {
      const errorMessage = `Failed to initialize use cases: ${error}`
      errors.push(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 6단계: 시스템 상태 검증
   */
  private async validateSystemState(errors: string[], warnings: string[]): Promise<void> {
    console.log('🔍 Validating system state...')

    try {
      const status = await this.getSystemStatus()

      // 필수 컴포넌트 확인
      if (!status.components.configRepository) {
        errors.push('Configuration repository is not available')
      }

      if (!status.components.chatRepository) {
        errors.push('Chat repository is not available')
      }

      // 권장사항 확인
      if (!status.config.hasApiKey) {
        warnings.push('API key is not set. Some features may not work.')
      }

      if (status.data.needsMigration) {
        warnings.push('Data migration is still needed')
      }

      console.log('✅ System state validated')
    } catch (error) {
      const errorMessage = `Failed to validate system state: ${error}`
      errors.push(errorMessage)
    }
  }

  /**
   * 기본 설정 생성
   */
  private async createDefaultConfiguration(): Promise<void> {
    const defaultConfig: AppConfig = {
      apiKey: '',
      systemPrompt: 'You are a helpful assistant.',
      theme: 'system',
      defaultModel: 'claude-opus-4'
    }

    await this.configRepository.saveConfig(defaultConfig)
    console.log('✅ Default configuration created')
  }

  /**
   * 시스템 상태 조회
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const config = await this.configRepository.getConfig()
      const sessions = await this.chatRepository.getSessions()
      const needsMigration = await this.chatRepository.needsMigration()

      return {
        isInitialized: this.isInitialized,
        components: {
          chatRepository: true, // 생성자에서 확인됨
          configRepository: true, // 생성자에서 확인됨
          llmService: !!config.apiKey,
          mcpService: !!config.mcpConfig
        },
        config: {
          hasApiKey: !!(config.apiKey && config.apiKey.trim() !== ''),
          hasDefaultConfig: !!(config.systemPrompt && config.defaultModel),
          hasMCPConfig: !!config.mcpConfig
        },
        data: {
          hasChatSessions: sessions.length > 0,
          needsMigration
        }
      }
    } catch (error) {
      console.error('❌ Failed to get system status:', error)
      return {
        isInitialized: false,
        components: {
          chatRepository: false,
          configRepository: false,
          llmService: false,
          mcpService: false
        },
        config: {
          hasApiKey: false,
          hasDefaultConfig: false,
          hasMCPConfig: false
        },
        data: {
          hasChatSessions: false,
          needsMigration: false
        }
      }
    }
  }

  /**
   * 시스템 재초기화
   */
  async reinitialize(): Promise<InitializationResult> {
    console.log('🔄 Reinitializing system...')
    this.isInitialized = false
    this.components = undefined
    return await this.initialize()
  }

  /**
   * 초기화된 컴포넌트 반환
   */
  getComponents(): SystemComponents | undefined {
    if (!this.isInitialized || !this.components) {
      throw new Error('System is not initialized')
    }
    return this.components
  }

  /**
   * 초기화 상태 확인
   */
  isSystemInitialized(): boolean {
    return this.isInitialized
  }
}
