// platform/electron/repositories/FileConfigRepository.ts
import * as fs from 'fs';
import * as path from 'path';
import { ConfigRepository } from '../../../core/repositories/ConfigRepository';
import { AppConfig, Theme } from '../../../core/entities/Config';
import { Logger } from '../../../core/logging/Logger';

export class FileConfigRepository implements ConfigRepository {
  private appDataDir: string;
  private configFile: string;
  private logger: Logger;

  constructor(appDataDir: string, logger?: Logger) {
    this.appDataDir = appDataDir;
    this.configFile = path.join(appDataDir, 'config.json');
    this.logger = logger || new Logger({
      level: 1, // INFO
      enableConsole: true,
      enableFile: false,
      logDir: '',
      maxFileSize: 10,
      maxFiles: 5
    });
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    try {
      if (!fs.existsSync(this.appDataDir)) {
        fs.mkdirSync(this.appDataDir, { recursive: true });
        this.logger.database('write', 'directory', { path: this.appDataDir, action: 'create' });
      }
    } catch (error) {
      this.logger.error('DATABASE', 'Failed to ensure config directory', error as Error, { appDataDir: this.appDataDir });
      throw error;
    }
  }

  private readConfigFile(): Record<string, unknown> {
    try {
      if (!fs.existsSync(this.configFile)) {
        this.logger.debug('DATABASE', 'read config', { file: this.configFile, result: 'not_found' });
        return {};
      }
      const data = fs.readFileSync(this.configFile, 'utf8');
      const config = JSON.parse(data);
      this.logger.database('read', 'config', { file: this.configFile, keys: Object.keys(config) });
      return config;
    } catch (error) {
      this.logger.error('DATABASE', 'Config read failed', error as Error, { file: this.configFile });
      return {};
    }
  }

  private writeConfigFile(config: Record<string, unknown>): void {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      this.logger.database('write', 'config', { file: this.configFile, keys: Object.keys(config) });
      this.logger.info('DATABASE', 'Config saved successfully', { keys: Object.keys(config) });
    } catch (error) {
      this.logger.error('DATABASE', 'Config write failed', error as Error, { file: this.configFile });
      throw error;
    }
  }

  // 전체 설정 관리
  async getConfig(): Promise<AppConfig> {
    try {
      const config = this.readConfigFile();
      const appConfig = {
        apiKey: (config['api-key'] as string) || '',
        systemPrompt: (config['system-prompt'] as string) || 'You are a helpful assistant.',
        theme: (config['theme'] as Theme) || 'system',
        defaultModel: (config['default-model'] as string) || 'claude-opus-4',
        mcpConfig: config['mcp-config'] as Record<string, unknown> || undefined
      };
      
      this.logger.logConfig('read', 'full_config', { 
        hasApiKey: !!appConfig.apiKey, 
        hasMCPConfig: !!appConfig.mcpConfig 
      });
      
      return appConfig;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get config', error as Error);
      throw error;
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
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
      this.logger.logConfig('write', 'full_config', { 
        hasApiKey: !!config.apiKey, 
        hasMCPConfig: !!config.mcpConfig 
      });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save config', error as Error);
      throw error;
    }
  }

  // 개별 설정 항목
  async getApiKey(): Promise<string | null> {
    try {
      const config = this.readConfigFile();
      const apiKey = (config['api-key'] as string) || null;
      this.logger.logConfig('read', 'api_key', { hasApiKey: !!apiKey });
      return apiKey;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get API key', error as Error);
      return null;
    }
  }

  async saveApiKey(apiKey: string): Promise<void> {
    try {
      const config = this.readConfigFile();
      config['api-key'] = apiKey;
      this.writeConfigFile(config);
      this.logger.logConfig('write', 'api_key', { hasApiKey: !!apiKey });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save API key', error as Error);
      throw error;
    }
  }

  async getSystemPrompt(): Promise<string> {
    try {
      const config = this.readConfigFile();
      const systemPrompt = (config['system-prompt'] as string) || 'You are a helpful assistant.';
      this.logger.logConfig('read', 'system_prompt', { length: systemPrompt.length });
      return systemPrompt;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get system prompt', error as Error);
      return 'You are a helpful assistant.';
    }
  }

  async saveSystemPrompt(systemPrompt: string): Promise<void> {
    try {
      const config = this.readConfigFile();
      config['system-prompt'] = systemPrompt;
      this.writeConfigFile(config);
      this.logger.logConfig('write', 'system_prompt', { length: systemPrompt.length });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save system prompt', error as Error);
      throw error;
    }
  }

  async getTheme(): Promise<Theme> {
    try {
      const config = this.readConfigFile();
      const theme = (config['theme'] as Theme) || 'system';
      this.logger.logConfig('read', 'theme', { theme });
      return theme;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get theme', error as Error);
      return 'system';
    }
  }

  async saveTheme(theme: Theme): Promise<void> {
    try {
      const config = this.readConfigFile();
      config['theme'] = theme;
      this.writeConfigFile(config);
      this.logger.logConfig('write', 'theme', { theme });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save theme', error as Error);
      throw error;
    }
  }

  async getDefaultModel(): Promise<string> {
    try {
      const config = this.readConfigFile();
      const model = (config['default-model'] as string) || 'claude-opus-4';
      this.logger.logConfig('read', 'default_model', { model });
      return model;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get default model', error as Error);
      return 'claude-opus-4';
    }
  }

  async saveDefaultModel(model: string): Promise<void> {
    try {
      const config = this.readConfigFile();
      config['default-model'] = model;
      this.writeConfigFile(config);
      this.logger.logConfig('write', 'default_model', { model });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save default model', error as Error);
      throw error;
    }
  }

  async getMCPConfig(): Promise<Record<string, unknown> | null> {
    try {
      const config = this.readConfigFile();
      const mcpConfig = (config['mcp-config'] as Record<string, unknown>) || null;
      this.logger.logConfig('read', 'mcp_config', { hasMCPConfig: !!mcpConfig });
      return mcpConfig;
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to get MCP config', error as Error);
      return null;
    }
  }

  async saveMCPConfig(mcpConfig: Record<string, unknown>): Promise<void> {
    try {
      const config = this.readConfigFile();
      config['mcp-config'] = mcpConfig;
      this.writeConfigFile(config);
      this.logger.logConfig('write', 'mcp_config', { 
        hasMCPConfig: !!mcpConfig, 
        serverCount: Object.keys(mcpConfig).length 
      });
    } catch (error) {
      this.logger.error('CONFIG', 'Failed to save MCP config', error as Error);
      throw error;
    }
  }
}
