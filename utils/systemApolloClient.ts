import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { API_CONFIG } from '../config/api';
import { logger } from './logger';

// 选择系统API端点
const getSystemApiUri = () => {
  // 检测环境
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isWebEnvironment = typeof window !== 'undefined';
  const currentHost = typeof window !== 'undefined' ? window.location?.hostname : '';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  logger.info('SystemApolloClient', `系统API环境检测 - NODE_ENV: ${process.env.NODE_ENV}, isDev: ${isDev}, isWeb: ${isWebEnvironment}, host: ${currentHost}, isLocalhost: ${isLocalhost}`);
  
  // 在Web环境且为开发模式时使用代理
  if (isWebEnvironment && isDev && isLocalhost) {
    // Web平台，使用本地代理
    const proxyUri = 'http://localhost:3001/api/graphql/system';
    logger.info('SystemApolloClient', `Web环境使用系统API代理: ${proxyUri}`);
    return proxyUri;
  } else {
    // 服务器端渲染或移动端，直接连接
    const directUri = API_CONFIG.SYSTEM_GRAPHQL_ENDPOINT;
    logger.info('SystemApolloClient', `直接连接系统API: ${directUri}`);
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

  const token = process.env.EXPO_PUBLIC_AUTH_TOKEN || 'CCZnVSanwCwzS6edoC8t2ImbzJiZLeAD';

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
