import { API_CONFIG } from '../config/api';

export interface AppConfig {
  apiBaseUrl: string;
  authToken: string;
  appName: string;
  appVersion: string;
  selectedBoutiqueId?: string;
  selectedBoutiqueName?: string;
  isConfigured?: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: API_CONFIG.BASE_URL,
  authToken: API_CONFIG.AUTH_TOKEN,
  appName: API_CONFIG.APP.NAME,
  appVersion: API_CONFIG.APP.VERSION,
  selectedBoutiqueId: '',
  selectedBoutiqueName: '',
  isConfigured: false,
};

class SimpleConfigManager {
  private config: AppConfig = { ...DEFAULT_CONFIG };
  private listeners: Array<(config: AppConfig) => void> = [];

  async loadConfig(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    this.notifyListeners();
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  async saveConfig(newConfig: Partial<AppConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    this.notifyListeners();
  }

  async resetConfig(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    this.notifyListeners();
  }

  addListener(listener: (config: AppConfig) => void): () => void {
    this.listeners.push(listener);
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
        console.error('配置监听器执行错误:', error);
      }
    });
  }
}

export const configManager = new SimpleConfigManager();
