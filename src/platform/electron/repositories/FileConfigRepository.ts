// platform/electron/repositories/FileConfigRepository.ts
import * as fs from 'fs';
import * as path from 'path';
import { ConfigRepository } from '../../../core/repositories/ConfigRepository';
import { AppConfig, Theme } from '../../../core/entities/Config';

export class FileConfigRepository implements ConfigRepository {
  private appDataDir: string;
  private configFile: string;

  constructor(appDataDir: string) {
    this.appDataDir = appDataDir;
    this.configFile = path.join(appDataDir, 'config.json');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }
  }

  private readConfigFile(): Record<string, unknown> {
    try {
      if (!fs.existsSync(this.configFile)) {
        return {};
      }
      const data = fs.readFileSync(this.configFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Config read failed:', error);
      return {};
    }
  }

  private writeConfigFile(config: Record<string, unknown>): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('❌ Config write failed:', error);
      throw error;
    }
  }

  // 전체 설정 관리
  async getConfig(): Promise<AppConfig> {
    const config = this.readConfigFile();
    return {
      apiKey: (config['api-key'] as string) || '',
      systemPrompt: (config['system-prompt'] as string) || 'You are a helpful assistant.',
      theme: (config['theme'] as Theme) || 'system',
      defaultModel: (config['default-model'] as string) || 'claude-opus-4',
      mcpConfig: config['mcp-config'] as Record<string, unknown> || undefined
    };
  }

  async saveConfig(config: AppConfig): Promise<void> {
    const fileConfig: Record<string, unknown> = {
      'api-key': config.apiKey,
      'system-prompt': config.systemPrompt,
      'theme': config.theme,
      'default-model': config.defaultModel
    };

    if (config.mcpConfig) {
      fileConfig['mcp-config'] = config.mcpConfig;
    }

    this.writeConfigFile(fileConfig);
  }

  // 개별 설정 항목
  async getApiKey(): Promise<string | null> {
    const config = this.readConfigFile();
    return (config['api-key'] as string) || null;
  }

  async saveApiKey(apiKey: string): Promise<void> {
    const config = this.readConfigFile();
    config['api-key'] = apiKey;
    this.writeConfigFile(config);
  }

  async getSystemPrompt(): Promise<string> {
    const config = this.readConfigFile();
    return (config['system-prompt'] as string) || 'You are a helpful assistant.';
  }

  async saveSystemPrompt(systemPrompt: string): Promise<void> {
    const config = this.readConfigFile();
    config['system-prompt'] = systemPrompt;
    this.writeConfigFile(config);
  }

  async getTheme(): Promise<Theme> {
    const config = this.readConfigFile();
    return (config['theme'] as Theme) || 'system';
  }

  async saveTheme(theme: Theme): Promise<void> {
    const config = this.readConfigFile();
    config['theme'] = theme;
    this.writeConfigFile(config);
  }

  async getDefaultModel(): Promise<string> {
    const config = this.readConfigFile();
    return (config['default-model'] as string) || 'claude-opus-4';
  }

  async saveDefaultModel(model: string): Promise<void> {
    const config = this.readConfigFile();
    config['default-model'] = model;
    this.writeConfigFile(config);
  }

  async getMCPConfig(): Promise<Record<string, unknown> | null> {
    const config = this.readConfigFile();
    return (config['mcp-config'] as Record<string, unknown>) || null;
  }

  async saveMCPConfig(mcpConfig: Record<string, unknown>): Promise<void> {
    const config = this.readConfigFile();
    config['mcp-config'] = mcpConfig;
    this.writeConfigFile(config);
  }
}
