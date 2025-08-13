// core/entities/Config.ts
export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
  apiKey: string;
  systemPrompt: string;
  theme: Theme;
  defaultModel: string;
  mcpConfig?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

export interface MCPToolCall {
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}
