# 🚀 Expo项目标准结构

## 📁 当前项目结构（符合Expo最佳实践）

```
wardrobe/
├── app/                          # 🛣️ Expo Router 路由目录
│   ├── _layout.tsx              # 全局应用布局
│   ├── +not-found.tsx           # 404错误页面
│   └── (tabs)/                  # Tab导航组
│       ├── _layout.tsx          # Tab布局配置
│       ├── index.tsx            # 首页
│       ├── explore.tsx          # 探索页
│       ├── ProductListScreen.tsx    # 商品列表路由
│       ├── ProductDetail.tsx        # 商品详情路由
│       └── UserInfoScreen.tsx       # 用户信息路由
│
├── screens/                     # 📱 页面组件目录
│   ├── ProductListScreen.tsx    # 商品列表页面实现
│   ├── ProductDetailScreen.tsx  # 商品详情页面实现
│   └── UserInfoScreen.tsx       # 用户信息页面实现
│
├── components/                  # 🎨 UI组件目录
│   ├── ProductCard.tsx          # 商品卡片组件
│   ├── Tab.tsx                  # 分类标签组件
│   ├── ThemedText.tsx           # 主题文本组件
│   ├── ThemedView.tsx           # 主题视图组件
│   ├── WardrobeApolloProvider.tsx # Apollo客户端提供者
│   └── ui/                      # 基础UI组件
│       ├── IconSymbol.tsx
│       └── TabBarBackground.tsx
│
├── graphql/                     # 📊 GraphQL查询文件
│   ├── products.gql             # 商品相关查询
│   └── users.gql                # 用户相关查询
│
├── generated/                   # 🤖 自动生成代码
│   └── graphql.ts               # GraphQL类型和hooks
│
├── constants/                   # 📋 常量配置
│   └── Colors.ts                # 颜色主题
│
├── hooks/                       # 🪝 自定义hooks
│   ├── useColorScheme.ts
│   └── useThemeColor.ts
│
├── assets/                      # 🖼️ 静态资源
│   ├── fonts/
│   └── images/
│
├── scripts/                     # 📜 脚本文件
│   └── reset-project.js
│
├── codegen.yml                  # ⚙️ GraphQL代码生成配置
├── schema.graphql               # 📋 GraphQL模式定义
├── package.json                 # 📦 项目依赖
├── tsconfig.json               # 🔧 TypeScript配置
└── app.json                    # 📱 Expo应用配置
```

## ✅ 结构优化完成

### 🎯 符合Expo最佳实践
- ✅ **app/** - Expo Router标准路由目录
- ✅ **components/** - UI组件统一管理
- ✅ **screens/** - 页面组件独立目录
- ✅ **constants/** - 全局常量配置
- ✅ **hooks/** - 自定义hooks复用
- ✅ **assets/** - 静态资源管理

### 🔄 导入路径简化
```tsx
// 之前复杂的路径
import ProductCard from '../src/components/ProductCard';

// 现在简洁的路径  
import ProductCard from '../components/ProductCard';
```

### 📊 GraphQL集成
- ✅ **graphql/** - 查询文件集中管理
- ✅ **generated/** - 自动生成类型安全代码
- ✅ 类型推断和智能提示完整

### 🛠️ 开发体验
- ✅ 标准Expo项目结构
- ✅ 清晰的文件组织
- ✅ 一致的导入路径
- ✅ 类型安全保障

## 🚀 开发命令

```bash
# 启动开发服务器
npx expo start

# 生成GraphQL代码
npm run codegen

# TypeScript类型检查
npx tsc --noEmit
```

## 📂 目录职责说明

| 目录 | 职责 | 示例文件 |
|-----|------|---------|
| `app/` | 路由和页面入口 | `(tabs)/ProductListScreen.tsx` |
| `screens/` | 页面业务逻辑实现 | `ProductListScreen.tsx` |
| `components/` | 可复用UI组件 | `ProductCard.tsx` |
| `graphql/` | GraphQL查询定义 | `products.gql` |
| `generated/` | 自动生成代码 | `graphql.ts` |
| `constants/` | 全局常量 | `Colors.ts` |
| `hooks/` | 自定义Hooks | `useThemeColor.ts` |
| `assets/` | 静态资源 | `images/`, `fonts/` |

这个结构完全符合Expo框架的官方建议，便于团队协作和项目维护！ 🎉
