/**
 * 应用级常量配置
 * 统一管理应用中的布局、尺寸等常量，避免重复计算
 */
import { Dimensions, Platform } from 'react-native';

export const SCREEN_DIMENSIONS = Dimensions.get('window');

// 布局常量
export const LAYOUT = {
  // 屏幕尺寸
  screenWidth: SCREEN_DIMENSIONS.width,
  screenHeight: SCREEN_DIMENSIONS.height,
  
  // 水平间距
  HORIZONTAL_PADDING: 32, // 左右各16px padding
  
  // 卡片间距
  ITEM_SEPARATOR: 12,
  
  // 可见卡片数量
  VISIBLE_CARDS: 2.2, // 显示2.2个卡片，创造滑动效果
} as const;

// 选项卡高度（独立定义以支持Platform.select）
export const TAB_BAR_HEIGHT = Platform.select({
  ios: 83, // iOS底部选项卡高度 + 安全区域
  android: 70, // Android底部选项卡高度
  default: 70,
}) as number;

// 计算卡片宽度
export const getCardWidth = () => {
  const { width: screenWidth } = SCREEN_DIMENSIONS;
  return (screenWidth - LAYOUT.HORIZONTAL_PADDING - LAYOUT.ITEM_SEPARATOR * (LAYOUT.VISIBLE_CARDS - 1)) / LAYOUT.VISIBLE_CARDS;
};

// 计算底部安全距离
export const getBottomPadding = () => {
  return TAB_BAR_HEIGHT + 16; // 选项卡高度 + 额外间距
};
