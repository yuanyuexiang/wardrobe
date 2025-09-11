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

### 7. 修复 React Native 兼容性 (`WardrobeApolloProvider.tsx`)
**问题**: 使用了 HTML `<div>` 元素导致 React Native 运行时错误
```
Invariant Violation: View config getter callback for component 'div' must be a function
```
**解决方案**: 替换为 React Native 原生组件
```tsx
// 错误的 HTML 元素用法
<div style={{ display: 'flex', ... }}>正在初始化...</div>

// 修复后的 React Native 组件
<View style={styles.loadingContainer}>
  <Text style={styles.loadingText}>正在初始化...</Text>
</View>
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
5. ✅ **Java 环境**: 升级到 Java 21 LTS，解决版本兼容性问题
6. ✅ **React Native 兼容性**: 修复 HTML 元素错误，替换为原生组件
7. 🔄 **本地构建测试**: 正在进行 Android 生产构建

## 🔧 故障排除

### 如果路径解析仍有问题
1. 清除缓存: `npx expo start --clear`
2. 重启 Metro: `npx expo r --clear`
3. 检查导入路径是否正确

### 如果网络上传失败
1. 确认代理设置: `echo $http_proxy`
2. 测试网络连接: `curl -I https://expo.dev`
3. 尝试重新构建: `eas build --profile development --platform android`

### 如果本地构建 Java 版本问题
1. **问题情况**:
   - `Android Gradle plugin requires Java 17 to run. You are currently using Java 14`
   - `Unsupported class file major version 68` (Java 24 版本过新)
2. **解决方案**: 安装 Java 17-21 (推荐 Java 21 LTS)
   ```bash
   # 1. 卸载不兼容版本 (如果需要)
   sudo rm -rf /Library/Java/JavaVirtualMachines/jdk-xx.jdk
   
   # 2. 下载并安装 Java 21 LTS
   # 从 Oracle 官网下载 JDK 21
   
   # 3. 配置环境变量
   export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home
   export PATH=$JAVA_HOME/bin:$PATH
   
   # 4. 验证版本
   java -version  # 应显示 java version "21.0.8"
   
   # 5. 本地构建
   eas build --platform android --local
   ```
3. **版本兼容性**:
   - ✅ Java 17-21: 推荐使用
   - ❌ Java 14: 版本过低
   - ❌ Java 24: 版本过新，Gradle 不支持
4. **永久配置**: 在 `~/.zshrc` 中添加环境变量设置

### 如果构建仍然失败
1. 查看详细日志: `eas build:list`
2. 检查构建输出中的具体错误
3. 确认所有环境变量正确设置

## ⏱️ 构建速度优化

### 构建慢的原因
1. **原生库编译**: React Native Reanimated, Gesture Handler 等需要编译 C++ 代码
2. **多架构支持**: 需要为 4 个架构编译：arm64-v8a, armeabi-v7a, x86, x86_64
3. **首次构建**: 需要下载和编译所有依赖项
4. **Gradle 任务**: 大量的 Java/Kotlin 编译和资源处理

### 加速技巧
```bash
# 方法1: 使用 prebuild 手动配置架构 (推荐)

# 1. 生成原生目录
npx expo prebuild

# 2. 编辑 android/app/build.gradle 文件
# 找到 android { defaultConfig { ... } } 部分，添加:
android {
    defaultConfig {
        // ... 其他配置
        ndk {
            abiFilters "arm64-v8a"  // 只构建 arm64，覆盖85%现代设备
            // 如果需要更好兼容性，可以用: abiFilters "arm64-v8a", "armeabi-v7a"
        }
    }
}

# 3. (可选) 添加 Gradle 并行编译
# 编辑 android/gradle.properties，添加:
org.gradle.parallel=true
org.gradle.daemon=true
org.gradle.caching=true

# 4. 使用 prebuild 后的本地构建
eas build --platform android --local

# 方法2: 云端构建 (如果网络允许)
eas build --profile production --platform android
```

### 当前构建状态
- ✅ **第一次构建成功**: APK 已生成 (包含所有架构，80.4 MB)
- ⚠️ **插件问题**: expo-build-properties 插件不兼容 EAS 构建环境，已移除
- ⚠️ **配置问题**: 修复了 eas.json 中不被允许的 `buildConfiguration` 配置项
- 🔄 **当前构建**: 准备重新开始生产构建
- 💡 **优化方案**: 使用 `npx expo prebuild` 生成原生目录后手动配置架构限制
- 📈 **预期优化效果**: 手动配置架构后可减少构建时间 60%，APK 大小减小 75%

## 📚 相关文档

- [Metro Configuration](https://docs.expo.dev/guides/customizing-metro/)
- [Babel Plugin Module Resolver](https://github.com/tleunen/babel-plugin-module-resolver)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [TypeScript Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)
