/**
 * 🔧 环境配置管理 - EAS Build 兼容版本
 * 
 * 支持多种环境变量来源：
 * 1. 本地开发：.env 文件
 * 2. EAS Build：eas.json 中的 env 配置
 * 3. 运行时：直接设置的环境变量
 */

import Constants from 'expo-constants';

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

// 多层级环境变量读取函数
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // 1. 优先从运行时环境变量读取（EAS Build 会设置这些）
  if (process.env[key]) {
    return process.env[key] as string;
  }
  
  // 2. 从 expo-constants 读取（EAS Build 注入）
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key] as string;
  }
  
  // 3. 兼容 Constants.manifest（旧版本）
  if ((Constants as any).manifest?.extra?.[key]) {
    return (Constants as any).manifest.extra[key] as string;
  }
  
  // 4. 返回默认值
  return defaultValue;
};

// 环境配置函数 - 兼容多种部署方式
const getEnvironment = (): Environment => {
  const baseUrl = getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'https://forge.matrix-net.tech');
  
  return {
    NODE_ENV: (getEnvVar('NODE_ENV', 'development') as Environment['NODE_ENV']),
    API_BASE_URL: baseUrl,
    SYSTEM_API_BASE_URL: `${baseUrl}/graphql/system`,
    ASSETS_BASE_URL: `${baseUrl}/assets`,
    AUTH_TOKEN: getEnvVar('EXPO_PUBLIC_AUTH_TOKEN', 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD'),
    PROXY_HOST: getEnvVar('EXPO_PUBLIC_PROXY_HOST', 'localhost'),
    PROXY_PORT: parseInt(getEnvVar('EXPO_PUBLIC_PROXY_PORT', '3001')),
    APP_NAME: getEnvVar('EXPO_PUBLIC_APP_NAME', 'Wardrobe'),
    APP_VERSION: getEnvVar('EXPO_PUBLIC_APP_VERSION', '1.0.1'),
  };
};

export const ENV = getEnvironment();

// 工具函数
export const isDevelopment = () => ENV.NODE_ENV === 'development' || __DEV__;
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

// 开发环境配置检查和调试信息
if (isDevelopment()) {
  console.log('🔧 环境配置 (EAS Compatible):', {
    nodeEnv: ENV.NODE_ENV,
    isDev: __DEV__,
    apiUrl: ENV.API_BASE_URL,
    proxyUrl: `http://${ENV.PROXY_HOST}:${ENV.PROXY_PORT}`,
    appInfo: `${ENV.APP_NAME} v${ENV.APP_VERSION}`,
    buildSource: Constants.executionEnvironment,
  });
  
  if (ENV.AUTH_TOKEN === 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD') {
    console.warn('⚠️  使用默认AUTH_TOKEN，生产环境请更换！');
  }
  
  // 显示环境变量来源信息
  console.log('📊 环境变量来源分析:', {
    'process.env可用': !!process.env.EXPO_PUBLIC_API_BASE_URL,
    'Constants.expoConfig': !!Constants.expoConfig?.extra,
    'executionEnvironment': Constants.executionEnvironment,
  });
}

export default ENV;
