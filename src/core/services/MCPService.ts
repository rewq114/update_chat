// core/services/MCPService.ts
import { MCPTool, MCPToolCall, MCPToolResult } from '../entities/Config'

export interface MCPService {
  // 도구 관리
  listAllTools(): Promise<MCPTool[]>
  listToolsByServer(): Promise<Record<string, MCPTool[]>>
  getHChatTools(): Promise<any[]>

  // 도구 실행
  callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<Record<string, unknown>>
  processToolCall(toolCall: MCPToolCall): Promise<MCPToolResult>
  callHChatTool(hchatToolCall: {
    name: string
    arguments: Record<string, unknown>
  }): Promise<string>

  // 서버 관리
  loadFromConfig(config: Record<string, unknown>): Promise<void>
  getServerStatus(): Promise<Record<string, boolean>>
}
