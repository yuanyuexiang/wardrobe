import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform, StatusBar } from 'react-native';

export default function FullscreenConfig() {
  useEffect(() => {
    const setupFullscreen = async () => {
      try {
        if (Platform.OS === 'android') {
          // 完全隐藏状态栏
          StatusBar.setHidden(true, 'fade');
          StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setTranslucent(true);
          
          // 隐藏导航栏并设置沉浸式模式
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } else if (Platform.OS === 'ios') {
          StatusBar.setHidden(true, 'fade');
        }
      } catch (error) {
        console.log('全屏设置失败:', error);
        // 降级到基本的状态栏隐藏
        StatusBar.setHidden(true, 'fade');
      }
    };

    setupFullscreen();
  }, []);

  return null;
}
