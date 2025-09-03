# 🔧 EAS Build 路径别名问题修复总结

## 🐛 问题描述

EAS Build 构建失败，错误信息：
```
Error: Unable to resolve module @/components/ThemedText from /home/expo/workingdir/build/app/+not-found.tsx
```

## 🔍 根本原因

1. **路径别名解析问题**: EAS Build 云端环境无法正确解析 TypeScript 路径别名 `@/components/*`
2. **缺少 Metro 配置**: 没有配置 Metro bundler 的路径别名解析
3. **缺少 Babel 插件**: 没有安装和配置 `babel-plugin-module-resolver`
4. **网络代理问题**: 上传到 EAS 服务器时需要代理访问

## ✅ 解决方案

### 1. 创建 Metro 配置 (`metro.config.js`)
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 配置路径别名解析
config.resolver.alias = {
  '@': path.resolve(__dirname),
};

config.resolver.platforms = ['native', 'ios', 'android', 'web'];

module.exports = config;
```

### 2. 增强 TypeScript 配置 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/constants/*": ["./constants/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/utils/*": ["./utils/*"],
      "@/config/*": ["./config/*"],
      "@/types/*": ["./types/*"],
      "@/screens/*": ["./screens/*"]
    },
    "moduleResolution": "node"
  }
}
```

### 3. 配置 Babel 插件 (`babel.config.js`)
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': '.',
            '@/components': './components',
            '@/constants': './constants',
            '@/hooks': './hooks',
            '@/utils': './utils',
            '@/config': './config',
            '@/types': './types',
            '@/screens': './screens',
          },
        },
      ],
    ],
  };
};
```

### 4. 安装必要依赖
```bash
npm install --save-dev babel-plugin-module-resolver
```

### 5. 修复 EAS.json 配置
移除了不允许的 `"platform": "android"` 字段：
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { /* 环境变量 */ }
    }
  }
}
```

### 6. 设置网络代理
```bash
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
export all_proxy=http://127.0.0.1:7890
```

## 🚀 构建命令

### 开发构建
```bash
# 设置代理（如果需要）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 开始构建
eas build --profile development --platform android
```

### 生产构建
```bash
# 设置代理（如果需要）
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890

# 开始构建
eas build --profile production --platform android
```

## 📋 验证步骤

1. ✅ **配置文件**: Metro、Babel、TypeScript 配置已更新
2. ✅ **依赖安装**: babel-plugin-module-resolver 已安装
3. ✅ **EAS 配置**: eas.json 格式已修正
4. ✅ **代理设置**: 网络代理已配置
5. 🔄 **构建测试**: 正在进行开发构建测试

## 🔧 故障排除

### 如果路径解析仍有问题
1. 清除缓存: `npx expo start --clear`
2. 重启 Metro: `npx expo r --clear`
3. 检查导入路径是否正确

### 如果网络上传失败
1. 确认代理设置: `echo $http_proxy`
2. 测试网络连接: `curl -I https://expo.dev`
3. 尝试重新构建: `eas build --profile development --platform android`

### 如果构建仍然失败
1. 查看详细日志: `eas build:list`
2. 检查构建输出中的具体错误
3. 确认所有环境变量正确设置

## 📚 相关文档

- [Metro Configuration](https://docs.expo.dev/guides/customizing-metro/)
- [Babel Plugin Module Resolver](https://github.com/tleunen/babel-plugin-module-resolver)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)
