// index.ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 새로운 아키텍처 import
import { FileChatRepository } from '../platform/electron/repositories/FileChatRepository'
import { FileConfigRepository } from '../platform/electron/repositories/FileConfigRepository'
import { HChatLLMService } from '../services/LLM/HChatLLMService'
import { MCPManagerService } from '../services/MCP/MCPManagerService'
import { SystemInitializer, SystemComponents } from '../core/system/SystemInitializer'
import * as path from 'path'
import { Logger } from '../core/logging/Logger'

// Force UTF-8 encoding for console output
process.stdout.setDefaultEncoding('utf8')
process.stderr.setDefaultEncoding('utf8')

// 시스템 컴포넌트들
let systemComponents: SystemComponents | null = null
let systemInitializer: SystemInitializer | null = null

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function initializeSystem(): Promise<void> {
  console.log('🔄 Initializing system services...')

  try {
    // 플랫폼별 리포지토리 및 서비스 초기화
    const appDataDir = path.join(app.getPath('userData'), 'data')

    // 임시 로거 생성 (SystemInitializer에서 교체됨)
    const tempLogger = new Logger({
      level: 1, // INFO
      enableConsole: true,
      enableFile: false,
      logDir: path.join(appDataDir, 'logs'),
      maxFileSize: 10,
      maxFiles: 5
    })

    const chatRepository = new FileChatRepository(appDataDir, tempLogger)
    const configRepository = new FileConfigRepository(appDataDir, tempLogger)
    const llmService = new HChatLLMService()
    const mcpService = new MCPManagerService()

    // 시스템 초기화기 생성
    systemInitializer = new SystemInitializer(
      chatRepository,
      configRepository,
      llmService,
      mcpService,
      appDataDir
    )

    // 시스템 초기화 실행
    const result = await systemInitializer.initialize()

    if (result.success) {
      systemComponents = result.components!
      console.log('✅ System initialization completed successfully')

      // 경고사항 출력
      if (result.warnings.length > 0) {
        console.log('⚠️ Warnings during initialization:')
        result.warnings.forEach((warning) => console.log(`  - ${warning}`))
      }
    } else {
      console.error('❌ System initialization failed:')
      result.errors.forEach((error) => console.error(`  - ${error}`))
      throw new Error('System initialization failed')
    }
  } catch (error) {
    console.error('❌ Critical system initialization error:', error)
    throw error
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.update-chat')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  await initializeSystem()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// ============================================================================
// IPC 핸들러들 (기존과 동일한 인터페이스 유지)
// ============================================================================

// MCP 도구 목록 조회 핸들러
ipcMain.handle('mcp-list-tools', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    const tools = await systemComponents.systemMonitor.measureAsync(
      'mcp_list_tools',
      async () => {
        return await systemComponents!.mcpService.listAllTools()
      },
      { operation: 'mcp_list_tools' }
    )

    return { success: true, tools }
  } catch (error) {
    console.error('❌ MCP tools list retrieval failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// MCP 도구 실행 핸들러
ipcMain.handle('mcp-call-tool', async (_, { serverName, toolName, args }) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    const result = await systemComponents.systemMonitor.measureAsync(
      'mcp_call_tool',
      async () => {
        return await systemComponents!.mcpService.callTool(serverName, toolName, args)
      },
      { serverName, toolName, args }
    )

    return { success: true, result }
  } catch (error) {
    console.error('❌ MCP tool execution failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// LLM 스트리밍 요청 핸들러
ipcMain.handle('llm-stream-request', async (event, data) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    const callback = {
      onChunk: (chunk: string, fullResponse: string) => {
        event.sender.send('llm-stream-chunk', { chunk, fullResponse })
      },
      onComplete: (fullResponse: string) => {
        event.sender.send('llm-stream-complete', { content: fullResponse })
      },
      onError: (error: string) => {
        event.sender.send('llm-stream-error', { error })
      }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'llm_stream_request',
      async () => {
        return await systemComponents!.chatUseCase.processStreamingRequest(data, callback)
      },
      { model: data.model, messageLength: data.messages?.length || 0 }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ LLM streaming request failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

// 채팅 세션 조회 핸들러
ipcMain.handle('get-chat-sessions', async () => {
  try {
    if (!systemComponents) {
      return []
    }

    // 성능 모니터링 적용
    const sessions = await systemComponents.systemMonitor.measureAsync(
      'get_chat_sessions',
      async () => {
        return await systemComponents!.chatUseCase.getSessions()
      }
    )

    return sessions
  } catch (error) {
    console.error('❌ Get chat sessions failed:', error)
    return []
  }
})

// 채팅 데이터 조회 핸들러
ipcMain.handle('get-chat-data', async (_, sessionId: string) => {
  try {
    if (!systemComponents) {
      return null
    }

    // 성능 모니터링 적용
    const chatData = await systemComponents.systemMonitor.measureAsync(
      'get_chat_data',
      async () => {
        return await systemComponents!.chatUseCase.getChatData(sessionId)
      },
      { sessionId }
    )

    return chatData
  } catch (error) {
    console.error('❌ Get chat data failed:', error)
    return null
  }
})

// 채팅 세션 저장 핸들러
ipcMain.handle('save-chat-session', async (_, session) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_chat_session',
      async () => {
        return await systemComponents!.chatUseCase.saveSession(session)
      },
      { sessionId: session.id, title: session.title }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save chat session failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 채팅 데이터 저장 핸들러
ipcMain.handle('save-chat-data', async (_, chatData) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_chat_data',
      async () => {
        return await systemComponents!.chatUseCase.saveChatData(chatData)
      },
      {
        sessionId: chatData.sessionId,
        messageCount: chatData.messages?.length || 0
      }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save chat data failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 채팅 세션 삭제 핸들러
ipcMain.handle('delete-chat-session', async (_, sessionId: string) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'delete_chat_session',
      async () => {
        return await systemComponents!.chatUseCase.deleteSession(sessionId)
      },
      { sessionId }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Delete chat session failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 채팅 세션 이름 변경 핸들러
ipcMain.handle('rename-chat-session', async (_, { sessionId, newTitle }) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'rename_chat_session',
      async () => {
        return await systemComponents!.chatUseCase.updateSessionTitle(sessionId, newTitle)
      },
      { sessionId, newTitle }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Rename chat session failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// API 키 조회 핸들러
ipcMain.handle('get-api-key', async () => {
  try {
    if (!systemComponents) {
      return null
    }

    // 성능 모니터링 적용
    const apiKey = await systemComponents.systemMonitor.measureAsync('get_api_key', async () => {
      return await systemComponents!.configUseCase.getApiKey()
    })

    return apiKey
  } catch (error) {
    console.error('❌ Get API key failed:', error)
    return null
  }
})

// API 키 저장 핸들러
ipcMain.handle('save-api-key', async (_, apiKey: string) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_api_key',
      async () => {
        await systemComponents!.configUseCase.saveApiKey(apiKey)
        // LLM 서비스에 새로운 API 키 설정
        systemComponents!.llmService.setApiKey(apiKey)
      },
      { hasApiKey: !!apiKey }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save API key failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// System Prompt 조회 핸들러
ipcMain.handle('get-system-prompt', async () => {
  try {
    if (!systemComponents) {
      return 'You are a helpful assistant.'
    }

    // 성능 모니터링 적용
    const systemPrompt = await systemComponents.systemMonitor.measureAsync(
      'get_system_prompt',
      async () => {
        return await systemComponents!.configUseCase.getSystemPrompt()
      }
    )

    return systemPrompt
  } catch (error) {
    console.error('❌ Get system prompt failed:', error)
    return 'You are a helpful assistant.'
  }
})

// System Prompt 저장 핸들러
ipcMain.handle('save-system-prompt', async (_, systemPrompt: string) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_system_prompt',
      async () => {
        return await systemComponents!.configUseCase.saveSystemPrompt(systemPrompt)
      },
      { promptLength: systemPrompt.length }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save system prompt failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// Theme 조회 핸들러
ipcMain.handle('get-theme', async () => {
  try {
    if (!systemComponents) {
      return 'system'
    }

    // 성능 모니터링 적용
    const theme = await systemComponents.systemMonitor.measureAsync('get_theme', async () => {
      return await systemComponents!.configUseCase.getTheme()
    })

    return theme
  } catch (error) {
    console.error('❌ Get theme failed:', error)
    return 'system'
  }
})

// Theme 저장 핸들러
ipcMain.handle('save-theme', async (_, theme: 'light' | 'dark' | 'system') => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_theme',
      async () => {
        return await systemComponents!.configUseCase.saveTheme(theme)
      },
      { theme }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save theme failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// Default Model 조회 핸들러
ipcMain.handle('get-default-model', async () => {
  try {
    if (!systemComponents) {
      return 'claude-opus-4'
    }

    // 성능 모니터링 적용
    const model = await systemComponents.systemMonitor.measureAsync(
      'get_default_model',
      async () => {
        return await systemComponents!.configUseCase.getDefaultModel()
      }
    )

    return model
  } catch (error) {
    console.error('❌ Get default model failed:', error)
    return 'claude-opus-4'
  }
})

// Default Model 저장 핸들러
ipcMain.handle('save-default-model', async (_, model: string) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_default_model',
      async () => {
        return await systemComponents!.configUseCase.saveDefaultModel(model)
      },
      { model }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save default model failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// MCP Config 저장 핸들러
ipcMain.handle('save-mcp-config', async (_, mcpConfig) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    await systemComponents.systemMonitor.measureAsync(
      'save_mcp_config',
      async () => {
        await systemComponents!.configUseCase.saveMCPConfig(mcpConfig)
        await systemComponents!.mcpService.loadFromConfig(mcpConfig)
      },
      {
        hasConfig: !!mcpConfig,
        serverCount: mcpConfig?.servers?.length || 0
      }
    )

    return { success: true }
  } catch (error) {
    console.error('❌ Save MCP config failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 마이그레이션 상태 조회 핸들러
ipcMain.handle('get-migration-status', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    const status = await systemComponents.systemMonitor.measureAsync(
      'get_migration_status',
      async () => {
        return await systemComponents!.chatUseCase.getMigrationStatus()
      }
    )

    return { success: true, status }
  } catch (error) {
    console.error('❌ Migration status check failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

// 수동 마이그레이션 실행 핸들러
ipcMain.handle('run-migration', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 적용
    const result = await systemComponents.systemMonitor.measureAsync('run_migration', async () => {
      return await systemComponents!.chatUseCase.migrate()
    })

    return { success: true, result }
  } catch (error) {
    console.error('❌ Manual migration failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

// ============================================================================
// 성능 모니터링 IPC 핸들러들
// ============================================================================

// 성능 리포트 조회 핸들러
ipcMain.handle('get-performance-report', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    const report = systemComponents.systemMonitor.generatePerformanceReport()
    return { success: true, report }
  } catch (error) {
    console.error('❌ Get performance report failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 시스템 헬스 상태 조회 핸들러
ipcMain.handle('get-system-health', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    const health = systemComponents.systemMonitor.getSystemHealth()
    return { success: true, health }
  } catch (error) {
    console.error('❌ Get system health failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 에러 통계 조회 핸들러
ipcMain.handle('get-error-stats', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    const errorStats = systemComponents.systemMonitor.getErrorStats()
    return { success: true, errorStats }
  } catch (error) {
    console.error('❌ Get error stats failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 시스템 메트릭 조회 핸들러
ipcMain.handle('get-system-metrics', async () => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    const metrics = systemComponents.systemMonitor.getSystemMetrics()
    return { success: true, metrics }
  } catch (error) {
    console.error('❌ Get system metrics failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

// 성능 모니터링 설정 변경 핸들러
ipcMain.handle('update-performance-config', async (_, config) => {
  try {
    if (!systemComponents) {
      return { success: false, error: 'System not initialized' }
    }

    // 성능 모니터링 설정 업데이트
    systemComponents.systemMonitor.setLogLevel(config.logLevel || 1)

    return { success: true }
  } catch (error) {
    console.error('❌ Update performance config failed:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
