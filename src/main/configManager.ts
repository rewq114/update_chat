// configManager.ts
import { FileManager } from './fileManager';

export class ConfigManager {
  private fileManager: FileManager;

  constructor(fileManager: FileManager) {
    this.fileManager = fileManager;
  }

  getApiKey(): string | null {
    try {
      const config = this.fileManager.readConfig();
      console.log('🔍 Config loaded for API key:', config);
      const apiKey = (config['api-key'] as string) || null;
      console.log('🔑 API key found:', apiKey ? 'Yes' : 'No');
      return apiKey;
    } catch (error) {
      console.error('❌ API key retrieval failed:', error);
      return null;
    }
  }

  saveApiKey(apiKey: string): void {
    try {
      const config = this.fileManager.readConfig();
      config['api-key'] = apiKey;
      this.fileManager.saveConfig(config);
      console.log('💾 API key saved');
    } catch (error) {
      console.error('❌ API key save failed:', error);
      throw new Error('Failed to save API key.');
    }
  }

  getSystemPrompt(): string {
    try {
      const config = this.fileManager.readConfig();
      return (config['system-prompt'] as string) || 'You are a helpful assistant.';
    } catch (error) {
      console.error('❌ System prompt retrieval failed:', error);
      return 'You are a helpful assistant.';
    }
  }

  saveSystemPrompt(systemPrompt: string): void {
    try {
      const config = this.fileManager.readConfig();
      config['system-prompt'] = systemPrompt;
      this.fileManager.saveConfig(config);
      console.log('💾 System prompt saved');
    } catch (error) {
      console.error('❌ System prompt save failed:', error);
      throw new Error('Failed to save system prompt.');
    }
  }

  getTheme(): 'light' | 'dark' | 'system' {
    try {
      const config = this.fileManager.readConfig();
      return (config['theme'] as 'light' | 'dark' | 'system') || 'system';
    } catch (error) {
      console.error('❌ Theme retrieval failed:', error);
      return 'system';
    }
  }

  saveTheme(theme: 'light' | 'dark' | 'system'): void {
    try {
      const config = this.fileManager.readConfig();
      config['theme'] = theme;
      this.fileManager.saveConfig(config);
      console.log('💾 Theme saved');
    } catch (error) {
      console.error('❌ Theme save failed:', error);
      throw new Error('Failed to save theme.');
    }
  }

  getDefaultModel(): string {
    try {
      const config = this.fileManager.readConfig();
      return (config['default-model'] as string) || 'claude-opus-4';
    } catch (error) {
      console.error('❌ Default model retrieval failed:', error);
      return 'claude-opus-4';
    }
  }

  saveDefaultModel(model: string): void {
    try {
      const config = this.fileManager.readConfig();
      config['default-model'] = model;
      this.fileManager.saveConfig(config);
      console.log('💾 Default model saved');
    } catch (error) {
      console.error('❌ Default model save failed:', error);
      throw new Error('Failed to save default model.');
    }
  }
} 