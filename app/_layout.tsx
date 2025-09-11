import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import FullscreenConfig from '../components/FullscreenConfig';
import WardrobeApolloProvider from '../components/WardrobeApolloProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { logger } from '../utils/logger';
import { configManager } from '../utils/configManager';

import { useColorScheme } from '../hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // 添加小延迟确保所有依赖都已初始化
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('RootLayout: 开始加载配置');
        const config = await configManager.loadConfig();
        console.log('RootLayout: 配置加载完成', { 
          isConfigured: config.isConfigured,
          selectedBoutiqueId: config.selectedBoutiqueId,
          selectedBoutiqueName: config.selectedBoutiqueName
        });
        setIsConfigured(config.isConfigured);
        logger.info('RootLayout', '配置加载完成', { isConfigured: config.isConfigured });
      } catch (error) {
        console.error('RootLayout: 配置加载失败', error);
        logger.error('RootLayout', '配置加载失败', error);
        // 如果配置加载失败，默认为未配置状态
        setIsConfigured(false);
      } finally {
        setConfigLoaded(true);
      }
    };

    loadConfig();
  }, []);

  // 配置变化监听
  useEffect(() => {
    const unsubscribe = configManager.addListener((config) => {
      setIsConfigured(config.isConfigured);
      logger.info('RootLayout', '配置状态更新', { isConfigured: config.isConfigured });
    });

    return unsubscribe;
  }, []);

  // 忽略浏览器扩展错误（仅在 Web 环境中）
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const originalError = console.error;
      console.error = (...args) => {
        const message = args[0]?.toString() || '';
        if (message.includes('MetaMask') || 
            message.includes('chrome-extension://') ||
            message.includes('Failed to connect to MetaMask')) {
          return; // 忽略扩展错误
        }
        originalError.apply(console, args);
      };

      // 全局错误处理
      const handleError = (event: ErrorEvent) => {
        if (event.message?.includes('MetaMask') || 
            event.filename?.includes('chrome-extension://')) {
          event.preventDefault();
          return false;
        }
      };

      window.addEventListener('error', handleError);
      
      return () => {
        console.error = originalError;
        window.removeEventListener('error', handleError);
      };
    }
  }, []);

  if (!loaded) {
    // 显示加载屏幕
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

  // 配置检查逻辑：如果未配置，先显示配置页
  if (!isConfigured) {
    console.log('RootLayout: 应用未配置，显示配置页面', { isConfigured, configLoaded });
    logger.info('RootLayout', '应用未配置，显示配置页面');
    // 直接导入并渲染配置组件
    const ConfigScreen = require('../screens/ConfigScreen').default;
    return (
      <ErrorBoundary 
        onError={(error, errorInfo) => {
          logger.error('App', '应用级错误', { error: error.message, errorInfo });
        }}
      >
        <WardrobeApolloProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <ConfigScreen />
            <StatusBar style="auto" />
          </ThemeProvider>
        </WardrobeApolloProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary 
      onError={(error, errorInfo) => {
        logger.error('App', '应用级错误', { error: error.message, errorInfo });
      }}
    >
      <WardrobeApolloProvider>
        <FullscreenConfig />
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="ProductDetail" 
              options={{ 
                title: '商品详情',
                headerShown: true,
                presentation: 'card'
              }} 
            />
            <Stack.Screen 
              name="config" 
              options={{ 
                title: '应用配置',
                headerShown: false,
                presentation: 'modal'
              }} 
            />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" hidden={true} />
        </ThemeProvider>
      </WardrobeApolloProvider>
    </ErrorBoundary>
  );
}
