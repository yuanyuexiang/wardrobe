import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import React from 'react';
import { API_CONFIG } from '../config/api';
import { logger } from '../utils/logger';

// 选择API端点
const getApiUri = () => {
  // 重新检测环境，确保在运行时检测
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isWebEnvironment = typeof window !== 'undefined';
  const currentHost = typeof window !== 'undefined' ? window.location?.hostname : '';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  // 环境检测和日志记录
  logger.info('WardrobeApolloProvider', `环境检测 - isDev: ${isDev}, isWeb: ${isWebEnvironment}, host: ${currentHost}, isLocalhost: ${isLocalhost}`);
  
  // 在Web环境且为开发模式时使用代理
  if (isWebEnvironment && isDev && isLocalhost) {
    // Web平台，使用本地代理
    const proxyUri = 'http://localhost:3001/api/graphql';
    logger.info('WardrobeApolloProvider', `Web环境使用代理: ${proxyUri}`);
    return proxyUri;
  } else {
    // 服务器端渲染或移动端，直接连接
    const directUri = API_CONFIG.GRAPHQL_ENDPOINT;
    logger.info('WardrobeApolloProvider', `直接连接API: ${directUri}`);
    return directUri;
  }
};

const httpLink = createHttpLink({
  uri: getApiUri(),
  fetchOptions: {
    mode: 'cors',
  },
});

const token = process.env.EXPO_PUBLIC_AUTH_TOKEN || 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD';

const authLink = setContext((_: any, context: any) => ({
  headers: {
    ...context.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
}));

// 错误处理链接
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      logger.error('WardrobeApolloProvider', `GraphQL错误 - 消息: ${message}, 位置: ${locations}, 路径: ${path}`)
    );
  }

  if (networkError) {
    logger.error('WardrobeApolloProvider', `网络错误: ${networkError.message}`, networkError.toString());
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    // 移除已废弃的 addTypename 选项
    typePolicies: {},
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
  // 使用新的 devtools 配置
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
  },
});

const WardrobeApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ApolloProvider client={client}>{children}</ApolloProvider>
);

export default WardrobeApolloProvider;
