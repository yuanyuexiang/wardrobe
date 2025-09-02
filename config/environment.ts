/**
 * 环境配置管理
 * 统一从 .env 文件读取环境变量
 */

interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  SYSTEM_API_BASE_URL: string;
  ASSETS_BASE_URL: string;
  AUTH_TOKEN: string;
  PROXY_HOST: string;
  PROXY_PORT: number;
  APP_NAME: string;
  APP_VERSION: string;
}

// 环境配置函数 - 从 .env 文件读取
const getEnvironment = (): Environment => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://forge.matrix-net.tech';
  
  return {
    NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
    API_BASE_URL: baseUrl,
    SYSTEM_API_BASE_URL: `${baseUrl}/graphql/system`,
    ASSETS_BASE_URL: `${baseUrl}/assets`,
    AUTH_TOKEN: process.env.EXPO_PUBLIC_AUTH_TOKEN || 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD',
    PROXY_HOST: process.env.EXPO_PUBLIC_PROXY_HOST || 'localhost',
    PROXY_PORT: parseInt(process.env.EXPO_PUBLIC_PROXY_PORT || '3001'),
    APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Wardrobe',
    APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.1',
  };
};

export const ENV = getEnvironment();

// 工具函数
export const isDevelopment = () => ENV.NODE_ENV === 'development';
export const isProduction = () => ENV.NODE_ENV === 'production';

// API URL 构建函数
export const buildApiUrl = (path: string = ''): string => {
  return `${ENV.API_BASE_URL}${path}`;
};

export const buildSystemApiUrl = (path: string = ''): string => {
  return `${ENV.SYSTEM_API_BASE_URL}${path}`;
};

export const buildAssetUrl = (assetId: string): string => {
  return `${ENV.ASSETS_BASE_URL}/${assetId}`;
};

// 代理URL构建（仅开发环境）
export const buildProxyUrl = (endpoint: 'graphql' | 'system'): string => {
  if (!isDevelopment()) {
    throw new Error('代理URL只能在开发环境中使用');
  }
  
  const path = endpoint === 'system' ? '/api/graphql/system' : '/api/graphql';
  return `http://${ENV.PROXY_HOST}:${ENV.PROXY_PORT}${path}`;
};

// 开发环境配置检查
if (isDevelopment()) {
  console.log('🔧 环境配置:', {
    nodeEnv: ENV.NODE_ENV,
    apiUrl: ENV.API_BASE_URL,
    proxyUrl: `http://${ENV.PROXY_HOST}:${ENV.PROXY_PORT}`,
    appInfo: `${ENV.APP_NAME} v${ENV.APP_VERSION}`,
  });
  
  if (ENV.AUTH_TOKEN === 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD') {
    console.warn('⚠️  使用默认AUTH_TOKEN，生产环境请更换！');
  }
}

export default ENV;
