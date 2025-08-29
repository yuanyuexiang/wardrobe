# Expo 商品展示项目开发文档（参考 Next.js 项目）

## 1. 项目目的
- 开发一个客户端，用来展示从后端获取的商品，商品主要是各种服装

## 2. 技术选型
- 框架：Expo（React Native）
- 后端：Directus
- 网络请求：推荐 Apollo Client（对接 GraphQL）
- 认证：提供 token 来访问后端资源

## 3. 后端地址
- URL:https://forge.matrix-net.tech/graphql
- token:CCZnVSanwCwzS6edoC8-2ImbzJiZLeAD

### 商品模块
- 商品列表页：展示商品卡片，支持下拉刷新与分页
- 商品详情页：展示图片、描述、价格等，支持图片预览
- 图片资源：本地 assets 或远程 URL

### 用户模块
- 使用token获取用户信息 
- 用户信息页：展示用户资料，支持编辑

### 分类与筛选
- 分类页：Tab 或 Picker 展示分类，筛选商品

### GraphQL 支持
- Apollo Client 配置
- 查询与 mutation 可参考项目根目录 schema.graphql文件

### 认证与权限
- token硬编码在程序中，接口请求自动带上 token

## 4. 平板适配建议
- 使用 SafeAreaView、ScrollView、Flex 布局，必须是横屏。
- 响应式样式：根据屏幕尺寸调整字体、图片大小。
- 触控优化：按钮、图片支持手势操作。


