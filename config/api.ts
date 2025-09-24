// API配置文件 - 从环境变量读取配置
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://forge.kcbaotech.com';

export const API_CONFIG = {
  // 主API地址
  BASE_URL: BASE_URL,
  
  // GraphQL端点
  GRAPHQL_ENDPOINT: `${BASE_URL}/graphql`,
  SYSTEM_GRAPHQL_ENDPOINT: `${BASE_URL}/graphql/system`,
  
  // 资源文件地址
  ASSETS_URL: `${BASE_URL}/assets`,
  
  // 认证Token
  AUTH_TOKEN: process.env.EXPO_PUBLIC_AUTH_TOKEN || 'CCZnVSanwCwzS6edoC8t2ImbzJiZLeAD',
  
  // 代理配置（开发环境）
  PROXY: {
    HOST: process.env.EXPO_PUBLIC_PROXY_HOST || 'localhost',
    PORT: parseInt(process.env.EXPO_PUBLIC_PROXY_PORT || '3001'),
    TARGET_HOST: process.env.EXPO_PUBLIC_PROXY_TARGET_HOST || 'forge.kcbaotech.com',
    TARGET_PORT: parseInt(process.env.EXPO_PUBLIC_PROXY_TARGET_PORT || '443'),
  },
  
  // 应用配置
  APP: {
    NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Wardrobe',
    VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.1',
  },
};

// 工具函数：构建资源URL
export const getAssetUrl = (assetId: string) => {
  return `${API_CONFIG.ASSETS_URL}/${assetId}`;
};

// 工具函数：构建API URL
export const getApiUrl = (path: string) => {
  return `${API_CONFIG.BASE_URL}${path}`;
};

// 环境检测工具
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
};

// 配置验证（开发环境下显示警告）
if (isDevelopment()) {
  console.log('🔧 API配置:', {
    baseUrl: API_CONFIG.BASE_URL,
    proxyHost: `${API_CONFIG.PROXY.HOST}:${API_CONFIG.PROXY.PORT}`,
    appVersion: API_CONFIG.APP.VERSION,
  });
  
  if (API_CONFIG.AUTH_TOKEN === 'CCZnVSanwCwzS6edoC8t2ImbzJiZLeAD') {
    console.warn('⚠️  使用默认AUTH_TOKEN，生产环境请更换！');
  }
}
