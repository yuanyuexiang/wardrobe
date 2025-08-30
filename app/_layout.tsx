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

  // 忽略浏览器扩展错误
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
