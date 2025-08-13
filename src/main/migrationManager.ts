// migrationManager.ts
import * as fs from 'fs';
import * as path from 'path';
import { ChatSession, ChatData, ChatMessage } from '../types/api';

// 기존 데이터 구조 (하위 호환성)
interface LegacyChatMessage {
  idx: number;
  text: string;
  role: 'user' | 'assistant';
}

interface LegacyChatSession {
  id: string;
  name: string;
  messages: LegacyChatMessage[];
}

interface LegacyChatLog {
  chats: LegacyChatSession[];
}

export class MigrationManager {
  private legacyChatLogPath: string;
  private newSessionsPath: string;
  private newChatsDir: string;
  private legacyConfigPath: string;
  private newConfigPath: string;

  constructor(appDataDir: string) {
    this.legacyChatLogPath = path.join(appDataDir, 'chat_log.json');
    this.newSessionsPath = path.join(appDataDir, 'chat-sessions.json');
    this.newChatsDir = path.join(appDataDir, 'chats');
    this.legacyConfigPath = path.join(appDataDir, 'system_config.json');
    this.newConfigPath = path.join(appDataDir, 'config.json');
  }

  /**
   * 마이그레이션이 필요한지 확인
   */
  needsMigration(): boolean {
    // 기존 파일이 있고, 새로운 구조가 없으면 마이그레이션 필요
    const hasLegacyFile = fs.existsSync(this.legacyChatLogPath);
    const hasNewStructure = fs.existsSync(this.newSessionsPath);
    const hasLegacyConfig = fs.existsSync(this.legacyConfigPath);
    const hasNewConfig = fs.existsSync(this.newConfigPath);
    
    return (hasLegacyFile && !hasNewStructure) || (hasLegacyConfig && !hasNewConfig);
  }

  /**
   * 기존 데이터를 새로운 구조로 마이그레이션
   */
  async migrate(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
    try {
      console.log('🔄 Starting data migration...');

      let migratedCount = 0;

      // 채팅 데이터 마이그레이션
      const chatResult = await this.migrateChatData();
      migratedCount += chatResult.migratedCount;

      // 설정 데이터 마이그레이션
      const configResult = await this.migrateConfigData();
      if (configResult.success) {
        migratedCount += 1; // 설정 파일 1개
      }

      console.log(`✅ Migration completed: ${migratedCount} items migrated`);
      return { success: true, migratedCount };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { 
        success: false, 
        migratedCount: 0, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 채팅 데이터 마이그레이션
   */
  private async migrateChatData(): Promise<{ success: boolean; migratedCount: number; error?: string }> {
    try {
      // 기존 데이터 읽기
      const legacyData = this.readLegacyData();
      if (!legacyData || !legacyData.chats || legacyData.chats.length === 0) {
        console.log('ℹ️ No legacy chat data found or empty');
        return { success: true, migratedCount: 0 };
      }

      // 새로운 디렉토리 생성
      this.ensureNewDirectories();

      // 각 채팅을 새로운 구조로 변환
      const newSessions: ChatSession[] = [];
      let migratedCount = 0;

      for (const legacyChat of legacyData.chats) {
        try {
          // 세션 생성
          const newSession: ChatSession = {
            id: legacyChat.id,
            title: legacyChat.name,
            model: 'claude-opus-4', // 기본값
            lastMessageTime: this.getLastMessageTime(legacyChat.messages),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          // 메시지 변환
          const newMessages: ChatMessage[] = legacyChat.messages.map((legacyMsg, index) => ({
            role: legacyMsg.role,
            time: legacyMsg.idx || Date.now() + index, // idx가 없으면 순차적으로 시간 할당
            type: 'text' as const,
            content: legacyMsg.text
          }));

          // 채팅 데이터 생성
          const chatData: ChatData = {
            sessionId: legacyChat.id,
            messages: newMessages
          };

          // 파일 저장
          this.saveNewChatData(chatData);
          newSessions.push(newSession);
          migratedCount++;

          console.log(`✅ Migrated chat: ${legacyChat.name} (${newMessages.length} messages)`);
        } catch (error) {
          console.error(`❌ Failed to migrate chat ${legacyChat.name}:`, error);
        }
      }

      // 세션 목록 저장
      this.saveNewSessions(newSessions);

      // 기존 파일 백업
      this.backupLegacyData();

      return { success: true, migratedCount };

    } catch (error) {
      console.error('❌ Chat data migration failed:', error);
      return { 
        success: false, 
        migratedCount: 0, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 설정 데이터 마이그레이션
   */
  private async migrateConfigData(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!fs.existsSync(this.legacyConfigPath)) {
        console.log('ℹ️ No legacy config data found');
        return { success: true };
      }

      // 기존 설정 읽기
      const legacyConfig = this.readLegacyConfig();
      if (!legacyConfig) {
        return { success: true };
      }

      // 새로운 설정 형식으로 변환
      const newConfig: Record<string, unknown> = {};

      // API 키 변환 (다양한 키 이름 지원)
      if (legacyConfig.apiKey) {
        newConfig['api-key'] = legacyConfig.apiKey;
      } else if (legacyConfig['api-key']) {
        newConfig['api-key'] = legacyConfig['api-key'];
      }

      // 시스템 프롬프트 변환
      if (legacyConfig.systemPrompt) {
        newConfig['system-prompt'] = legacyConfig.systemPrompt;
      } else if (legacyConfig['system-prompt']) {
        newConfig['system-prompt'] = legacyConfig['system-prompt'];
      }

      // 테마 변환
      if (legacyConfig.theme) {
        newConfig['theme'] = legacyConfig.theme;
      } else if (legacyConfig['theme']) {
        newConfig['theme'] = legacyConfig['theme'];
      }

      // 기본 모델 변환
      if (legacyConfig.defaultModel) {
        newConfig['default-model'] = legacyConfig.defaultModel;
      } else if (legacyConfig['default-model']) {
        newConfig['default-model'] = legacyConfig['default-model'];
      }

      // MCP 설정 변환
      if (legacyConfig.mcpConfig) {
        newConfig['mcp-config'] = legacyConfig.mcpConfig;
      } else if (legacyConfig['mcp-config']) {
        newConfig['mcp-config'] = legacyConfig['mcp-config'];
      }

      // 새로운 설정 저장
      this.saveNewConfig(newConfig);

      // 기존 설정 백업
      this.backupLegacyConfig();

      console.log('✅ Config migration completed');
      return { success: true };

    } catch (error) {
      console.error('❌ Config migration failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * 기존 데이터 읽기
   */
  private readLegacyData(): LegacyChatLog | null {
    try {
      if (!fs.existsSync(this.legacyChatLogPath)) {
        return null;
      }

      const data = fs.readFileSync(this.legacyChatLogPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to read legacy data:', error);
      return null;
    }
  }

  /**
   * 기존 설정 읽기
   */
  private readLegacyConfig(): Record<string, unknown> | null {
    try {
      if (!fs.existsSync(this.legacyConfigPath)) {
        return null;
      }

      const data = fs.readFileSync(this.legacyConfigPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to read legacy config:', error);
      return null;
    }
  }

  /**
   * 새로운 디렉토리 생성
   */
  private ensureNewDirectories(): void {
    if (!fs.existsSync(this.newChatsDir)) {
      fs.mkdirSync(this.newChatsDir, { recursive: true });
    }
  }

  /**
   * 마지막 메시지 시간 계산
   */
  private getLastMessageTime(messages: LegacyChatMessage[]): number {
    if (messages.length === 0) {
      return Date.now();
    }

    const lastMessage = messages[messages.length - 1];
    return lastMessage.idx || Date.now();
  }

  /**
   * 새로운 채팅 데이터 저장
   */
  private saveNewChatData(chatData: ChatData): void {
    const chatFilePath = path.join(this.newChatsDir, `${chatData.sessionId}.json`);
    fs.writeFileSync(chatFilePath, JSON.stringify(chatData, null, 2));
  }

  /**
   * 새로운 세션 목록 저장
   */
  private saveNewSessions(sessions: ChatSession[]): void {
    fs.writeFileSync(this.newSessionsPath, JSON.stringify(sessions, null, 2));
  }

  /**
   * 새로운 설정 저장
   */
  private saveNewConfig(config: Record<string, unknown>): void {
    fs.writeFileSync(this.newConfigPath, JSON.stringify(config, null, 2));
  }

  /**
   * 기존 데이터 백업
   */
  private backupLegacyData(): void {
    const backupPath = this.legacyChatLogPath + '.backup';
    if (fs.existsSync(this.legacyChatLogPath)) {
      fs.copyFileSync(this.legacyChatLogPath, backupPath);
      console.log(`💾 Legacy data backed up to: ${backupPath}`);
    }
  }

  /**
   * 기존 설정 백업
   */
  private backupLegacyConfig(): void {
    const backupPath = this.legacyConfigPath + '.backup';
    if (fs.existsSync(this.legacyConfigPath)) {
      fs.copyFileSync(this.legacyConfigPath, backupPath);
      console.log(`💾 Legacy config backed up to: ${backupPath}`);
    }
  }

  /**
   * 마이그레이션 상태 확인
   */
  getMigrationStatus(): {
    needsMigration: boolean;
    hasLegacyData: boolean;
    hasNewStructure: boolean;
    legacyFileCount?: number;
  } {
    const hasLegacyFile = fs.existsSync(this.legacyChatLogPath);
    const hasNewStructure = fs.existsSync(this.newSessionsPath);
    const hasLegacyConfig = fs.existsSync(this.legacyConfigPath);
    const hasNewConfig = fs.existsSync(this.newConfigPath);
    
    let legacyFileCount: number | undefined;
    if (hasLegacyFile) {
      try {
        const legacyData = this.readLegacyData();
        legacyFileCount = legacyData?.chats?.length || 0;
      } catch (error) {
        console.error('Failed to read legacy file count:', error);
      }
    }

    return {
      needsMigration: (hasLegacyFile && !hasNewStructure) || (hasLegacyConfig && !hasNewConfig),
      hasLegacyData: hasLegacyFile || hasLegacyConfig,
      hasNewStructure: hasNewStructure && hasNewConfig,
      legacyFileCount
    };
  }
}
