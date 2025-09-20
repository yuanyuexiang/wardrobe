import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import 'react-native-reanimated';
import FullscreenConfig from '../components/FullscreenConfig';
import WardrobeApolloProvider from '../components/WardrobeApolloProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { logger } from '../utils/logger';
import { deviceStartupManager, AppStartupState, TerminalInfo, DeviceStartupInfo } from '../utils/deviceStartupManager';

import { useColorScheme } from '../hooks/useColorScheme';

// 防止启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [startupState, setStartupState] = useState<AppStartupState>('loading');
  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceStartupInfo | null>(null);
  const [splashReady, setSplashReady] = useState(false);

  // 启动屏控制：确保显示至少3秒
  useEffect(() => {
    const minSplashTime = 3000; // 3秒
    const startTime = Date.now();

    const hideSplashWhenReady = async () => {
      // 等待字体加载和启动检查完成
      if (loaded && startupState !== 'loading') {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);
        
        logger.info('RootLayout', `启动屏控制 - 已用时: ${elapsedTime}ms, 剩余等待: ${remainingTime}ms`);
        
        if (remainingTime > 0) {
          setTimeout(async () => {
            await SplashScreen.hideAsync();
            setSplashReady(true);
            logger.info('RootLayout', '启动屏已隐藏（等待完成）');
          }, remainingTime);
        } else {
          await SplashScreen.hideAsync();
          setSplashReady(true);
          logger.info('RootLayout', '启动屏已隐藏（检查完成）');
        }
      }
    };

    hideSplashWhenReady();
  }, [loaded, startupState]);

  // 检查应用启动状态
  useEffect(() => {
    const checkStartup = async () => {
      try {
        logger.info('RootLayout', '开始检查应用启动状态');
        const result = await deviceStartupManager.checkStartupState();
        
        setStartupState(result.state);
        setTerminalInfo(result.terminalInfo || null);
        setDeviceInfo(result.deviceInfo || null);
        
        logger.info('RootLayout', '启动状态检查完成', { 
          state: result.state, 
          hasTerminal: !!result.terminalInfo,
          hasAuthorizedBoutique: !!result.terminalInfo?.authorized_boutique
        });
      } catch (error) {
        logger.error('RootLayout', '启动状态检查失败', String(error));
        setStartupState('error');
      }
    };

    // 只有字体加载完成后才开始检查
    if (loaded) {
      checkStartup();
    }
  }, [loaded]);

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

  if (!loaded || !splashReady) {
    // 字体未加载或启动屏未准备好时，返回空视图（让原生启动屏继续显示）
    return null;
  }

  // 根据启动状态渲染不同界面
  if (startupState === 'loading') {
    // 正在检查启动状态
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>正在检查设备状态...</Text>
      </View>
    );
  }

  if (startupState === 'first_time') {
    // 第一次使用，显示设备注册界面
    const DeviceRegistrationScreen = require('../screens/DeviceRegistrationScreen').default;
    return (
      <ErrorBoundary 
        onError={(error, errorInfo) => {
          logger.error('App', '应用级错误', { error: error.message, errorInfo });
        }}
      >
        <WardrobeApolloProvider>
          <FullscreenConfig />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <DeviceRegistrationScreen deviceInfo={deviceInfo} />
            <StatusBar style="auto" />
          </ThemeProvider>
        </WardrobeApolloProvider>
      </ErrorBoundary>
    );
  }

  if (startupState === 'pending_approval') {
    // 设备等待审批
    const PendingApprovalScreen = require('../screens/PendingApprovalScreen').default;
    return (
      <ErrorBoundary 
        onError={(error, errorInfo) => {
          logger.error('App', '应用级错误', { error: error.message, errorInfo });
        }}
      >
        <WardrobeApolloProvider>
          <FullscreenConfig />
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <PendingApprovalScreen terminalInfo={terminalInfo} deviceInfo={deviceInfo} />
            <StatusBar style="auto" />
          </ThemeProvider>
        </WardrobeApolloProvider>
      </ErrorBoundary>
    );
  }

  if (startupState === 'error') {
    // 检查过程出错
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#dc2626', fontWeight: '600', marginBottom: 8 }}>启动检查失败</Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
          无法检查设备状态，请检查网络连接或联系管理员
        </Text>
        
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
          <Text 
            style={{ fontSize: 16, color: '#007AFF', textDecorationLine: 'underline', paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => {
              // 重新检查启动状态
              setStartupState('loading');
              deviceStartupManager.checkStartupState().then(result => {
                setStartupState(result.state);
                setTerminalInfo(result.terminalInfo || null);
                setDeviceInfo(result.deviceInfo || null);
              }).catch(() => {
                setStartupState('error');
              });
            }}
          >
            重试
          </Text>
          
          <Text 
            style={{ fontSize: 16, color: '#34C759', textDecorationLine: 'underline', paddingHorizontal: 16, paddingVertical: 8 }}
            onPress={() => {
              // 跳过设备检查，直接进入配置
              setStartupState('first_time');
            }}
          >
            进入配置
          </Text>
        </View>
      </View>
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
