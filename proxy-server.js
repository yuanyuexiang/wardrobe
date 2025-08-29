const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 启用CORS
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:19006', 'http://127.0.0.1:8081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// 代理到Directus API
app.use('/api', createProxyMiddleware({
  target: 'https://forge.matrix-net.tech',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // 移除/api前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 代理请求: ${req.method} ${req.url} -> https://forge.matrix-net.tech${req.url.replace('/api', '')}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ 代理响应: ${proxyRes.statusCode} ${req.url}`);
  },
  onError: (err, req, res) => {
    console.log(`❌ 代理错误: ${err.message}`);
    res.status(500).json({ error: '代理服务器错误', details: err.message });
  }
}));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Wardrobe代理服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 代理服务器启动成功！`);
  console.log(`📡 监听端口: http://localhost:${PORT}`);
  console.log(`🔗 GraphQL端点: http://localhost:${PORT}/api/graphql`);
  console.log(`💊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🎯 目标服务器: https://forge.matrix-net.tech`);
});

module.exports = app;
