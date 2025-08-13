// platform/electron/repositories/FileChatRepository.ts
import * as fs from 'fs';
import * as path from 'path';
import { ChatRepository } from '../../../core/repositories/ChatRepository';
import { ChatSession, ChatData } from '../../../core/entities/ChatMessage';
import { FileMigrationManager } from '../migration/FileMigrationManager';

export class FileChatRepository implements ChatRepository {
  private appDataDir: string;
  private sessionsFile: string;
  private chatsDir: string;
  private migrationManager: FileMigrationManager;

  constructor(appDataDir: string) {
    this.appDataDir = appDataDir;
    this.sessionsFile = path.join(appDataDir, 'chat-sessions.json');
    this.chatsDir = path.join(appDataDir, 'chats');
    this.migrationManager = new FileMigrationManager(appDataDir);
    
    this.ensureDirectories();
    this.runMigrationIfNeeded();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }
    if (!fs.existsSync(this.chatsDir)) {
      fs.mkdirSync(this.chatsDir, { recursive: true });
    }
  }

  private async runMigrationIfNeeded(): Promise<void> {
    try {
      const status = this.migrationManager.getMigrationStatus();
      
      if (status.needsMigration) {
        console.log(`🔄 Migration needed: ${status.legacyFileCount} chats found`);
        console.log('📊 Migration status:', status);
        
        const result = await this.migrationManager.migrate();
        
        if (result.success) {
          console.log(`✅ Migration successful: ${result.migratedCount} chats migrated`);
        } else {
          console.error('❌ Migration failed:', result.error);
        }
      } else {
        console.log('ℹ️ No migration needed');
      }
    } catch (error) {
      console.error('❌ Migration check failed:', error);
    }
  }

  // 세션 관리
  async getSessions(): Promise<ChatSession[]> {
    try {
      if (!fs.existsSync(this.sessionsFile)) {
        return [];
      }
      const data = fs.readFileSync(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Chat sessions read failed:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    const sessions = await this.getSessions();
    return sessions.find(session => session.id === sessionId) || null;
  }

  async saveSession(session: ChatSession): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('❌ Chat session save failed:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // 세션 목록에서 제거
      const sessions = await this.getSessions();
      const updatedSessions = sessions.filter(session => session.id !== sessionId);
      fs.writeFileSync(this.sessionsFile, JSON.stringify(updatedSessions, null, 2));

      // 채팅 데이터 파일 삭제
      await this.deleteChatData(sessionId);
    } catch (error) {
      console.error(`❌ Chat session delete failed for ${sessionId}:`, error);
      throw error;
    }
  }

  async updateSessionTitle(sessionId: string, newTitle: string): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const sessionIndex = sessions.findIndex(session => session.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].title = newTitle;
        sessions[sessionIndex].updatedAt = Date.now();
        fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
      }
    } catch (error) {
      console.error(`❌ Chat session rename failed for ${sessionId}:`, error);
      throw error;
    }
  }

  // 채팅 데이터 관리
  async getChatData(sessionId: string): Promise<ChatData | null> {
    try {
      const chatFile = path.join(this.chatsDir, `${sessionId}.json`);
      if (!fs.existsSync(chatFile)) {
        return null;
      }
      const data = fs.readFileSync(chatFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Chat data read failed for session ${sessionId}:`, error);
      return null;
    }
  }

  async saveChatData(chatData: ChatData): Promise<void> {
    try {
      const chatFile = path.join(this.chatsDir, `${chatData.sessionId}.json`);
      fs.writeFileSync(chatFile, JSON.stringify(chatData, null, 2));
    } catch (error) {
      console.error(`❌ Chat data save failed for session ${chatData.sessionId}:`, error);
      throw error;
    }
  }

  async deleteChatData(sessionId: string): Promise<void> {
    try {
      const chatFile = path.join(this.chatsDir, `${sessionId}.json`);
      if (fs.existsSync(chatFile)) {
        fs.unlinkSync(chatFile);
      }
    } catch (error) {
      console.error(`❌ Chat data delete failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  // 마이그레이션
  async needsMigration(): Promise<boolean> {
    return this.migrationManager.needsMigration();
  }

  async migrate(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
    return await this.migrationManager.migrate();
  }

  async getMigrationStatus() {
    return this.migrationManager.getMigrationStatus();
  }
}
