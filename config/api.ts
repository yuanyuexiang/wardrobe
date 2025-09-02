// API配置文件
const BASE_URL = 'https://forge.matrix-net.tech';

export const API_CONFIG = {
  // 主API地址
  BASE_URL: BASE_URL,
  
  // GraphQL端点
  GRAPHQL_ENDPOINT: `${BASE_URL}/graphql`,
  SYSTEM_GRAPHQL_ENDPOINT: `${BASE_URL}/graphql/system`,
  
  // 资源文件地址
  ASSETS_URL: `${BASE_URL}/assets`,
  
  // 代理配置（开发环境）
  PROXY: {
    HOST: 'localhost',
    PORT: 3001,
    TARGET_HOST: 'forge.matrix-net.tech',
    TARGET_PORT: 443,
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

// 环境配置：如果需要更换后端，只需要修改这里的BASE_URL即可
// 例如：
// const BASE_URL = 'https://your-new-backend.com';
// const BASE_URL = 'http://localhost:8055'; // 本地开发
// const BASE_URL = 'https://staging.your-backend.com'; // 测试环境
