import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { API_CONFIG } from '../config/api';

// 选择系统API端点
const getSystemApiUri = () => {
  // 检测环境
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isRealWeb = typeof window !== 'undefined' && 
                    typeof document !== 'undefined' && 
                    typeof window.location !== 'undefined' &&
                    typeof window.addEventListener === 'function';

  console.log('系统API环境检测:', { 
    NODE_ENV: process.env.NODE_ENV, 
    isDev, 
    isWeb: isRealWeb
  });
  
  // 只有真正的Web环境才使用代理
  if (isRealWeb && isDev) {
    // Web平台，使用本地代理
    const proxyUri = 'http://localhost:3001/api/graphql/system';
    console.log('🔄 Web环境使用系统API代理:', proxyUri);
    return proxyUri;
  } else {
    // 服务器端渲染或移动端，直接连接
    const directUri = API_CONFIG.SYSTEM_GRAPHQL_ENDPOINT;
    console.log('📱 直接连接系统API:', directUri);
    return directUri;
  }
};

// 创建专门用于 system API 的 Apollo Client
const createSystemApolloClient = () => {
  const httpLink = createHttpLink({
    uri: getSystemApiUri(),
    fetchOptions: {
      mode: 'cors',
    },
  });

  const token = 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD';

  const authLink = setContext((_: any, context: any) => ({
    headers: {
      ...context.headers,
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  }));

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });
};

export const systemApolloClient = createSystemApolloClient();
