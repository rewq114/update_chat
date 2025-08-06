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
} 