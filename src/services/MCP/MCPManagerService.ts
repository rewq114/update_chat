// services/MCP/MCPManagerService.ts
import { MCPService } from '../../core/services/MCPService';
import { MCPTool, MCPToolCall, MCPToolResult } from '../../core/entities/Config';

export class MCPManagerService implements MCPService {
  private servers: Record<string, any> = {};
  private tools: Record<string, MCPTool[]> = {};

  async listAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];
    for (const serverName in this.tools) {
      allTools.push(...this.tools[serverName]);
    }
    return allTools;
  }

  async listToolsByServer(): Promise<Record<string, MCPTool[]>> {
    return { ...this.tools };
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      // 실제 MCP 서버 호출 로직은 여기에 구현
      // 현재는 더미 응답 반환
      console.log(`🔧 Calling tool: ${serverName}.${toolName}`, args);
      return { result: `Tool ${toolName} executed successfully` };
    } catch (error) {
      console.error(`❌ Tool call failed: ${serverName}.${toolName}`, error);
      throw error;
    }
  }

  async processToolCall(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      const result = await this.callTool(toolCall.serverName, toolCall.toolName, toolCall.args);
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async loadFromConfig(config: Record<string, unknown>): Promise<void> {
    try {
      console.log('🔄 Loading MCP servers from config...');
      
      // 설정에서 서버 정보 로드
      for (const [serverName, serverConfig] of Object.entries(config)) {
        if (typeof serverConfig === 'object' && serverConfig !== null) {
          this.servers[serverName] = serverConfig;
          
          // 더미 도구 생성 (실제로는 MCP 서버에서 도구 목록을 가져와야 함)
          this.tools[serverName] = [
            {
              name: 'example_tool',
              description: 'Example tool from ' + serverName,
              inputSchema: { type: 'object', properties: {} },
              serverName
            }
          ];
        }
      }
      
      console.log(`✅ Loaded ${Object.keys(this.servers).length} MCP servers`);
    } catch (error) {
      console.error('❌ Failed to load MCP config:', error);
      throw error;
    }
  }

  async getServerStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    for (const serverName in this.servers) {
      status[serverName] = true; // 실제로는 서버 연결 상태 확인
    }
    return status;
  }
}
