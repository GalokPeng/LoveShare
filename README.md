# Love Share

Love Share 是一个基于 React + TypeScript + Vite 构建的现代化数据展示平台，集成了 Supabase 后端服务，提供了表格视图和卡片视图切换、搜索、分页、分类筛选等功能。

## 技术栈

### 前端

- **框架**: React 19
- **语言**: TypeScript
- **构建工具**: Vite (使用 rolldown-vite)
- **UI 组件库**: Material UI (MUI) v7
- **状态管理**: React Context + React Query
- **主题管理**: 自定义 ThemeContext
- **代码规范**: ESLint + TypeScript ESLint

### 后端

- **数据库**: Supabase
- **API**: Supabase REST API

## 项目特点

- 🔥 **现代化技术栈**: 使用 React 19、TypeScript 和 Vite 构建，性能优异
- 🎨 **美观的 UI 设计**: 基于 Material UI 构建，支持主题切换
- 📊 **多种视图模式**: 支持表格视图和卡片视图切换
- 🔍 **强大的搜索功能**: 支持多字段搜索
- 📄 **分页功能**: 支持自定义每页显示数量
- 📁 **分类筛选**: 支持按分类筛选数据
- 🔄 **实时数据更新**: 使用 React Query 实现数据缓存和自动失效
- 💪 **类型安全**: 全面的 TypeScript 支持
- 📱 **响应式设计**: 适配各种屏幕尺寸
- 🔒 **数据管理**: 支持数据增删改查
  你只需要在右上角 ⚙ 验证 supabase 的 Secret keys 即可对数据进行增删改查
  Secret keys 获取方式: dashboard --> project setting --> API keys
  认证通过后会显示在界面显示这些操作
  
  ![admin](https://github.com/GalokPeng/LoveShare/blob/27cfaf98f4cc37fd1e0aa542f43179ec3a4dda9c/public/add_admin.png)

## 规划中

- 🔒 **数据管理**: markdown 编辑文章，支持详细视图（必须）
- 🔑 **用户认证**: 计划添加用户登录和注册功能（可能）

## 项目结构

```
src/
├── assets/              # 静态资源
│   ├── styles/          # 全局样式
│   └── react.svg        # React 图标
├── components/          # 组件
│   ├── common/          # 通用组件
│   ├── features/        # 功能组件
│   └── layout/          # 布局组件
├── contexts/            # React Context
│   ├── TableContext.tsx # 表格数据上下文
│   └── ThemeContext.tsx # 主题上下文
├── lib/                 # 工具库
│   ├── supabase.ts      # Supabase 客户端
│   └── utils.ts         # 通用工具函数
├── pages/               # 页面组件
│   └── Home.tsx         # 主页
├── App.css              # App 样式
├── App.tsx              # App 组件
├── index.css            # 全局样式
└── main.tsx             # 应用入口
```

## 快速开始

### 前置要求

- Node.js 18+ 或 Bun
- pnpm (推荐) 或 npm/yarn
- Supabase 账号和项目

### 安装

1. 克隆项目

```bash
git clone <repository-url>
cd love_share
```

2. 安装依赖

```bash
pnpm install
# 或使用 npm
npm install
# 或使用 yarn
yarn install
```

3. 配置环境变量

创建 `.env.local` 文件，根据 `.env.example` 配置环境变量：

```env
# 系统配置
VITE_SYSTEM_NAME=Love Share
VITE_HOME_INTRO=这是一个现代化数据展示平台...
VITE_HOME_FOOTER=© 2025 Love Share

# Supabase 配置
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PAGE_SIZE=8

# 表配置
VITE_SUPABASE_TABLE_DIC={"table1":{"show_name":"表1"},"table2":{"show_name":"表2"}}
VITE_SUPABASE_TABLE_CATEGORY_COL={"table1":"category"}
VITE_SUPABASE_TABLE_CATEGORY_ENABLE={"table1":true}
VITE_SUPABASE_TABLE_SHOW_COL_THUMB={"table1":["url"]}
VITE_SUPABASE_TABLE_SHOW_VIEWS={"table1":["table","card"]}
VITE_SUPABASE_TABLE_DEFAULT_SEARCH={"table1":["name","description"]}
```

### 运行

```bash
pnpm dev
# 或使用 npm
npm run dev
# 或使用 yarn
yarn dev
```

访问 `http://localhost:5173` 查看应用

### 构建

```bash
pnpm build
# 或使用 yarn
yarn build
```

### 预览构建结果

```bash
pnpm preview
# 或使用 yarn
yarn preview
```

## Supabase 导航栏表创建

要使用项目的导航功能，需要在 Supabase 中创建 `navigation` 表。请执行以下 SQL 语句：

```sql
CREATE TABLE public.navigation (
  id bigserial PRIMARY KEY,
  created_at timestamp NOT NULL DEFAULT now(),
  title varchar,
  abstract varchar,
  article varchar,
  img varchar,
  to_link text,
  obj text
);

-- 启用 RLS（如果你需要启用）
ALTER TABLE public.navigation ENABLE ROW LEVEL SECURITY;

-- 示例：允许 authenticated 用户 SELECT（根据需要启用）
-- CREATE POLICY "Allow authenticated select" ON public.navigation
--   FOR SELECT TO authenticated USING (true);
-- 示例2：直接公开
CREATE POLICY "Allow anon select" ON public.navigation FOR SELECT TO anon USING (true);

-- 分类视图：navigation_obj  因为supabase不支持在视图中使用distinct()函数，所以需要创建一个分类视图
CREATE OR REPLACE VIEW public.navigation_obj AS
SELECT DISTINCT obj AS obj
FROM public.navigation;
```

## 部署

### Vercel

1. 登录 Vercel
2. 导入项目
3. 配置环境变量
4. 部署

### Netlify

1. 登录 Netlify
2. 导入项目
3. 配置环境变量
4. 部署

### GitHub Pages

1. 配置 `vite.config.ts` 中的 `base` 选项
2. 运行 `pnpm build` 构建项目
3. 部署 `dist` 目录到 GitHub Pages

## 许可证

[MIT License](https://github.com/GalokPeng/LoveShare?tab=MIT-1-ov-file#readme)

## 贡献

欢迎提交 Issue 和 Pull Request！

## Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=galokpeng/LoveShare&type=Date)](https://star-history.com/#galokpeng/LoveShare&Date)

## 反馈

欢迎提交问题和反馈！您可以通过以下方式联系我：

- [提交 Issue](https://github.com/galokpeng/LoveShare/issues)

## 致谢

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Material UI](https://mui.com/)
- [Supabase](https://supabase.com/)
- [React Query](https://tanstack.com/query/v5/)
