// core/services/LLMService.ts
import { LLMRequest, LLMResponse, StreamingCallback, Agent } from '../entities/LLM';

export interface LLMService {
  // 기본 채팅
  chat(agent: Agent, messages: any[], tools?: Record<string, unknown>): Promise<{ content: string }>;
  
  // 스트리밍 채팅
  stream(agent: Agent, messages: any[], tools?: Record<string, unknown>): AsyncIterable<string>;
  
  // 요청 처리
  processRequest(request: LLMRequest): Promise<LLMResponse>;
  processStreamingRequest(request: LLMRequest, callback: StreamingCallback): Promise<void>;
  
  // API 키 설정
  setApiKey(apiKey: string): void;
}
