// hchatAdapter.ts
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
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = "https://h-chat-api.autoever.com/v2/api";
  }

  async chat(agent: Agent, messages: Message[], mcpTools: any): Promise<LLMResponse> {
    // Agent의 시스템 프롬프트를 첫 번째 메시지로 추가
    const fullMessages = [
      { role: "system" as const, content: agent.description },
      ...messages,
    ];    

    const allTools = Object.values(mcpTools).flat() as MCPTool[];

    try {
      let response: any;

      if (agent.preferredModel.startsWith("gpt-")) {
        // OpenAI 계열 모델
        response = await this.callOpenAIAPI(agent.preferredModel, fullMessages, allTools);
      } else if (agent.preferredModel.startsWith("claude-")) {
        // Claude 계열 모델
        response = await this.callClaudeAPI(agent.preferredModel, fullMessages, allTools);
      } else if (agent.preferredModel.startsWith("gemini-")) {
        // Gemini 계열 모델
        response = await this.callGeminiAPI(agent.preferredModel, fullMessages, allTools);
      } else {
        throw new Error(`지원하지 않는 모델: ${agent.preferredModel}`);
      }

      return {
        content: response.content,
        usage: response.usage,
        model: agent.preferredModel,
        agent: agent.name,
      };
    } catch (error) {
      throw new Error(`H-Chat API 호출 실패: ${error}`);
    }
  }

  private async callOpenAIAPI(model: string, messages: Message[], mcpTools: MCPTool[]) {
    const url = `${this.baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-10-21`;
    
    // request body 생성
    interface RequestBody {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens: number;
      tools?: { type: string; function: { name: string; description: string; parameters: any } }[];
    }

    const body: RequestBody = {
      model: model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 2000,
    }

    if (mcpTools.length > 0) {
      body.tools = mcpTools.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }
      }))
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: any = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || "",
      usage: data.usage,
    };
  }

  private async callClaudeAPI(model: string, messages: Message[], mcpTools: MCPTool[]) {
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    interface RequestBody {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens: number;
      system: string;
      stream: boolean;
      tools?: { name: string; description: string; parameters: any }[];
    }
    
    const body: RequestBody = {
      model: model,
      messages: userMessages,
      temperature: 0.7,
      max_tokens: 2000,
      system: systemMessage?.content || "",
      stream: false,
    }

    if (mcpTools.length > 0) {
      body.tools = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }))
    }

    const response = await fetch(`${this.baseUrl}/claude/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: any = await response.json();
    
    return {
      content: data.content?.[0]?.text || data.message || "",
      usage: data.usage,
    };
  }

  private async callGeminiAPI(model: string, messages: Message[], mcpTools: MCPTool[]) {
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const contents = userMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    interface RequestBody {
      systemInstruction: { parts: { text: string }[] } | undefined;
      contents: { role: string; parts: { text: string }[] }[];
      tools?: { function_declarations: { name: string; description: string; parameters: any }[] }[];
    }
    
    const body: RequestBody = {
      systemInstruction: systemMessage
        ? {
            parts: [{ text: systemMessage.content }],
          }
        : undefined,
      contents: contents,
    }

    if (mcpTools.length > 0) {
      body.tools = [{
        function_declarations: mcpTools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema
        }))
      }]
    }

    const response = await fetch(
      `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: any = await response.json();
    
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      usage: data.usageMetadata,
    };
  }

  async *stream(agent: Agent, messages: Message[], mcpTools: any): AsyncIterable<string> {
    // 간단하게 일반 응답을 청크로 나누어 반환
    const response = await this.chat(agent, messages, mcpTools);
    const words = response.content.split(" ");

    for (const word of words) {
      yield word + " ";
      await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms 딜레이
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
}