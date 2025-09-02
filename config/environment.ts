/**
 * 环境配置管理
 * 安全地管理敏感信息和环境变量
 */

interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  SYSTEM_API_BASE_URL: string;
  ASSETS_BASE_URL: string;
  // 注意：生产环境中应该从安全的环境变量中读取
  AUTH_TOKEN?: string;
  PROXY_HOST: string;
  PROXY_PORT: number;
}

// 环境检测函数
const getEnvironment = (): Environment => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  // 基础API地址 - 生产环境应该从环境变量读取
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://forge.matrix-net.tech';
  
  return {
    NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
    API_BASE_URL: baseUrl,
    SYSTEM_API_BASE_URL: `${baseUrl}/graphql/system`,
    ASSETS_BASE_URL: `${baseUrl}/assets`,
    
    // ⚠️ 警告：这个token应该在生产环境中通过安全的方式管理
    // 建议使用：process.env.EXPO_PUBLIC_AUTH_TOKEN
    AUTH_TOKEN: isDev ? 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD' : process.env.EXPO_PUBLIC_AUTH_TOKEN,
    
    PROXY_HOST: 'localhost',
    PROXY_PORT: 3001,
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
