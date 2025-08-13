import { contextBridge, ipcRenderer } from 'electron'
import { FrontendAPI, LLMRequestData, MCPToolCall, ChatRenameRequest, MCPConfig } from '../types/api'

const api: FrontendAPI = {
  // LLM 관련
  llmStreamRequest: (data: LLMRequestData) => ipcRenderer.invoke('llm-stream-request', data),
  onStreamChunk: (callback) => ipcRenderer.on('llm-stream-chunk', (_, data) => callback(data)),
  onStreamComplete: (callback) => ipcRenderer.on('llm-stream-complete', (_, data) => callback(data)),
  onStreamError: (callback) => ipcRenderer.on('llm-stream-error', (_, data) => callback(data)),
  removeAllStreamListeners: () => {
    ipcRenderer.removeAllListeners('llm-stream-chunk');
    ipcRenderer.removeAllListeners('llm-stream-complete');
    ipcRenderer.removeAllListeners('llm-stream-error');
  },
  
  // MCP 관련
  mcpListTools: () => ipcRenderer.invoke('mcp-list-tools'),
  mcpCallTool: (toolCall: MCPToolCall) => ipcRenderer.invoke('mcp-call-tool', toolCall),
  
  // 채팅 관련
  getChatSessions: () => ipcRenderer.invoke('get-chat-sessions'),
  getChatData: (sessionId: string) => ipcRenderer.invoke('get-chat-data', sessionId),
  saveChatSession: (session) => ipcRenderer.invoke('save-chat-session', session),
  saveChatData: (chatData) => ipcRenderer.invoke('save-chat-data', chatData),
  deleteChatSession: (sessionId: string) => ipcRenderer.invoke('delete-chat-session', sessionId),
  renameChatSession: (request: ChatRenameRequest) => ipcRenderer.invoke('rename-chat-session', request),
  
  // 설정 관련
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getSystemPrompt: () => ipcRenderer.invoke('get-system-prompt'),
  saveSystemPrompt: (systemPrompt: string) => ipcRenderer.invoke('save-system-prompt', systemPrompt),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme) => ipcRenderer.invoke('save-theme', theme),
  getDefaultModel: () => ipcRenderer.invoke('get-default-model'),
  saveDefaultModel: (model: string) => ipcRenderer.invoke('save-default-model', model),
  saveMCPConfig: (mcpConfig: MCPConfig) => ipcRenderer.invoke('save-mcp-config', mcpConfig),
  
  // 마이그레이션 관련
  getMigrationStatus: () => ipcRenderer.invoke('get-migration-status'),
  runMigration: () => ipcRenderer.invoke('run-migration'),
}

contextBridge.exposeInMainWorld('api', api)
