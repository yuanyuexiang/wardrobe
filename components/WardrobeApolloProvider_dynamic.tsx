import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { logger } from '../utils/logger';
import { configManager } from '../utils/configManager';

// 选择API端点 - 支持动态配置
const getApiUri = () => {
  const config = configManager.getApiConfig();
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  const isWebEnvironment = typeof window !== 'undefined';
  const currentHost = typeof window !== 'undefined' ? window.location?.hostname : '';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  logger.info('WardrobeApolloProvider', `环境检测 - isDev: ${isDev}, isWeb: ${isWebEnvironment}, host: ${currentHost}, isLocalhost: ${isLocalhost}`);
  
  // 在Web环境且为开发模式时使用代理
  if (isWebEnvironment && isDev && isLocalhost) {
    const proxyUri = `http://localhost:${config.proxyPort}/api/graphql`;
    logger.info('WardrobeApolloProvider', `Web环境使用代理: ${proxyUri}`);
    return proxyUri;
  } else {
    const directUri = `${config.baseUrl}/graphql`;
    logger.info('WardrobeApolloProvider', `直接连接API: ${directUri}`);
    return directUri;
  }
};

// 创建动态Apollo客户端
const createApolloClient = () => {
  const httpLink = createHttpLink({
    uri: getApiUri(),
    fetchOptions: {
      mode: 'cors',
    },
  });

  const authLink = setContext((_: any, context: any) => {
    const token = configManager.getAuthToken();
    return {
      headers: {
        ...context.headers,
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    };
  });

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

  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
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
    devtools: {
      enabled: process.env.NODE_ENV === 'development',
    },
  });
};

const WardrobeApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ApolloClient<any> | null>(null);

  useEffect(() => {
    // 初始化客户端
    const initializeClient = () => {
      const newClient = createApolloClient();
      setClient(newClient);
      logger.info('WardrobeApolloProvider', 'Apollo客户端初始化完成');
    };

    initializeClient();

    // 监听配置变化，重新创建客户端
    const unsubscribe = configManager.addListener(() => {
      logger.info('WardrobeApolloProvider', '配置发生变化，重新创建Apollo客户端');
      initializeClient();
    });

    return unsubscribe;
  }, []);

  if (!client) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default WardrobeApolloProvider;
