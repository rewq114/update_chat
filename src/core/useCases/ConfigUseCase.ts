// core/useCases/ConfigUseCase.ts
import { ConfigRepository } from '../repositories/ConfigRepository';
import { AppConfig, Theme } from '../entities/Config';

export class ConfigUseCase {
  constructor(private configRepository: ConfigRepository) {}

  // 전체 설정 관리
  async getConfig(): Promise<AppConfig> {
    return await this.configRepository.getConfig();
  }

  async saveConfig(config: AppConfig): Promise<void> {
    await this.configRepository.saveConfig(config);
  }

  // API 키 관리
  async getApiKey(): Promise<string | null> {
    return await this.configRepository.getApiKey();
  }

  async saveApiKey(apiKey: string): Promise<void> {
    await this.configRepository.saveApiKey(apiKey);
  }

  // 시스템 프롬프트 관리
  async getSystemPrompt(): Promise<string> {
    return await this.configRepository.getSystemPrompt();
  }

  async saveSystemPrompt(systemPrompt: string): Promise<void> {
    await this.configRepository.saveSystemPrompt(systemPrompt);
  }

  // 테마 관리
  async getTheme(): Promise<Theme> {
    return await this.configRepository.getTheme();
  }

  async saveTheme(theme: Theme): Promise<void> {
    await this.configRepository.saveTheme(theme);
  }

  // 기본 모델 관리
  async getDefaultModel(): Promise<string> {
    return await this.configRepository.getDefaultModel();
  }

  async saveDefaultModel(model: string): Promise<void> {
    await this.configRepository.saveDefaultModel(model);
  }

  // MCP 설정 관리
  async getMCPConfig(): Promise<Record<string, unknown> | null> {
    return await this.configRepository.getMCPConfig();
  }

  async saveMCPConfig(mcpConfig: Record<string, unknown>): Promise<void> {
    await this.configRepository.saveMCPConfig(mcpConfig);
  }

  // 설정 유효성 검사
  async validateConfig(config: AppConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (!config.systemPrompt || config.systemPrompt.trim() === '') {
      errors.push('System prompt is required');
    }

    if (!config.defaultModel || config.defaultModel.trim() === '') {
      errors.push('Default model is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 기본 설정 생성
  async createDefaultConfig(): Promise<AppConfig> {
    const defaultConfig: AppConfig = {
      apiKey: '',
      systemPrompt: 'You are a helpful assistant.',
      theme: 'system',
      defaultModel: 'claude-opus-4'
    };

    await this.saveConfig(defaultConfig);
    return defaultConfig;
  }
}
