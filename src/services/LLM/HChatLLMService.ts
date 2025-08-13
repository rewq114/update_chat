// services/LLM/HChatLLMService.ts
import { LLMService } from '../../core/services/LLMService';
import { Agent } from '../../core/entities/LLM';
import { HChat } from '@rewq114/h-chat-sdk';

export class HChatLLMService implements LLMService {
  private hchat: HChat | null = null;

  constructor() {
    // HChat은 API 키가 필요하므로 나중에 초기화
  }

  setApiKey(apiKey: string): void {
    this.hchat = new HChat({ apiKey });
  }

  async chat(agent: Agent, messages: any[], tools?: Record<string, unknown>): Promise<{ content: string }> {
    try {
      if (!this.hchat) {
        throw new Error('HChat not initialized. Please set API key first.');
      }
      
      // ChatRequest 형식에 맞게 변환
      const request = {
        model: agent.preferredModel,
        system: agent.description,
        content: messages,
        tools: tools ? Object.values(tools) as any[] : undefined,
        temperature: 0.7,
        max_tokens: 2000,
      };
      
      const response = await this.hchat.chat(request);
      return { content: response.content };
    } catch (error) {
      console.error('❌ HChat chat failed:', error);
      throw error;
    }
  }

  async *stream(agent: Agent, messages: any[], tools?: Record<string, unknown>): AsyncIterable<string> {
    try {
      if (!this.hchat) {
        throw new Error('HChat not initialized. Please set API key first.');
      }
      
      // ChatRequest 형식에 맞게 변환
      const request = {
        model: agent.preferredModel,
        system: agent.description,
        content: messages,
        tools: tools ? Object.values(tools) as any[] : undefined,
        temperature: 0.7,
        max_tokens: 2000,
      };
      
      const stream = this.hchat.stream(request);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      console.error('❌ HChat stream failed:', error);
      throw error;
    }
  }

  async processRequest(_request: any): Promise<any> {
    // 이 메서드는 Use Case에서 처리하므로 여기서는 구현하지 않음
    throw new Error('processRequest should be handled by Use Case');
  }

  async processStreamingRequest(_request: any, _callback: any): Promise<void> {
    // 이 메서드는 Use Case에서 처리하므로 여기서는 구현하지 않음
    throw new Error('processStreamingRequest should be handled by Use Case');
  }
}
