#!/usr/bin/env node

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;
const TARGET_HOST = 'directus.matrix-net.tech';
const TARGET_PORT = 443;

const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Wardrobe代理服务器运行正常',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 代理请求
  const targetPath = req.url.replace('/api', '');
  console.log(`🔄 代理请求: ${req.method} ${req.url} -> https://${TARGET_HOST}${targetPath}`);

  const options = {
    hostname: TARGET_HOST,
    port: TARGET_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`✅ 代理响应: ${proxyRes.statusCode} ${req.url}`);
    
    // 复制响应头
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.log(`❌ 代理错误: ${err.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '代理服务器错误', details: err.message }));
  });

  // 转发请求体
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`🚀 代理服务器启动成功！`);
  console.log(`📡 监听端口: http://localhost:${PORT}`);
  console.log(`🔗 GraphQL端点: http://localhost:${PORT}/api/graphql`);
  console.log(`💊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🎯 目标服务器: https://${TARGET_HOST}`);
  console.log(`\n使用方法:`);
  console.log(`1. 启动此代理服务器`);
  console.log(`2. 应用会自动检测并使用代理`);
  console.log(`3. 在浏览器开发者工具中查看网络请求\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ 端口 ${PORT} 已被占用，请先关闭其他服务或修改端口号`);
  } else {
    console.log(`❌ 服务器错误: ${err.message}`);
  }
  process.exit(1);
});
