# 🚀 解决CORS跨域问题 - 本地代理设置

## 问题说明

在开发环境中，浏览器的同源策略会阻止从 `http://localhost:8081` 直接访问 `https://forge.matrix-net.tech/graphql`，导致CORS跨域错误。

## 解决方案：本地代理服务器

我已经为你创建了一个简单的本地代理服务器来解决这个问题。

## 🎯 使用步骤

### 1. 启动代理服务器

```bash
# 方法1: 直接启动代理
npm run proxy

# 方法2: 同时启动代理和Expo
npm run dev
```

你会看到类似输出：
```
🚀 代理服务器启动成功！
📡 监听端口: http://localhost:3001
🔗 GraphQL端点: http://localhost:3001/api/graphql
💊 健康检查: http://localhost:3001/health
🎯 目标服务器: https://forge.matrix-net.tech
```

### 2. 启动Expo应用

如果你只启动了代理，还需要启动Expo：

```bash
npm start
```

### 3. 在浏览器中测试

1. 打开 http://localhost:8081
2. 点击底部的"调试"标签页
3. 点击"测试直接API调用"按钮
4. 查看测试结果

## 🔧 工作原理

### 智能环境检测

应用会自动检测运行环境：

- **开发环境 + Web平台**: 使用代理 `http://localhost:3001/api/graphql`
- **生产环境 + 移动端**: 直接连接 `https://forge.matrix-net.tech/graphql`

### 代理转发

```
浏览器 → http://localhost:3001/api/graphql → https://forge.matrix-net.tech/graphql
```

代理服务器会：
1. 接收你的请求
2. 添加正确的CORS头
3. 转发到Directus服务器
4. 返回响应给浏览器

## 🕵️ 调试功能

调试页面提供三种测试：

1. **代理健康检查**: 确认代理服务器运行状态
2. **代理GraphQL查询**: 通过代理访问API
3. **直接GraphQL查询**: 直接访问API（用于对比CORS错误）

## 📱 在不同平台上的行为

- **Web浏览器**: 使用代理，解决CORS问题
- **Expo Go**: 直接连接，无CORS限制
- **移动设备**: 直接连接，无CORS限制

## 🔍 常见问题

### Q: 代理服务器启动失败？
A: 检查端口3001是否被占用：
```bash
lsof -i :3001
```

### Q: Apollo查询还是失败？
A: 确保代理服务器正在运行，查看控制台日志

### Q: 移动端测试？
A: 扫描二维码用Expo Go测试，会自动使用直接连接

## 🎉 成功标志

当一切正常时，你会在调试页面看到：

```
✅ 代理服务器运行正常
✅ 代理GraphQL调用成功
❌ 直接连接网络错误: [CORS错误] (这是正常的!)
✅ 分类查询成功: 获取到 X 个分类
✅ 商品查询成功: 获取到 X 个商品
```

现在你可以愉快地在浏览器中调试应用了！ 🎊
