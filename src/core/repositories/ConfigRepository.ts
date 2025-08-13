// core/repositories/ConfigRepository.ts
import { AppConfig, Theme } from '../entities/Config';

export interface ConfigRepository {
  // 설정 읽기/쓰기
  getConfig(): Promise<AppConfig>;
  saveConfig(config: AppConfig): Promise<void>;
  
  // 개별 설정 항목
  getApiKey(): Promise<string | null>;
  saveApiKey(apiKey: string): Promise<void>;
  
  getSystemPrompt(): Promise<string>;
  saveSystemPrompt(systemPrompt: string): Promise<void>;
  
  getTheme(): Promise<Theme>;
  saveTheme(theme: Theme): Promise<void>;
  
  getDefaultModel(): Promise<string>;
  saveDefaultModel(model: string): Promise<void>;
  
  getMCPConfig(): Promise<Record<string, unknown> | null>;
  saveMCPConfig(mcpConfig: Record<string, unknown>): Promise<void>;
}
