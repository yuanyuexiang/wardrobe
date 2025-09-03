const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 配置路径别名解析
config.resolver.alias = {
  '@': path.resolve(__dirname),
};

// 确保路径解析正确
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

module.exports = config;
