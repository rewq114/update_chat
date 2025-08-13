// core/entities/LLM.ts
import { ChatMessage } from './ChatMessage';

export interface LLMRequest {
  messages: ChatMessage[];
  model?: string;
  stream?: boolean;
  thinking?: boolean;
  tools?: string[]; // MCP 서버 이름 배열
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface LLMStreamChunk {
  chunk: string;
  fullResponse: string;
}

export interface LLMStreamComplete {
  content: string;
}

export interface LLMStreamError {
  error: string;
}

export interface StreamingCallback {
  onChunk: (chunk: string, fullResponse: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: string) => void;
}

export interface Agent {
  name: string;
  description: string;
  preferredModel: string;
}
