import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import WardrobeApolloProvider from '../components/WardrobeApolloProvider';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // 处理MetaMask相关错误
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      // 全局错误处理
      const handleError = (event: ErrorEvent) => {
        if (event.message.includes('MetaMask') || 
            event.message.includes('ethereum') || 
            event.message.includes('connect') ||
            event.filename?.includes('nkbihfbeogaeaoehlefnkodbefgpgknn')) {
          console.warn('🦊 MetaMask相关错误已被忽略:', event.message);
          event.preventDefault();
          return false;
        }
      };

      // 处理未捕获的Promise拒绝
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason?.toString() || '';
        if (reason.includes('MetaMask') || 
            reason.includes('ethereum') || 
            reason.includes('connect')) {
          console.warn('🦊 MetaMask Promise错误已被忽略:', reason);
          event.preventDefault();
        }
      };

      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
      <WardrobeApolloProvider>
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
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </WardrobeApolloProvider>
  );
}
