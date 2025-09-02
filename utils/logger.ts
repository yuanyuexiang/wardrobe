/**
 * 日志管理工具
 * 统一管理应用中的日志输出，方便调试和生产环境控制
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  enableConsole: boolean;
  enablePersist: boolean;
  logLevel: LogLevel;
}

class Logger {
  private config: LogConfig;

  constructor(config: Partial<LogConfig> = {}) {
    this.config = {
      enableConsole: __DEV__, // 开发环境启用控制台输出
      enablePersist: false, // 暂不启用持久化
      logLevel: 'debug',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.config.logLevel];
  }

  private formatMessage(level: LogLevel, tag: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
    return data ? `${formattedMessage} ${JSON.stringify(data)}` : formattedMessage;
  }

  debug(tag: string, message: string, data?: any) {
    if (!this.shouldLog('debug')) return;
    
    if (this.config.enableConsole) {
      console.log(this.formatMessage('debug', tag, message, data));
    }
  }

  info(tag: string, message: string, data?: any) {
    if (!this.shouldLog('info')) return;
    
    if (this.config.enableConsole) {
      console.info(this.formatMessage('info', tag, message, data));
    }
  }

  warn(tag: string, message: string, data?: any) {
    if (!this.shouldLog('warn')) return;
    
    if (this.config.enableConsole) {
      console.warn(this.formatMessage('warn', tag, message, data));
    }
  }

  error(tag: string, message: string, error?: any) {
    if (!this.shouldLog('error')) return;
    
    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', tag, message, error));
    }
  }

  // 特殊方法：GraphQL 错误日志
  graphqlError(operation: string, errors: any[], networkError?: any) {
    if (errors?.length > 0) {
      errors.forEach((error, index) => {
        this.error('GraphQL', `Operation: ${operation}, Error ${index + 1}`, {
          message: error.message,
          locations: error.locations,
          path: error.path,
        });
      });
    }

    if (networkError) {
      this.error('Network', `Operation: ${operation}`, {
        message: networkError.message,
        statusCode: networkError.statusCode,
        networkError,
      });
    }
  }

  // 特殊方法：API 请求日志
  apiRequest(method: string, url: string, data?: any) {
    this.debug('API', `${method} ${url}`, data);
  }

  apiResponse(method: string, url: string, status: number, data?: any) {
    this.info('API', `${method} ${url} - ${status}`, data);
  }
}

// 创建全局日志实例
export const logger = new Logger();

// 导出类型供其他模块使用
export type { LogLevel, LogConfig };
