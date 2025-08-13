// core/repositories/ChatRepository.ts
import { ChatSession, ChatData } from '../entities/ChatMessage';

export interface ChatRepository {
  // 세션 관리
  getSessions(): Promise<ChatSession[]>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  saveSession(session: ChatSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionTitle(sessionId: string, newTitle: string): Promise<void>;
  
  // 채팅 데이터 관리
  getChatData(sessionId: string): Promise<ChatData | null>;
  saveChatData(chatData: ChatData): Promise<void>;
  deleteChatData(sessionId: string): Promise<void>;
  
  // 마이그레이션
  needsMigration(): Promise<boolean>;
  migrate(): Promise<{ success: boolean; migratedCount: number; error?: string }>;
  getMigrationStatus(): Promise<{
    needsMigration: boolean;
    hasLegacyData: boolean;
    hasNewStructure: boolean;
    legacyFileCount?: number;
  }>;
}
