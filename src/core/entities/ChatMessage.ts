// core/entities/ChatMessage.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  time: number;
  type: 'text' | 'image' | 'file' | 'tool_call';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model: string;
  lastMessageTime: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChatData {
  sessionId: string;
  messages: ChatMessage[];
}
