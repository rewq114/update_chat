// fileManager.ts
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { ChatSession, ChatData } from '../types/api';
import { MigrationManager } from './migrationManager';

export class FileManager {
  private appDataDir: string;
  private sessionsFile: string;
  private chatsDir: string;
  private migrationManager: MigrationManager;

  constructor() {
    this.appDataDir = path.join(app.getPath('userData'), 'data');
    this.sessionsFile = path.join(this.appDataDir, 'chat-sessions.json');
    this.chatsDir = path.join(this.appDataDir, 'chats');
    this.migrationManager = new MigrationManager(this.appDataDir);
    
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

  /**
   * 필요시 마이그레이션 실행
   */
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

  // ============================================================================
  // 채팅 세션 관리
  // ============================================================================

  readChatSessions(): ChatSession[] {
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

  saveChatSessions(sessions: ChatSession[]): void {
    try {
      fs.writeFileSync(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('❌ Chat sessions save failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // 채팅 데이터 관리
  // ============================================================================

  readChatData(sessionId: string): ChatData | null {
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

  saveChatData(chatData: ChatData): void {
    try {
      const chatFile = path.join(this.chatsDir, `${chatData.sessionId}.json`);
      fs.writeFileSync(chatFile, JSON.stringify(chatData, null, 2));
    } catch (error) {
      console.error(`❌ Chat data save failed for session ${chatData.sessionId}:`, error);
      throw error;
    }
  }

  deleteChatData(sessionId: string): void {
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

  // ============================================================================
  // 세션 관리 메서드
  // ============================================================================

  deleteChatSession(sessionId: string): void {
    try {
      // 세션 목록에서 제거
      const sessions = this.readChatSessions();
      const updatedSessions = sessions.filter(session => session.id !== sessionId);
      this.saveChatSessions(updatedSessions);

      // 채팅 데이터 파일 삭제
      this.deleteChatData(sessionId);
    } catch (error) {
      console.error(`❌ Chat session delete failed for ${sessionId}:`, error);
      throw error;
    }
  }

  renameChatSession(sessionId: string, newTitle: string): void {
    try {
      const sessions = this.readChatSessions();
      const sessionIndex = sessions.findIndex(session => session.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex].title = newTitle;
        sessions[sessionIndex].updatedAt = Date.now();
        this.saveChatSessions(sessions);
      }
    } catch (error) {
      console.error(`❌ Chat session rename failed for ${sessionId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // 설정 파일 관리 (기존 유지)
  // ============================================================================

  readConfig(): Record<string, unknown> {
    try {
      const configFile = path.join(this.appDataDir, 'config.json');
      console.log('📁 Looking for config file at:', configFile);
      
      if (!fs.existsSync(configFile)) {
        console.log('❌ Config file not found, returning empty config');
        return {};
      }
      
      const data = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(data);
      console.log('✅ Config loaded successfully:', config);
      return config;
    } catch (error) {
      console.error('❌ Config read failed:', error);
      return {};
    }
  }

  saveConfig(config: Record<string, unknown>): void {
    try {
      const configFile = path.join(this.appDataDir, 'config.json');
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('❌ Config save failed:', error);
      throw error;
    }
  }

  getAppDataDir(): string {
    return this.appDataDir;
  }

  // ============================================================================
  // 마이그레이션 관련 메서드
  // ============================================================================

  getMigrationStatus() {
    return this.migrationManager.getMigrationStatus();
  }

  async runMigration() {
    return await this.migrationManager.migrate();
  }
} 