// core/useCases/ChatUseCase.ts
import { ChatRepository } from '../repositories/ChatRepository';
import { LLMService } from '../services/LLMService';
import { MCPService } from '../services/MCPService';
import { ChatSession, ChatData, ChatMessage } from '../entities/ChatMessage';
import { LLMRequest, LLMResponse, StreamingCallback, Agent } from '../entities/LLM';

export class ChatUseCase {
  constructor(
    private chatRepository: ChatRepository,
    private llmService: LLMService,
    private mcpService: MCPService
  ) {}

  // 채팅 요청 처리
  async processChatRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      };

      // 메시지 정규화
      const messages = this.normalizeMessages(request.messages);

      // MCP 도구 처리
      const tools = await this.processTools(request.tools);

      // LLM 호출
      const response = await this.llmService.chat(agent, messages, tools);

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

  // 스트리밍 채팅 요청 처리
  async processStreamingRequest(request: LLMRequest, callback: StreamingCallback): Promise<void> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: 'You are a helpful assistant.',
        preferredModel: request.model || 'claude-opus-4'
      };

      // 메시지 정규화
      const messages = this.normalizeMessages(request.messages);

      // MCP 도구 처리
      const tools = await this.processTools(request.tools);

      // 스트리밍 응답 시작
      const stream = this.llmService.stream(agent, messages, tools);
      
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

  // 세션 관리
  async getSessions(): Promise<ChatSession[]> {
    return await this.chatRepository.getSessions();
  }

  async getChatData(sessionId: string): Promise<ChatData | null> {
    return await this.chatRepository.getChatData(sessionId);
  }

  async saveSession(session: ChatSession): Promise<void> {
    await this.chatRepository.saveSession(session);
  }

  async saveChatData(chatData: ChatData): Promise<void> {
    await this.chatRepository.saveChatData(chatData);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.chatRepository.deleteSession(sessionId);
  }

  async updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
    await this.chatRepository.updateSessionTitle(sessionId, newTitle);
  }

  // 마이그레이션
  async needsMigration(): Promise<boolean> {
    return await this.chatRepository.needsMigration();
  }

  async migrate(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
    return await this.chatRepository.migrate();
  }

  async getMigrationStatus() {
    return await this.chatRepository.getMigrationStatus();
  }

  // Private methods
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

  private async processTools(serverNames?: string[]): Promise<Record<string, unknown>> {
    if (!serverNames || serverNames.length === 0) {
      return {};
    }

    try {
      const allToolsByServer = await this.mcpService.listToolsByServer();
      const selectedTools: unknown[] = [];
      
      // 선택된 서버들의 도구들을 수집
      serverNames.forEach(serverName => {
        if (allToolsByServer[serverName]) {
          selectedTools.push(...allToolsByServer[serverName]);
        }
      });
      
      return selectedTools.reduce((acc: Record<string, unknown>, tool) => {
        acc[(tool as { name: string }).name] = tool;
        return acc;
      }, {} as Record<string, unknown>);
    } catch (error) {
      console.error('❌ Tool processing failed:', error);
      return {};
    }
  }
}
