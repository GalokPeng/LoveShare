# Love Share

Love Share 是一个基于 React + TypeScript + Vite 构建的现代化数据展示平台，集成了 Supabase 后端服务，提供了表格视图和卡片视图切换、搜索、分页、分类筛选等功能。

- 访问页面：[Demo](https://love-share.vercel.app/)

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

认证通过后会在界面显示这些操作

![admin](https://github.com/GalokPeng/LoveShare/blob/27cfaf98f4cc37fd1e0aa542f43179ec3a4dda9c/public/add_admin.png)

## 快速体验

### 0. 创建 Supabase 账号并运行 SQL （下方：Supabase 导航栏表创建）

### 1. 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/GalokPeng/LoveShare&project-name=LoveShare&repository-name=LoveShare&root-directory=src)

### 2. 将.env.example 直接导入 vercel 环境变量

- 修改 VITE_SUPABASE_URL 变量值 对应 Supabase 个人 API
- 修改 VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY 变量值 对应 Supabase 个人 API Public Keys

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

- 以下显示必配字段，example 已经预备好，默认你只需要填写
  - VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

```env
# Supabase 配置
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PAGE_SIZE=12

# 表配置
# 格式：{"表名":{"show_name":"显示名称", "字段名":"显示名称"}}
VITE_SUPABASE_TABLE_DIC={"navigation":{"show_name":"导航栏","id":"编号","created_at":"创建时间","title":"标题","abstract":"摘要","article":"文章","img":"图片","to_link":"跳转链接","obj":"分类"}}

# 分类列配置
# 格式：{"表名":"分类列名"}
VITE_SUPABASE_TABLE_CATEGORY_COL={"navigation":"obj"}

# 分类启用配置
VITE_SUPABASE_TABLE_CATEGORY_ENABLE={"navigation":true}

# 视图配置
VITE_SUPABASE_TABLE_SHOW_VIEWS={"navigation":["card"]}

# 搜索配置（例：根据title&abstract的内容查找）
VITE_SUPABASE_TABLE_DEFAULT_SEARCH={"navigation":["title","abstract"]}
```

### 运行

```bash
pnpm dev & pnpm run server
# 或使用 npm
npm run dev & pnpm run server
# 或使用 yarn
yarn dev & pnpm run server
```

访问 `http://localhost:5173` 查看应用
`http://localhost:3000` API (vercel 部署无需过多操作)

## Supabase 导航栏表创建(必须)

要使用项目的导航功能，需要在 Supabase 中创建 `navigation` 表。请执行以下 SQL 语句：

```sql
-- 创建 navigation 表（与现有表结构一模一样）
CREATE TABLE public.navigation (
  id bigserial PRIMARY KEY,
  created_at timestamp WITHOUT time zone DEFAULT now(),
  title character varying,
  abstract character varying,
  article character varying,
  img character varying,
  to_link text, -- 跳转链接
  obj text,     -- 分类
  to_article boolean DEFAULT false, -- 是否跳转至文章页
  slug uuid DEFAULT gen_random_uuid() -- 文章页面路径
);

-- 字段注释
COMMENT ON COLUMN public.navigation.to_link IS '跳转链接';
COMMENT ON COLUMN public.navigation.obj IS '分类';
COMMENT ON COLUMN public.navigation.to_article IS '是否跳转至文章页';
COMMENT ON COLUMN public.navigation.slug IS '文章页面路径';

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
