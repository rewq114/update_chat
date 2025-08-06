// index.ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { HChatProvider } from './hchatAdapter'
import { MCPManager } from './mcpClient'
import { FileManager } from './fileManager'
import { ChatManager } from './chatManager'
import { ConfigManager } from './configManager'

// Force UTF-8 encoding for console output
process.stdout.setDefaultEncoding('utf8');
process.stderr.setDefaultEncoding('utf8');

let mcpManager: MCPManager | null = null;
let chatManager: ChatManager | null = null;
let configManager: ConfigManager | null = null;

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

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 매니저 클래스들 초기화
  const fileManager = new FileManager();
  
  try {
    // 설정 파일 읽기
    const systemConfig = fileManager.readSystemConfig();
    const mcpConfig = fileManager.readMCPConfig();

    // HChatProvider 인스턴스 생성
    const hchatProvider = new HChatProvider(systemConfig['api-key']);

    // MCP Manager 초기화
    console.log('🚀 MCP Manager initializing...')
    mcpManager = new MCPManager();
    await mcpManager.loadFromConfig(mcpConfig);
    console.log('✅ MCP Manager initialized')
    
    // 사용 가능한 도구 목록 출력
    const tools = await mcpManager.listAllTools();
    console.log('🔍 available tools:', tools);

    // ChatManager 초기화
    chatManager = new ChatManager(fileManager, hchatProvider, mcpManager);
    
    // ConfigManager 초기화
    configManager = new ConfigManager(fileManager);

  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }

  // MCP 도구 목록 조회 핸들러
  ipcMain.handle('mcp-list-tools', async () => {
    if (!mcpManager) {
      return { success: false, error: 'MCP Manager is not initialized' }
    }
    
    try {
      const tools = await mcpManager.listAllTools()
      return { success: true, tools }
    } catch (error) {
      console.error('❌ MCP tools list retrieval failed:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // MCP 도구 실행 핸들러
  ipcMain.handle('mcp-call-tool', async (_event, { serverName, toolName, args }) => {
    if (!mcpManager) {
      return { success: false, error: 'MCP Manager is not initialized' }
    }
    
    try {
      const result = await mcpManager.callTool(serverName, toolName, args)
      return { success: true, result }
    } catch (error) {
      console.error('❌ MCP tool execution failed:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // LLM 요청 핸들러
  ipcMain.handle('llm-request', async (_event, data) => {
    if (!chatManager) {
      return 'ChatManager is not initialized'
    }

    const response = await chatManager.processChatRequest(data);
    
    if (response.success) {
      return response.content;
    } else {
      return `An error occurred: ${response.error}`;
    }
  })

  // 채팅 로그 조회 핸들러
  ipcMain.handle('get-chat-log', async (_event) => {
    if (!chatManager) {
      return [];
    }
    return chatManager.getChatLog();
  })

  // 채팅 목록 저장 핸들러
  ipcMain.handle('save-chat-log', async (_event, chatList) => {
    if (!chatManager) {
      return { success: false, error: 'ChatManager is not initialized' }
    }
    return chatManager.saveChatList(chatList);
  })

  // 채팅 삭제 핸들러
  ipcMain.handle('delete-chat', async (_event, chatId) => {
    if (!chatManager) {
      return { success: false, error: 'ChatManager is not initialized' }
    }
    return chatManager.deleteChat(chatId);
  })

  // 채팅 이름 변경 핸들러
  ipcMain.handle('rename-chat', async (_event, { chatId, newName }) => {
    if (!chatManager) {
      return { success: false, error: 'ChatManager is not initialized' }
    }
    return chatManager.renameChat(chatId, newName);
  })

  // API 키 조회 핸들러
  ipcMain.handle('get-api-key', async (_event) => {
    if (!configManager) {
      return null;
    }
    return configManager.getApiKey();
  })

  // API 키 저장 핸들러
  ipcMain.handle('save-api-key', async (_event, apiKey) => {
    if (!configManager) {
      return { success: false, error: 'ConfigManager is not initialized' }
    }
    return configManager.saveApiKey(apiKey);
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
