// ============================================================================
// API 인터페이스 타입 정의
// ============================================================================

// ============================================================================
// LLM (Large Language Model) 관련 인터페이스
// ============================================================================

export interface LLMRequestData {
  messages: ChatMessage[]
  model?: string
  stream?: boolean
  thinking?: boolean
  tools?: string[] // MCP 서버 이름 배열
}

export interface LLMResponse {
  success: boolean
  content?: string
  error?: string
}

export interface LLMStreamChunk {
  chunk: string
  fullResponse: string
}

export interface LLMStreamComplete {
  content: string
}

export interface LLMStreamError {
  error: string
}

export interface StreamingCallback {
  onChunk: (chunk: string, fullResponse: string) => void
  onComplete: (fullResponse: string) => void
  onError: (error: string) => void
}

// ============================================================================
// MCP (Model Context Protocol) 관련 인터페이스
// ============================================================================

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName: string
}

export interface MCPToolCall {
  serverName: string
  toolName: string
  args: Record<string, unknown>
}

export interface MCPToolResult {
  success: boolean
  result?: Record<string, unknown>
  error?: string
}

export interface MCPToolsList {
  success: boolean
  tools?: MCPTool[]
  error?: string
}

// ============================================================================
// 채팅 관련 인터페이스
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  time: number
  type: 'text' | 'image' | 'file' | 'tool_call'
  content: string
}

export interface ChatSession {
  id: string
  title: string
  model: string
  lastMessageTime: number
  createdAt: number
  updatedAt: number
}

export interface ChatData {
  sessionId: string
  messages: ChatMessage[]
}

export interface ChatSessionList {
  sessions: ChatSession[]
  activeSessionId: string | null
}

export interface ChatOperation {
  success: boolean
  error?: string
}

export interface ChatRenameRequest {
  sessionId: string
  newTitle: string
}

// ============================================================================
// 설정 관련 인터페이스
// ============================================================================

export type Theme = 'light' | 'dark' | 'system'

export interface ConfigOperation {
  success: boolean
  error?: string
}

export interface APIConfig {
  apiKey: string
}

export interface SystemPromptConfig {
  systemPrompt: string
}

export interface ModelConfig {
  defaultModel: string
}

export interface ThemeConfig {
  theme: Theme
}

export interface MCPConfig {
  servers: Record<string, unknown>[]
}

// ============================================================================
// IPC 핸들러 응답 타입
// ============================================================================

export interface IPCResponse<T = Record<string, unknown>> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// 프론트엔드 API 인터페이스
// ============================================================================

export interface FrontendAPI {
  // LLM 관련
  llmStreamRequest: (data: LLMRequestData) => Promise<IPCResponse>
  onStreamChunk: (callback: (data: LLMStreamChunk) => void) => void
  onStreamComplete: (callback: (data: LLMStreamComplete) => void) => void
  onStreamError: (callback: (data: LLMStreamError) => void) => void
  removeAllStreamListeners: () => void

  // MCP 관련
  mcpListTools: () => Promise<MCPToolsList>
  mcpCallTool: (toolCall: MCPToolCall) => Promise<MCPToolResult>

  // 채팅 관련
  getChatSessions: () => Promise<ChatSession[]>
  getChatData: (sessionId: string) => Promise<ChatData>
  saveChatSession: (session: ChatSession) => Promise<ChatOperation>
  saveChatData: (chatData: ChatData) => Promise<ChatOperation>
  deleteChatSession: (sessionId: string) => Promise<ChatOperation>
  renameChatSession: (request: ChatRenameRequest) => Promise<ChatOperation>

  // 설정 관련
  getApiKey: () => Promise<string | null>
  saveApiKey: (apiKey: string) => Promise<ConfigOperation>
  getSystemPrompt: () => Promise<string>
  saveSystemPrompt: (systemPrompt: string) => Promise<ConfigOperation>
  getTheme: () => Promise<Theme>
  saveTheme: (theme: Theme) => Promise<ConfigOperation>
  getDefaultModel: () => Promise<string>
  saveDefaultModel: (model: string) => Promise<ConfigOperation>
  saveMCPConfig: (mcpConfig: MCPConfig) => Promise<ConfigOperation>

  // 마이그레이션 관련
  getMigrationStatus: () => Promise<IPCResponse<MigrationStatus>>
  runMigration: () => Promise<IPCResponse<MigrationResult>>
}

// ============================================================================
// 백엔드 매니저 인터페이스 (레거시 - 삭제됨)
// ============================================================================

// 이전 매니저 인터페이스들은 새로운 Repository/UseCase 패턴으로 대체되었습니다.
// ChatManagerInterface → ChatUseCase
// ConfigManagerInterface → ConfigUseCase
// MCPManagerInterface → MCPManagerService

// ============================================================================
// 마이그레이션 관련 인터페이스
// ============================================================================

export interface MigrationStatus {
  needsMigration: boolean
  hasLegacyData: boolean
  hasNewStructure: boolean
  legacyFileCount?: number
}

export interface MigrationResult {
  success: boolean
  migratedCount: number
  error?: string
}
