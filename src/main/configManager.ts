// configManager.ts
import { FileManager } from './fileManager';

export class ConfigManager {
  private fileManager: FileManager;

  constructor(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  getApiKey(): string | null {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      return systemConfig['api-key'];
    } catch (error) {
      console.error('❌ API 키 읽기 실패:', error);
      return null;
    }
  }

  saveApiKey(apiKey: string): { success: boolean; error?: string } {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      systemConfig['api-key'] = apiKey;
      
      this.fileManager.saveSystemConfig(systemConfig);
      return { success: true };
    } catch (error) {
      console.error('❌ API 키 저장 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // System Prompt 관리
  getSystemPrompt(): string {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      return systemConfig['system-prompt'];
    } catch (error) {
      console.error('❌ System prompt 읽기 실패:', error);
      return 'You are a helpful assistant.';
    }
  }

  saveSystemPrompt(systemPrompt: string): { success: boolean; error?: string } {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      systemConfig['system-prompt'] = systemPrompt;
      
      this.fileManager.saveSystemConfig(systemConfig);
      return { success: true };
    } catch (error) {
      console.error('❌ System prompt 저장 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Theme 관리
  getTheme(): 'light' | 'dark' | 'system' {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      return systemConfig['theme'];
    } catch (error) {
      console.error('❌ Theme 읽기 실패:', error);
      return 'system';
    }
  }

  saveTheme(theme: 'light' | 'dark' | 'system'): { success: boolean; error?: string } {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      systemConfig['theme'] = theme;
      
      this.fileManager.saveSystemConfig(systemConfig);
      return { success: true };
    } catch (error) {
      console.error('❌ Theme 저장 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  // Default Model 관리
  getDefaultModel(): string {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      return systemConfig['default-model'];
    } catch (error) {
      console.error('❌ Default model 읽기 실패:', error);
      return 'claude-opus-4';
    }
  }

  saveDefaultModel(model: string): { success: boolean; error?: string } {
    try {
      const systemConfig = this.fileManager.readSystemConfig();
      systemConfig['default-model'] = model;
      
      this.fileManager.saveSystemConfig(systemConfig);
      return { success: true };
    } catch (error) {
      console.error('❌ Default model 저장 실패:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
} 