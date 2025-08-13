// hchatAdapter.ts
import { HChat, ChatRequest, ChatCompletion } from '@rewq114/h-chat-sdk';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Agent {
  name: string;
  description: string;
  preferredModel: string;
}

export interface LLMResponse {
  content: string;
  usage?: any;
  model: string;
  agent: string;
}

export interface LLMProvider {
  chat(agent: Agent, messages: Message[], mcpTools: any): Promise<LLMResponse>;
  stream(agent: Agent, messages: Message[], mcpTools: any): AsyncIterable<string>;
  listModels(): string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export class HChatProvider implements LLMProvider {
  private client: HChat;

  constructor(apiKey: string) {
    this.client = new HChat({
      apiKey: apiKey,
    });
  }

  async chat(agent: Agent, messages: Message[], mcpTools: any): Promise<LLMResponse> {
    try {
      // MCP 도구를 SDK 형식으로 변환
      const tools = this.convertMCPToolsToSDKFormat(mcpTools);

      // SDK 요청 형식으로 변환
      const request: ChatRequest = {
        model: agent.preferredModel,
        system: agent.description,
        content: this.convertMessagesToSDKFormat(messages),
        tools: tools,
        temperature: 0.7,
        max_tokens: 2000,
      };

      // SDK를 사용하여 채팅 요청
      const response: ChatCompletion = await this.client.chat(request);

      return {
        content: response.content,
        usage: response.usage,
        model: agent.preferredModel,
        agent: agent.name,
      };
    } catch (error) {
      throw new Error(`H-Chat SDK 호출 실패: ${error}`);
    }
  }

  async *stream(agent: Agent, messages: Message[], mcpTools: any): AsyncIterable<string> {
    try {
      // MCP 도구를 SDK 형식으로 변환
      const tools = this.convertMCPToolsToSDKFormat(mcpTools);

      // SDK 요청 형식으로 변환
      const request: ChatRequest = {
        model: agent.preferredModel,
        system: agent.description,
        content: this.convertMessagesToSDKFormat(messages),
        tools: tools,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      };

      // SDK를 사용하여 스트리밍 요청
      const stream = this.client.stream(request);
      
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      throw new Error(`H-Chat SDK 스트리밍 호출 실패: ${error}`);
    }
  }

  listModels(): string[] {
    return [
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "claude-opus-4",
      "claude-sonnet-4",
      "claude-3-7-sonnet",
      "claude-3-5-sonnet-v2",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
    ];
  }

  private convertMessagesToSDKFormat(messages: Message[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private convertMCPToolsToSDKFormat(mcpTools: any): any[] {
    if (!mcpTools || Object.keys(mcpTools).length === 0) {
      return [];
    }

    const allTools = Object.values(mcpTools).flat() as MCPTool[];
    
    return allTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }
}