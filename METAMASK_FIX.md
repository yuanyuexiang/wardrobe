# 🔧 MetaMask连接错误解决方案

## 问题描述
```
Uncaught Error
Failed to connect to MetaMask
Call Stack
Object.connect
chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/scripts/inpage.js
```

这个错误通常由MetaMask浏览器扩展引起，即使我们的应用不使用Web3功能。

## ✅ 已实施的解决方案

### 1. 代码级修复
已在 `app/_layout.tsx` 中添加全局错误处理：

```typescript
// 处理MetaMask相关错误
useEffect(() => {
  if (typeof window !== 'undefined') {
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
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }
}, []);
```

### 2. 网络配置
- ✅ 代理服务器运行在: http://localhost:3001
- ✅ Expo应用运行在: http://localhost:8082
- ✅ CORS已正确配置

## � 如果问题仍然存在，尝试以下方法

### 方法1: 禁用MetaMask扩展（最有效）
1. 在Chrome中打开 `chrome://extensions/`
2. 找到MetaMask扩展
3. 暂时关闭扩展
4. 刷新应用页面 http://localhost:8082

### 方法2: 使用隐私窗口
1. 打开Chrome隐私窗口 (Cmd+Shift+N)
2. 访问 http://localhost:8082
3. 测试应用功能

### 方法3: 清除浏览器缓存
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方法4: 检查控制台
打开开发者工具，查看：
- 🦊 MetaMask相关错误已被忽略的消息
- 🔄 开发环境使用代理的日志
- GraphQL查询的网络请求

## 🎯 推荐操作步骤

1. **访问应用**: http://localhost:8082
2. **打开开发者工具**: F12
3. **点击"调试"标签**: 测试网络连接
4. **运行网络测试**: 验证代理和API连接
5. **如有MetaMask错误**: 暂时禁用扩展

## ✅ 成功标志

当一切正常时，你会在控制台看到：
```
🦊 MetaMask相关错误已被忽略: [错误信息]
🔄 开发环境使用代理: http://localhost:3001/api/graphql
✅ 代理服务器运行正常
✅ GraphQL查询成功
```
