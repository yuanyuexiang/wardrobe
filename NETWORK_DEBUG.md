# 🔍 网络调试指南

## 你看到的信息分析

```
Request URL: https://forge.matrix-net.tech/graphql
Referrer Policy: strict-origin-when-cross-origin
```

这个信息通常出现在浏览器开发者工具的网络面板中，表示应用正在向后端发送GraphQL请求。

## 🛠️ 调试步骤

### 1. 检查网络请求状态
在浏览器开发者工具中：
1. 打开 **Network** (网络) 面板
2. 刷新应用
3. 查看对 `https://forge.matrix-net.tech/graphql` 的请求
4. 检查响应状态码：
   - ✅ **200**: 请求成功
   - ❌ **401**: 认证失败（token问题）
   - ❌ **403**: 权限不足
   - ❌ **404**: 端点不存在
   - ❌ **500**: 服务器错误
   - ❌ **CORS**: 跨域问题

### 2. 检查控制台错误
在浏览器开发者工具的 **Console** 面板中查看：
- GraphQL错误信息
- 网络错误信息
- Apollo Client错误日志

### 3. 验证后端连接
```bash
# 在终端中测试后端连接
curl -H "Authorization: Bearer CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD" \
     -H "Content-Type: application/json" \
     -X POST \
     -d '{"query":"{ categories { id name } }"}' \
     https://forge.matrix-net.tech/graphql
```

## 🔧 已添加的调试功能

### 1. 错误处理增强
- ✅ 添加了网络错误日志
- ✅ 添加了GraphQL错误日志
- ✅ 添加了CORS配置

### 2. 控制台调试
现在会在控制台输出：
```javascript
[Network error]: [错误详情]
[GraphQL error]: Message: [错误信息]
分类加载错误: [错误对象]
商品加载错误: [错误对象]
```

## 🚀 下一步操作

1. **重新启动应用**:
   ```bash
   npx expo start
   ```

2. **打开浏览器开发者工具**:
   - Chrome: F12 或 Cmd+Option+I (Mac)
   - 切换到 Console 和 Network 面板

3. **观察错误信息**:
   - 查看控制台是否有错误日志
   - 查看网络面板中的请求状态

4. **报告具体错误**:
   - 如果看到具体的错误信息，请告诉我
   - 包括状态码、错误消息等详细信息

## 🤔 常见问题排除

### Token过期或无效
如果是401错误，可能需要更新token

### 网络连接问题
如果是网络错误，检查：
- 设备网络连接
- 防火墙设置
- VPN配置

### CORS问题
如果是跨域错误，已在Apollo Client中添加了CORS配置

请重新启动应用并告诉我在控制台看到了什么具体的错误信息！
