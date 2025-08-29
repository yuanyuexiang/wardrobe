import { ApolloClient, ApolloProvider, createHttpLink, from, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import React from 'react';

// 检测环境
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
const isWeb = typeof window !== 'undefined';

// 选择API端点
const getApiUri = () => {
  console.log('环境检测:', { 
    NODE_ENV: process.env.NODE_ENV, 
    isDev, 
    isWeb,
    window: typeof window,
    __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined'
  });
  
  if (isWeb) {
    // Web平台，使用本地代理
    const proxyUri = 'http://localhost:3001/api/graphql';
    console.log('🔄 Web环境使用代理:', proxyUri);
    return proxyUri;
  } else {
    // 移动端，直接连接
    const directUri = 'https://forge.matrix-net.tech/graphql';
    console.log('📱 移动端直接连接API:', directUri);
    return directUri;
  }
};

const httpLink = createHttpLink({
  uri: getApiUri(),
  fetchOptions: {
    mode: 'cors',
  },
});

const token = 'CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD';

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
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }

  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
    console.log('Network error details:', networkError);
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    // 兼容 Apollo Client 3.14.0 的配置
    addTypename: true,
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
  // 确保没有使用已废弃的选项
  connectToDevTools: isDev,
});

const WardrobeApolloProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ApolloProvider client={client}>{children}</ApolloProvider>
);

export default WardrobeApolloProvider;
