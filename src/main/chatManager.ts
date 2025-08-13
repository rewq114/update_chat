// chatManager.ts
import { FileManager } from './fileManager';
import { HChatProvider, Agent } from './hchatAdapter';
import { MCPManager } from './mcpClient';
import { 
  ChatManagerInterface, 
  LLMRequestData, 
  LLMResponse, 
  StreamingCallback, 
  ChatSession, 
  ChatData,
  ChatOperation,
  ChatMessage
} from '../types/api';

export class ChatManager implements ChatManagerInterface {
  private fileManager: FileManager;
  private hchatProvider: HChatProvider;
  private mcpManager: MCPManager | null = null;

  constructor(fileManager: FileManager, hchatProvider: HChatProvider, mcpManager?: MCPManager) {
    this.fileManager = fileManager;
    this.hchatProvider = hchatProvider;
    this.mcpManager = mcpManager || null;
  }

  async processChatRequest(request: LLMRequestData): Promise<LLMResponse> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      };

      // 메시지 형식 변환 (SDK 형식에 맞게)
      const messages: ChatMessage[] = this.normalizeMessages(request.messages);

      // MCP 도구 가져오기
      let tools: Record<string, unknown> = {};
      if (this.mcpManager && request.tools && request.tools.length > 0) {
        // 선택된 서버들의 도구들을 가져와서 Record로 변환
        const allToolsByServer = await this.mcpManager.listAllTools();
        const selectedTools: unknown[] = [];
        
        // 선택된 서버들의 도구들을 수집
        request.tools.forEach(serverName => {
          if (allToolsByServer[serverName]) {
            selectedTools.push(...allToolsByServer[serverName]);
          }
        });
        
        tools = selectedTools.reduce((acc: Record<string, unknown>, tool) => {
          acc[(tool as { name: string }).name] = tool;
          return acc;
        }, {} as Record<string, unknown>);
      }

      // LLM 호출
      const response = await this.hchatProvider.chat(agent, messages, tools);

      return {
        content: response.content,
        success: true
      };
    } catch (error) {
      console.error('❌ Chat request processing failed:', error);
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async processStreamingRequest(request: LLMRequestData, callback: StreamingCallback): Promise<void> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      };

      // 메시지 형식 변환 (SDK 형식에 맞게)
      const messages: ChatMessage[] = this.normalizeMessages(request.messages);

      // MCP 도구 가져오기
      let tools: Record<string, unknown> = {};
      if (this.mcpManager && request.tools && request.tools.length > 0) {
        // 선택된 서버들의 도구들을 가져와서 Record로 변환
        const allToolsByServer = await this.mcpManager.listAllTools();
        const selectedTools: unknown[] = [];
        
        // 선택된 서버들의 도구들을 수집
        request.tools.forEach(serverName => {
          if (allToolsByServer[serverName]) {
            selectedTools.push(...allToolsByServer[serverName]);
          }
        });
        
        tools = selectedTools.reduce((acc: Record<string, unknown>, tool) => {
          acc[(tool as { name: string }).name] = tool;
          return acc;
        }, {} as Record<string, unknown>);
      }

      // 스트리밍 응답 시작
      const stream = this.hchatProvider.stream(agent, messages, tools);
      
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
        callback.onChunk(chunk, fullResponse);
      }

      callback.onComplete(fullResponse);
    } catch (error) {
      console.error('❌ Streaming request processing failed:', error);
      callback.onError(error instanceof Error ? error.message : String(error));
    }
  }

  private normalizeMessages(messages: unknown[]): ChatMessage[] {
    return messages
      .filter((msg: unknown) => msg && typeof msg === 'object' && ('content' in msg || 'text' in msg))
      .map((msg: unknown) => {
        const messageObj = msg as { role?: string; content?: string; text?: string; time?: number };
        return {
          role: this.normalizeRole(messageObj.role || 'user'),
          time: messageObj.time || Date.now(),
          type: 'text' as const,
          content: String(messageObj.content || messageObj.text || '')
        };
      });
  }

  private normalizeRole(role: string): 'system' | 'user' | 'assistant' {
    switch (role.toLowerCase()) {
      case 'system':
        return 'system';
      case 'assistant':
        return 'assistant';
      case 'user':
      default:
        return 'user';
    }
  }

  // ============================================================================
  // 채팅 세션 관리
  // ============================================================================

  getChatSessions(): ChatSession[] {
    return this.fileManager.readChatSessions();
  }

  getChatData(sessionId: string): ChatData | null {
    return this.fileManager.readChatData(sessionId);
  }

  saveChatSession(session: ChatSession): ChatOperation {
    try {
      const sessions = this.fileManager.readChatSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      this.fileManager.saveChatSessions(sessions);
      return { success: true };
    } catch (error) {
      console.error('❌ Chat session save failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  saveChatData(chatData: ChatData): ChatOperation {
    try {
      this.fileManager.saveChatData(chatData);
      return { success: true };
    } catch (error) {
      console.error('❌ Chat data save failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  deleteChatSession(sessionId: string): ChatOperation {
    try {
      this.fileManager.deleteChatSession(sessionId);
      return { success: true };
    } catch (error) {
      console.error('❌ Chat session deletion failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  renameChatSession(sessionId: string, newTitle: string): ChatOperation {
    try {
      this.fileManager.renameChatSession(sessionId, newTitle);
      return { success: true };
    } catch (error) {
      console.error('❌ Chat session rename failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
} 