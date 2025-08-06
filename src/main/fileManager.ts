// fileManager.ts
import fs from 'fs';
import { join } from 'path';
import os from 'os';

export interface ChatMessage {
  idx: number;
  text: string;
  role: 'user' | 'assistant';
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
}

export interface SystemConfig {
  'api-key': string;
  'system-prompt': string;
  'theme': 'light' | 'dark' | 'system';
  'default-model': string;
}

export interface MCPConfig {
  mcpServers: Record<string, any>;
}

export class FileManager {
  private chatLogPath: string;
  private systemConfigPath: string;
  private mcpConfigPath: string;
  private appDataDir: string;

  constructor() {
    // 사용자 홈 디렉토리에 앱 데이터 폴더 생성
    this.appDataDir = join(os.homedir(), 'AppData', 'Roaming', 'update-chat');
    this.ensureAppDataDir();
    
    this.chatLogPath = join(this.appDataDir, 'chat_log.json');
    this.systemConfigPath = join(this.appDataDir, 'systemConfig.json');
    this.mcpConfigPath = join(this.appDataDir, 'mcpConfig.json');
  }

  // 앱 데이터 디렉토리 생성
  private ensureAppDataDir(): void {
    if (!fs.existsSync(this.appDataDir)) {
      console.log(`Creating app data directory: ${this.appDataDir}`);
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }
  }

  // 파일이 존재하는지 확인하고 없으면 생성
  private ensureFileExists(filePath: string, defaultContent: any): void {
    if (!fs.existsSync(filePath)) {
      console.log(`Creating file: ${filePath}`);
      fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
    }
  }

  // 설정 파일 읽기 메서드들
  readSystemConfig(): SystemConfig {
    const defaultConfig: SystemConfig = {
      'api-key': '',
      'system-prompt': 'You are a helpful assistant.',
      'theme': 'system',
      'default-model': 'claude-opus-4'
    };
    
    this.ensureFileExists(this.systemConfigPath, defaultConfig);
    
    try {
      const content = fs.readFileSync(this.systemConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ System config read failed:', error);
      // 파일이 손상된 경우 기본값으로 재생성
      this.saveSystemConfig(defaultConfig);
      return defaultConfig;
    }
  }

  readMCPConfig(): MCPConfig {
    const defaultConfig: MCPConfig = {
      mcpServers: {

      }
    };
    
    this.ensureFileExists(this.mcpConfigPath, defaultConfig);
    
    try {
      const content = fs.readFileSync(this.mcpConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ MCP config read failed:', error);
      // 파일이 손상된 경우 기본값으로 재생성
      this.saveMCPConfig(defaultConfig);
      return defaultConfig;
    }
  }

  readChatLog(): ChatSession[] {
    const defaultChats = this.getDefaultChatSession();
    
    this.ensureFileExists(this.chatLogPath, defaultChats);
    
    try {
      const content = fs.readFileSync(this.chatLogPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Chat log read failed:', error);
      // 파일이 손상된 경우 기본값으로 재생성
      this.saveChatLog(defaultChats);
      return defaultChats;
    }
  }

  // 채팅 로그 관련 메서드들
  saveChatLog(chatLogs: ChatSession[]): void {
    try {
      fs.writeFileSync(this.chatLogPath, JSON.stringify(chatLogs, null, 2));
      console.log('💾 Chat log saved');
    } catch (error) {
      console.error('❌ Chat log save failed:', error);
      throw new Error('Failed to save chat log.');
    }
  }

  saveSystemConfig(config: SystemConfig): void {
    try {
      fs.writeFileSync(this.systemConfigPath, JSON.stringify(config, null, 2));
      console.log('💾 System config saved');
    } catch (error) {
      console.error('❌ System config save failed:', error);
      throw new Error('Failed to save system config.');
    }
  }

  saveMCPConfig(config: MCPConfig): void {
    try {
      fs.writeFileSync(this.mcpConfigPath, JSON.stringify(config, null, 2));
      console.log('💾 MCP config saved');
    } catch (error) {
      console.error('❌ MCP config save failed:', error);
      throw new Error('Failed to save MCP config.');
    }
  }

  // 채팅 세션 관리 메서드들
  findChatSession(chatLogs: ChatSession[], chatId: string): ChatSession | undefined {
    return chatLogs.find(chat => chat.id === chatId);
  }

  createNewChatSession(chatLogs: ChatSession[], chatId: string): ChatSession {
    return {
      id: chatId,
      name: `Chat ${chatLogs.length + 1}`,
      messages: []
    };
  }

  addMessageToChat(chat: ChatSession, message: ChatMessage): void {
    chat.messages.push(message);
  }

  // 기본 채팅 세션 생성
  getDefaultChatSession(): ChatSession[] {
    return [
      {
        id: "demo-chat",
        name: "Welcome Chat",
        messages: [
          {
            idx: Date.now(),
            text: "Welcome to Update-Chat! Please enter a message.",
            role: "assistant"
          }
        ]
      }
    ];
  }

  // 앱 데이터 디렉토리 경로 반환 (디버깅용)
  getAppDataDir(): string {
    return this.appDataDir;
  }
} 