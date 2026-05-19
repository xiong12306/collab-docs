<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<h1 align="center">Collab Docs</h1>

<p align="center">
  <strong>基于 Yjs + Tiptap 的多人实时协作文档系统</strong>
</p>

<p align="center">
  毫秒级同步 · 多光标协作 · 权限管理 · 开箱即用
</p>

---

## What is Collab Docs?

Collab Docs 是一个开源的多人实时协作文档平台，类似 Google Docs / Notion 的在线编辑体验。多人可以同时编辑同一篇文档，看到彼此的光标位置和编辑内容，所有变更毫秒级同步。

### 核心亮点

- **实时协同** — 基于 Yjs CRDT 算法，多人同时编辑无冲突，自动合并
- **多光标感知** — 看到其他协作者的光标位置和选区，协作更直观
- **权限管理** — Owner / Editor / Viewer 三级权限，精细控制谁能编辑
- **分享协作** — 生成分享链接，邀请他人加入文档协作
- **回收站** — 删除文档进入回收站，30 天自动清理，支持恢复
- **搜索排序** — 关键词搜索 + 时间排序，快速找到目标文档
- **密码重置** — 完整的忘记密码/重置密码流程
- **断线重连** — 网络中断自动重连，指数退避策略，不丢数据

---

## Screenshots

| 文档列表 | 协同编辑 |
|:---:|:---:|
| ![文档列表](docs/screenshots/doc-list.png) | ![协同编辑](docs/screenshots/collab-edit.png) |

| 登录页面 | 分享协作 |
|:---:|:---:|
| ![登录页面](docs/screenshots/login.png) | ![分享协作](docs/screenshots/share.png) |

---

## Tech Stack

| 层级 | 技术 | 说明 |
|------|------|------|
| **框架** | Next.js 15 (App Router) | React 19 全栈框架 |
| **语言** | TypeScript 5.7 | 全量类型安全 |
| **UI** | Ant Design 5 + Tailwind CSS | 企业级组件库 + 原子化 CSS |
| **编辑器** | Tiptap + Yjs | ProseMirror 内核 + CRDT 协同 |
| **实时同步** | Supabase Broadcast Channel | 基于 WebSocket 的实时通信 |
| **数据库** | Supabase PostgreSQL | 托管 PostgreSQL + RLS 行级安全 |
| **认证** | JWT (jose) + bcryptjs | 自建认证，不依赖第三方 Auth |
| **部署** | Vercel | 零配置部署，Serverless |

---

## Quick Start

### 环境要求

- Node.js >= 18
- npm 或 pnpm
- Supabase 账号（免费即可）

### 1. 克隆项目

```bash
git clone https://github.com/xiong12306/collab-docs.git
cd collab-docs
npm install
```

### 2. 配置 Supabase

1. 前往 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中依次执行迁移脚本：
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_p1_soft_delete_and_reset.sql`

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入你的 Supabase 配置：

```bash
# Supabase（浏览器端，可公开）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your_anon_key

# Supabase（服务端，仅 Serverless 函数可用）
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key

# JWT 密钥（自定义一个随机字符串）
JWT_SECRET=your-random-secret-string

# Vercel Cron 清理回收站的验证密钥
CRON_SECRET=your-cron-secret-string
```

> **关于 Supabase Key 格式**：新版 Supabase key 使用 `sb_publishable_` / `sb_secret_` 前缀，与传统 `eyJ` JWT 格式不同，但完全兼容 `@supabase/supabase-js` 客户端。

### 4. 启动开发服务器

```bash
npm run dev
```

> **Windows 用户注意**：Next.js 15 在 Windows 上 `npm run dev` 可能出现 SWC worker 崩溃。如遇此问题，请使用生产模式运行：
> ```bash
> npm run build && npm run start
> ```

### 5. 访问应用

打开 http://localhost:3000，注册一个新账号即可开始使用。

---

## Project Structure

```
collab-docs/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── api/                # API Routes（服务端）
│   │   │   ├── auth/           # 认证相关 API
│   │   │   ├── documents/      # 文档 CRUD + 同步
│   │   │   ├── share/          # 分享链接
│   │   │   ├── trash/          # 回收站
│   │   │   └── cron/           # 定时任务
│   │   ├── docs/               # 文档列表 + 编辑页
│   │   ├── login/              # 登录/注册
│   │   ├── forgot-password/    # 忘记密码
│   │   ├── reset-password/     # 重置密码
│   │   └── trash/              # 回收站
│   ├── components/             # React 组件
│   │   ├── auth/               # 认证相关组件
│   │   ├── common/             # 通用组件（骨架屏、错误重试）
│   │   ├── docs/               # 文档相关组件
│   │   ├── editor/             # Tiptap 编辑器
│   │   ├── layout/             # 布局组件
│   │   └── trash/              # 回收站组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 核心库
│   │   ├── auth/               # JWT + bcrypt + 限流
│   │   ├── collaboration/     # Yjs Provider + Awareness
│   │   └── supabase/           # Supabase 客户端封装
│   ├── constants/              # 常量
│   └── types/                  # TypeScript 类型
├── supabase/
│   └── migrations/             # 数据库迁移脚本
├── vercel.json                 # Vercel Cron 配置
└── package.json
```

---

## Features

### 实时协同编辑

基于 Yjs CRDT 算法实现多人无冲突编辑：

- **增量同步**：只传输文档变更的差量（delta），而非整个文档
- **多光标**：通过 Awareness 协议广播光标位置，实时看到其他协作者
- **冷启动**：首次打开文档从服务端加载历史增量，逐步重放
- **持久化**：每 2 秒自动将增量更新保存到 Supabase PostgreSQL
- **断线重连**：指数退避重连策略，最多 5 次重试

### 文档管理

- 创建/删除/重命名文档
- 关键词搜索（ilike 模糊匹配 + 前端防抖）
- 按更新时间排序（升序/降序）
- 回收站软删除，30 天自动清理
- 文档分享链接（支持设置权限和过期时间）

### 认证与安全

- 自建 JWT + bcryptjs 认证（非 Supabase Auth）
- httpOnly Cookie 存储 Token
- 服务端 Middleware 鉴权 + API 层双重验证
- IP 限流（登录/注册 5 次/分钟）
- SHA-256 密码重置 Token 哈希
- Supabase RLS 行级安全策略

---

## Deploy

### Vercel 部署（推荐）

1. Fork 本仓库
2. 在 Vercel 导入项目
3. 配置环境变量（同 `.env.local` 中的变量）
4. 部署

Vercel 会自动识别 Next.js 项目，零配置部署。

### Supabase 配置

确保在 Supabase SQL Editor 中执行了迁移脚本，并启用 Realtime 功能：

1. 进入 Supabase Dashboard → Database → Replication
2. 确认 Realtime 已启用

### 定时清理回收站

项目已配置 Vercel Cron Job，每天 UTC 2:00 自动清理过期回收站文档。需在 Vercel 环境变量中配置 `CRON_SECRET`。

---

## API Overview

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/auth/forgot-password` | 请求密码重置 |
| POST | `/api/auth/reset-password` | 执行密码重置 |
| GET | `/api/documents` | 文档列表 |
| POST | `/api/documents` | 创建文档 |
| GET | `/api/documents/[id]` | 文档详情 |
| PATCH | `/api/documents/[id]` | 更新文档 |
| DELETE | `/api/documents/[id]` | 删除文档（软删除） |
| POST | `/api/documents/[id]/sync` | 同步 Yjs 增量更新 |
| GET | `/api/documents/[id]/sync` | 获取历史增量 |
| GET | `/api/documents/[id]/members` | 获取成员列表 |
| POST | `/api/documents/[id]/members` | 邀请成员 |
| POST | `/api/documents/[id]/share` | 生成分享链接 |
| GET | `/api/share/[token]` | 验证分享链接 |
| GET | `/api/trash` | 回收站列表 |
| POST | `/api/trash/[id]/restore` | 恢复文档 |
| DELETE | `/api/trash/[id]` | 永久删除 |

---

## Contributing

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m 'feat: add your feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

---

## License

[MIT](LICENSE)

---

## Acknowledgments

- [Yjs](https://yjs.dev/) — CRDT 协同算法
- [Tiptap](https://tiptap.dev/) — ProseMirror 编辑器框架
- [Supabase](https://supabase.com/) — 开源 Firebase 替代
- [Next.js](https://nextjs.org/) — React 全栈框架
