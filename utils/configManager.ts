import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

export interface AppConfig {
  authToken: string;
  apiBaseUrl: string;
  isConfigured: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  authToken: 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD',
  apiBaseUrl: 'https://forge.matrix-net.tech',
  isConfigured: false,
};

const STORAGE_KEY = '@wardrobe_config';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private listeners: Array<(config: AppConfig) => void> = [];
  private initialized: boolean = false;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async loadConfig(): Promise<AppConfig> {
    try {
      const savedConfig = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = { ...DEFAULT_CONFIG, ...parsedConfig };
        logger.info('ConfigManager', '配置加载成功', this.config);
      } else {
        logger.info('ConfigManager', '使用默认配置');
        this.config = { ...DEFAULT_CONFIG };
      }
    } catch (error) {
      logger.error('ConfigManager', '加载配置失败，使用默认配置', error);
      this.config = { ...DEFAULT_CONFIG };
    }
    
    this.initialized = true;
    this.notifyListeners();
    return { ...this.config };
  }

  async saveConfig(newConfig: Partial<AppConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...newConfig };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      logger.info('ConfigManager', '配置保存成功', this.config);
      this.notifyListeners();
    } catch (error) {
      logger.error('ConfigManager', '保存配置失败', error);
      throw error;
    }
  }

  getConfig(): AppConfig {
    if (!this.initialized) {
      logger.warn('ConfigManager', '配置尚未初始化，返回默认配置');
      return { ...DEFAULT_CONFIG };
    }
    return { ...this.config };
  }

  isConfigured(): boolean {
    if (!this.initialized) {
      return false;
    }
    return this.config.isConfigured;
  }

  getAuthToken(): string {
    if (!this.initialized) {
      return DEFAULT_CONFIG.authToken;
    }
    return this.config.authToken;
  }

  getApiConfig() {
    if (!this.initialized) {
      return {
        baseUrl: DEFAULT_CONFIG.apiBaseUrl,
        authToken: DEFAULT_CONFIG.authToken,
      };
    }
    return {
      baseUrl: this.config.apiBaseUrl,
      authToken: this.config.authToken,
    };
  }

  // 监听配置变化
  addListener(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        logger.error('ConfigManager', '配置监听器执行失败', error);
      }
    });
  }

  // 重置配置
  async resetConfig(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.config = DEFAULT_CONFIG;
      logger.info('ConfigManager', '配置已重置');
      this.notifyListeners();
    } catch (error) {
      logger.error('ConfigManager', '重置配置失败', error);
      throw error;
    }
  }

  // 验证配置
  validateConfig(config: Partial<AppConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.authToken?.trim()) {
      errors.push('认证Token不能为空');
    }

    if (!config.apiBaseUrl?.trim()) {
      errors.push('API地址不能为空');
    } else if (!this.isValidUrl(config.apiBaseUrl)) {
      errors.push('API地址格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidPort(port: string): boolean {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  }
}

export const configManager = ConfigManager.getInstance();
