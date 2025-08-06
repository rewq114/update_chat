// chatManager.ts
import { FileManager, ChatSession, ChatMessage } from './fileManager';
import { HChatProvider, Agent, Message } from './hchatAdapter';
import { MCPManager } from './mcpClient';

export interface ChatRequest {
  chatId?: string;
  messages: any[];
  system?: string;
  model: string;
  enableMCP?: boolean;
}

export interface ChatResponse {
  content: string;
  success: boolean;
  error?: string;
}

export class ChatManager {
  private fileManager: FileManager;
  private hchatProvider: HChatProvider;
  private mcpManager: MCPManager | null = null;

  constructor(fileManager: FileManager, hchatProvider: HChatProvider, mcpManager?: MCPManager) {
    this.fileManager = fileManager;
    this.hchatProvider = hchatProvider;
    this.mcpManager = mcpManager || null;
  }

  async processChatRequest(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Agent 생성
      const agent: Agent = {
        name: 'default-agent',
        description: request.system || 'You are a helpful assistant.',
        preferredModel: request.model
      };

      // 메시지 형식 변환
      const messages: Message[] = this.normalizeMessages(request.messages);

      // MCP 도구 가져오기
      let tools: any = [];
      if (this.mcpManager && request.enableMCP) {
        tools = await this.mcpManager.listAllTools();
      }

      // LLM 호출
      const response = await this.hchatProvider.chat(agent, messages, tools);

      // 채팅 로그 업데이트
      await this.updateChatLog(request.chatId || 'default-chat', request.messages, response.content);

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

  private normalizeMessages(messages: any[]): Message[] {
    return messages
      .filter((msg: any) => msg && (msg.content || msg.text))
      .map((msg: any) => ({
        role: msg.role || 'user',
        content: String(msg.content || msg.text || '')
      }));
  }

  private async updateChatLog(chatId: string, userMessages: any[], assistantResponse: string): Promise<void> {
    try {
      let chatLogs = this.fileManager.readChatLog();

      // 채팅 세션 찾기 또는 생성
      let targetChat = this.fileManager.findChatSession(chatLogs, chatId);
      
      if (!targetChat) {
        targetChat = this.fileManager.createNewChatSession(chatLogs, chatId);
        chatLogs.push(targetChat);
      }

      // 마지막 사용자 메시지 추가
      const lastUserMessage = userMessages[userMessages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const messageExists = targetChat.messages.some(
          (msg: ChatMessage) => msg.text === (lastUserMessage.content || lastUserMessage.text) && msg.role === 'user'
        );
        
        if (!messageExists) {
          this.fileManager.addMessageToChat(targetChat, {
            idx: Date.now(),
            text: lastUserMessage.content || lastUserMessage.text,
            role: 'user'
          });
        }
      }

      // 어시스턴트 응답 추가
      this.fileManager.addMessageToChat(targetChat, {
        idx: Date.now() + 1,
        text: assistantResponse,
        role: 'assistant'
      });

      // 파일에 저장
      this.fileManager.saveChatLog(chatLogs);
      console.log(`💾 Chat log updated: ${chatId}`);
      
    } catch (error) {
      console.error('❌ Chat log update failed:', error);
      throw error;
    }
  }

  // 채팅 로그 조회
  getChatLog(): ChatSession[] {
    try {
      return this.fileManager.readChatLog();
    } catch (error) {
      console.error('❌ Chat log read failed:', error);
      return this.fileManager.getDefaultChatSession();
    }
  }

  // 채팅 삭제
  deleteChat(chatId: string): { success: boolean; chats?: ChatSession[]; error?: string } {
    try {
      let chatLogs = this.fileManager.readChatLog();
      const filteredChats = chatLogs.filter(chat => chat.id !== chatId);
      
      this.fileManager.saveChatLog(filteredChats);
      console.log(`🗑️ Chat deleted: ${chatId}`);
      
      return { success: true, chats: filteredChats };
    } catch (error) {
      console.error('❌ Chat delete failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // 채팅 이름 변경
  renameChat(chatId: string, newName: string): { success: boolean; chats?: ChatSession[]; error?: string } {
    try {
      let chatLogs = this.fileManager.readChatLog();
      const updatedChats = chatLogs.map(chat => 
        chat.id === chatId 
          ? { ...chat, name: newName.trim() }
          : chat
      );
      
      this.fileManager.saveChatLog(updatedChats);
      console.log(`✏️ Chat name changed: ${chatId} -> ${newName}`);
      
      return { success: true, chats: updatedChats };
    } catch (error) {
      console.error('❌ Chat name change failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // 채팅 목록 저장
  saveChatList(chatList: ChatSession[]): { success: boolean; error?: string } {
    try {
      this.fileManager.saveChatLog(chatList);
      return { success: true };
    } catch (error) {
      console.error('❌ Chat list save failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
} 