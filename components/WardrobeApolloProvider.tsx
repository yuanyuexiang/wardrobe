import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import React, { useEffect, useState } from 'react';
import { configManager } from '../utils/configManager';
import { logger } from '../utils/logger';

// 动态创建 Apollo Client，使用配置管理器的配置
const createApolloClient = (apiBaseUrl: string, authToken: string) => {
  // 运行时环境检测
  const isDev = process.env.NODE_ENV === 'development';
  const isWebEnvironment = typeof window !== 'undefined';
  const currentHost = isWebEnvironment ? window.location?.hostname : '';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

  let apiUri: string;
  
  // 在Web开发环境且为localhost时使用代理
  if (isWebEnvironment && isDev && isLocalhost) {
    apiUri = `http://localhost:3001/api/graphql`;
    logger.info('WardrobeApolloProvider', `Web开发环境使用代理: ${apiUri}`);
  } else {
    apiUri = `${apiBaseUrl}/graphql`;
    logger.info('WardrobeApolloProvider', `直接连接API: ${apiUri}`);
  }

  const httpLink = createHttpLink({
    uri: apiUri,
    fetchOptions: {
      mode: 'cors',
    },
  });

  const authLink = setContext((_: any, context: any) => ({
    headers: {
      ...context.headers,
      Authorization: `Bearer ${authToken}`,
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

  return new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
};

const WardrobeApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ApolloClient<any> | null>(null);

  useEffect(() => {
    const initializeClient = async () => {
      // 加载配置
      await configManager.loadConfig();
      const config = configManager.getConfig();
      
      // 使用配置创建 Apollo Client
      const apolloClient = createApolloClient(
        config.apiBaseUrl,
        config.authToken
      );
      
      setClient(apolloClient);
      logger.info('WardrobeApolloProvider', '使用配置初始化Apollo Client', {
        apiBaseUrl: config.apiBaseUrl,
        authToken: config.authToken.substring(0, 8) + '...'
      });
    };

    initializeClient();

    // 监听配置变化，重新创建客户端
    const unsubscribe = configManager.addListener((newConfig) => {
      logger.info('WardrobeApolloProvider', '配置已更新，重新创建Apollo Client');
      const newClient = createApolloClient(
        newConfig.apiBaseUrl,
        newConfig.authToken
      );
      setClient(newClient);
    });

    return unsubscribe;
  }, []);

  // 如果客户端还没准备好，显示加载状态
  if (!client) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        正在初始化...
      </div>
    );
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

export default WardrobeApolloProvider;
