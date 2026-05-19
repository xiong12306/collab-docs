# Collab Docs 技术架构文档

> 本文档面向开发者，详细描述 Collab Docs 的整体架构、技术选型、核心流程和设计决策。

---

## 目录

- [架构概览](#架构概览)
- [技术选型](#技术选型)
- [核心流程](#核心流程)
  - [认证流程](#认证流程)
  - [实时协同流程](#实时协同流程)
  - [数据持久化流程](#数据持久化流程)
- [数据库设计](#数据库设计)
- [项目结构详解](#项目结构详解)
- [关键设计决策](#关键设计决策)
- [踩坑记录](#踩坑记录)

---

## 架构概览

Collab Docs 采用 **前后端一体化** 架构，基于 Next.js App Router 实现：

```
┌──────────────────────────────────────────────────────────┐
│                     Next.js App Router                     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Server       │  │ API Routes   │  │ Client          │ │
│  │ Components   │  │ (REST API)   │  │ Components       │ │
│  │              │  │              │  │                  │ │
│  │ - 首页重定向  │  │ - /api/auth  │  │ - 文档列表      │ │
│  │ - 鉴权检查   │  │ - /api/docs  │  │ - Tiptap 编辑器 │ │
│  └──────────────┘  │ - /api/share │  │ - 协同 UI       │ │
│                    │ - /api/trash │  │ - 设置面板      │ │
│                    └──────┬───────┘  └────────┬─────────┘ │
│                           │                   │           │
│  ┌────────────────────────┼───────────────────┼─────────┐ │
│  │ Middleware (鉴权+限流)  │                   │         │ │
│  └────────────────────────┼───────────────────┼─────────┘ │
└───────────────────────────┼───────────────────┼───────────┘
                            │                   │
                    ┌───────▼───────┐   ┌────────▼────────┐
                    │  Supabase     │   │  Supabase       │
                    │  PostgreSQL   │   │  Realtime       │
                    │  (持久化)     │   │  (Broadcast     │
                    │               │   │   Channel)       │
                    └───────────────┘   └─────────────────┘
```

### 分层架构

| 层级 | 职责 | 技术实现 |
|------|------|---------|
| **展示层** | 页面渲染、用户交互 | React 19 + Ant Design + Tailwind CSS |
| **编辑层** | 富文本编辑、协同光标 | Tiptap + Yjs + Collaboration 扩展 |
| **通信层** | 实时消息广播、状态同步 | Supabase Broadcast Channel |
| **接口层** | REST API、鉴权、限流 | Next.js API Routes + Middleware |
| **数据层** | 数据持久化、增量存储 | Supabase PostgreSQL + RLS |
| **同步层** | CRDT 合并、增量编码 | Yjs + SupabaseYjsProvider |

---

## 技术选型

### 为什么选 Next.js 15？

| 需求 | Next.js 的优势 |
|------|---------------|
| 服务端鉴权 | Middleware + Server Components 可在服务端读取 Cookie 并重定向 |
| API Routes | 统一的前后端代码库，无需单独部署后端服务 |
| SEO 友好 | SSR/SSG 按需选择，文档页可预渲染 |
| Vercel 零配置部署 | 自动识别框架，Serverless 函数自动扩缩容 |
| App Router | 基于 React 19，Server Actions、流式渲染等现代特性 |

### 为什么选 Yjs 而非 OT？

| 对比项 | Yjs (CRDT) | OT (Operational Transform) |
|--------|-----------|---------------------------|
| 离线支持 | 天然支持，离线编辑后自动合并 | 需要中央服务器做转换 |
| 服务器依赖 | 无需中央协同服务器（P2P 亦可） | 依赖服务器做操作转换 |
| 复杂度 | 客户端实现复杂，服务器简单 | 服务器实现复杂，客户端简单 |
| 生态 | Tiptap 官方支持 Collaboration 扩展 | 需自行实现或依赖第三方服务 |
| 一致性 | CRDT 保证最终一致性 | OT 保证强一致性 |

**结论**：Collab Docs 选择 Yjs 是因为不想依赖中央协同服务器，希望利用 Supabase Broadcast Channel（无状态 WebSocket）即可实现实时协同，降低架构复杂度。

### 为什么选 Supabase 而非自建后端？

- **PostgreSQL 即服务**：无需管理数据库，RLS 开箱即用
- **Realtime**：Broadcast Channel 提供无状态 WebSocket 通信，适合 Yjs 增量同步
- **免费额度充足**：500MB 数据库 + 50MB 文件存储 + Realtime
- **客户端 SDK**：JS SDK 封装了 WebSocket 连接管理，省去手写逻辑

### 为什么自建 JWT 认证而非用 Supabase Auth？

1. **学习目的**：完整实现认证流程（注册、登录、密码重置），加深理解
2. **灵活性**：JWT payload 自定义，不受 Supabase Auth 限制
3. **独立部署**：认证不依赖 Supabase，未来可切换到其他数据库
4. **教学价值**：代码覆盖 bcrypt 哈希、JWT 签发/验证、Cookie 管理、限流等完整链路

---

## 核心流程

### 认证流程

```
┌──────────┐    POST /api/auth/login     ┌──────────────┐
│  Browser │ ──────────────────────────► │  API Route   │
│          │    { email, password }       │              │
│          │                              │  1. 限流检查  │
│          │                              │  2. 查询用户  │
│          │                              │  3. bcrypt   │
│          │                              │     验证密码  │
│          │                              │  4. 签发 JWT  │
│          │ ◄────────────────────────── │              │
│          │    Set-Cookie: token=xxx     │              │
│          │    HttpOnly; Secure          └──────────────┘
└──────────┘

后续请求：
┌──────────┐    GET /api/documents        ┌──────────────┐
│  Browser │ ──────────────────────────► │  Middleware  │
│          │    Cookie: token=xxx         │              │
│          │                              │  1. 验证 JWT  │
│          │                              │  2. 注入      │
│          │                              │     x-user-id│
│          │                              └──────┬───────┘
│          │                                     │
│          │                              ┌──────▼───────┐
│          │                              │  API Route   │
│          │                              │  3. 二次验证  │
│          │                              │     (Cookie)  │
│          │                              │  4. 业务逻辑  │
│          │ ◄────────────────────────── │              │
│          │    JSON Response             └──────────────┘
└──────────┘
```

#### 双重验证设计

- **Middleware 层**：拦截未登录请求，保护路由。已登录则注入 `x-user-id` 请求头
- **API Route 层**：独立从 Cookie 重新验证 JWT，不信任上游输入

这是 MVP 阶段的有意设计——双重验证确保安全。未来可信任 Middleware 注入的请求头，省去二次验证开销。

#### 限流策略

```typescript
// src/lib/auth/rate-limit.ts
// 基于内存的滑动窗口计数器
// 登录/注册：5 次/分钟/IP
// 生产环境建议迁移到 Upstash Redis
```

### 实时协同流程

这是 Collab Docs 的核心——基于 Yjs + Supabase Broadcast Channel 的实时协同：

```
  用户 A (Browser)                    Supabase Realtime                  用户 B (Browser)
  ┌──────────────┐                   ┌──────────────────┐              ┌──────────────┐
  │ Tiptap       │                   │ Broadcast Channel│              │ Tiptap       │
  │   │          │                   │                  │              │   ▲          │
  │   ▼          │                   │  doc-<docId>     │              │   │          │
  │ Yjs Doc      │                   │                  │              │ Yjs Doc      │
  │   │          │                   │  Events:         │              │   ▲          │
  │   ▼          │                   │  - sync-update   │              │   │          │
  │ SupabaseYjs  │                   │  - awareness-    │              │ SupabaseYjs  │
  │ Provider     │                   │     update       │              │ Provider     │
  │   │          │                   │                  │              │   ▲          │
  │   ▼          │   send()          │                  │  on()       │   │          │
  │ Broadcast ─────────────────────────────────────────────────────────────►│          │
  │ Channel      │                   │                  │              │   │          │
  │              │                   │                  │              │   │ apply     │
  │              │                   │                  │              │   │ Update()  │
  │              │   on()           │                  │  send()     │   │          │
  │              │◄──────────────────────────────────────────────────────────│          │
  │   apply      │                   │                  │              │              │
  │   Update()   │                   │                  │              │              │
  └──────────────┘                   └──────────────────┘              └──────────────┘
```

#### SupabaseYjsProvider 核心机制

```
┌─────────────────────────────────────────────────────────────┐
│                   SupabaseYjsProvider                       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ 本地更新处理  │  │ 远程更新处理  │  │ 服务端持久化      │  │
│  │              │  │              │  │                  │  │
│  │ Yjs Doc      │  │ Broadcast   │  │ HTTP API         │  │
│  │ 'update'     │  │ Channel      │  │ /api/docs/[id]/  │  │
│  │ 事件         │  │ 'sync-update'│  │ sync             │  │
│  │              │  │ 事件         │  │                  │  │
│  │ 1. 编码为     │  │ 1. 解码      │  │ 1. 每 2 秒批量   │  │
│  │    number[]  │  │    Uint8Array │  │    上传增量      │  │
│  │ 2. 广播给     │  │ 2. 跳过自己  │  │ 2. 失败重试      │  │
│  │    其他用户   │  │    的更新     │  │ 3. Base64 编码   │  │
│  │ 3. 缓存待    │  │ 3. apply     │  │    (HTTP 不受     │  │
│  │    持久化     │  │    Update()  │  │    ETF 影响)     │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────────────────────────────┐  │
│  │ Awareness   │  │ 冷启动                               │  │
│  │              │  │                                       │  │
│  │ 光标位置广播  │  │ 1. 连接时从 /api/docs/[id]/sync      │  │
│  │ 用户颜色/名称  │  │    加载历史 Base64 增量              │  │
│  │              │  │ 2. 逐条 applyUpdate() 重放            │  │
│  │              │  │ 3. 重放完成后开始接收实时更新          │  │
│  └─────────────┘  └─────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 断线重连                                             │    │
│  │                                                       │    │
│  │ - 监听 Channel 状态 (SUBSCRIBED/CHANNEL_ERROR/...)  │    │
│  │ - 指数退避：2s → 3s → 4.5s → 6.75s → 10.1s          │    │
│  │ - 最多 5 次重试                                      │    │
│  │ - 重连后重新从服务端拉取增量                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### 数据编码方式

| 通道 | 编码方式 | 原因 |
|------|---------|------|
| Broadcast Channel (WebSocket) | `Array.from(Uint8Array)` → number[] | Base64 会被 Phoenix ETF 编解码损坏 |
| HTTP API (持久化) | Base64 (`uint8ArrayToBase64`) | HTTP 不经过 ETF，Base64 安全 |

### 数据持久化流程

```
                    每 2 秒触发
                        │
                        ▼
┌──────────────────────────────────────────┐
│ flushToServer()                           │
│                                           │
│  pendingUpdates: [Uint8Array, ...]        │
│       │                                   │
│       ▼                                   │
│  取出所有待持久化的更新                      │
│       │                                   │
│       ▼                                   │
│  逐条编码为 Base64                         │
│       │                                   │
│       ▼                                   │
│  POST /api/documents/[id]/sync            │
│  { update: "base64..." }                  │
│       │                                   │
│       ├── 成功 → 从队列移除                 │
│       └── 失败 → 放回队列头部，保证顺序     │
└──────────────────────────────────────────┘

冷启动加载：
GET /api/documents/[id]/sync → [base64Update, ...]
逐条 base64ToUint8Array → Y.applyUpdate()
```

---

## 数据库设计

### ER 图

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    users     │     │    documents      │     │    doc_members    │
├──────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (UUID) PK │◄──┐ │ id (UUID) PK     │◄────│ doc_id (UUID) FK │
│ email UNIQUE │   │ │ title            │     │ user_id (UUID) FK│
│ password_hash│   │ │ content (JSONB)  │     │ role             │
│ name         │   └─│ owner_id (UUID)  │     │ invited_at       │
│ avatar_url   │     │ deleted_at       │     └──────────────────┘
│ created_at   │     │ created_at       │              │
└──────────────┘     │ updated_at       │              │
                     └──────────────────┘              │
                              │                        │
                     ┌────────▼────────┐               │
                     │  yjs_updates    │               │
                     ├─────────────────┤               │
                     │ id (BIGINT) PK  │               │
                     │ doc_id (UUID) FK│               │
                     │ update (TEXT)   │               │
                     │ created_at      │               │
                     └─────────────────┘               │
                                                       │
┌──────────────────────┐    ┌──────────────────────────┐│
│    doc_shares        │    │ password_reset_tokens    ││
├──────────────────────┤    ├──────────────────────────┤│
│ id (UUID) PK        │    │ id (UUID) PK             ││
│ doc_id (UUID) FK    │───►│ user_id (UUID) FK       │◄┘
│ token UNIQUE        │    │ token_hash UNIQUE        │
│ role                │    │ expires_at               │
│ created_by (UUID)   │    │ used                     │
│ expires_at          │    │ created_at               │
│ used                │    └──────────────────────────┘
│ created_at          │
└──────────────────────┘
```

### 表说明

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `users` | 用户账户 | `email`（唯一）、`password_hash`（bcrypt） |
| `documents` | 文档 | `content`（JSONB，Tiptap 格式）、`deleted_at`（软删除） |
| `doc_members` | 文档成员权限 | `role`（owner/editor/viewer），联合主键 |
| `yjs_updates` | Yjs 增量更新持久化 | `update`（Base64 编码的二进制增量） |
| `doc_shares` | 分享链接 | `token`（唯一）、`expires_at`（过期时间） |
| `password_reset_tokens` | 密码重置令牌 | `token_hash`（SHA-256 哈希，不存原文） |
| `doc_snapshots` | 文档快照（预留） | `content`（JSONB） |

### RLS 策略

所有表启用 Row Level Security，但 **API Routes 使用 `service_role_key` 绕过 RLS**，权限校验在应用层实现。

RLS 策略主要作为安全兜底，防止客户端直接通过 Supabase SDK 访问数据时越权。

---

## 项目结构详解

### API Routes 设计

```
src/app/api/
├── auth/
│   ├── login/route.ts          # POST 登录（限流 + bcrypt + JWT）
│   ├── register/route.ts       # POST 注册（限流 + bcrypt + JWT）
│   ├── logout/route.ts         # POST 退出（清除 Cookie）
│   ├── me/route.ts             # GET 当前用户信息
│   ├── forgot-password/route.ts # POST 请求重置密码
│   └── reset-password/route.ts  # POST 执行重置密码
├── documents/
│   ├── route.ts                # GET 列表 / POST 创建
│   └── [id]/
│       ├── route.ts            # GET 详情 / PATCH 更新 / DELETE 删除
│       ├── members/route.ts    # GET 成员 / POST 邀请
│       ├── share/route.ts      # POST 生成分享链接
│       └── sync/route.ts       # GET 历史增量 / POST 上传增量
├── share/
│   └── [token]/route.ts       # GET 验证分享链接
├── trash/
│   ├── route.ts                # GET 回收站列表
│   └── [id]/route.ts          # POST 恢复 / DELETE 永久删除
└── cron/
    └── cleanup-trash/route.ts  # GET 定时清理（Vercel Cron）
```

### 核心模块

| 模块 | 文件 | 职责 |
|------|------|------|
| **SupabaseYjsProvider** | `src/lib/collaboration/provider.ts` | Yjs 与 Supabase Broadcast Channel 的桥接器 |
| **Awareness 工具** | `src/lib/collaboration/awareness.ts` | 光标颜色分配、在线用户去重 |
| **JWT 工具** | `src/lib/auth/jwt.ts` | Token 签发（HS256）与验证 |
| **鉴权中间件** | `src/lib/auth/middleware.ts` | 从 Cookie 提取并验证用户 |
| **密码工具** | `src/lib/auth/password.ts` | bcrypt 哈希与验证 |
| **限流器** | `src/lib/auth/rate-limit.ts` | IP 滑动窗口限流 |
| **Supabase 客户端** | `src/lib/supabase/client.ts` | 浏览器端单例客户端 |
| **Supabase 服务端** | `src/lib/supabase/server.ts` | 服务端 `service_role` 客户端 |

---

## 关键设计决策

### 1. 增量更新 vs 全量快照

**选择**：增量更新为主，全量快照为辅（预留）

- Yjs 天然支持增量更新（`Y.applyUpdate`），传输数据量小
- 冷启动时重放历史增量恢复文档状态
- 未来可定期创建快照，加速冷启动（避免重放所有增量）

### 2. Broadcast Channel vs Presence

**选择**：Broadcast Channel

| 对比 | Broadcast | Presence |
|------|-----------|----------|
| 消息持久化 | 无，实时广播 | 有，跟踪在线状态 |
| 适用场景 | 增量同步、事件通知 | 在线人数、光标位置 |
| 复杂度 | 低 | 中（需要 JOIN/SYNC 流程） |
| 延迟 | 最低 | 略高 |

Collab Docs 用 Broadcast Channel 同时承载增量同步和 Awareness 广播，简化架构。

### 3. 自建认证 vs Supabase Auth

**选择**：自建 JWT + bcryptjs

- 完整控制认证流程
- 学习价值高
- 不依赖 Supabase Auth 的限制和配额

### 4. 内存限流 vs Redis 限流

**选择**：MVP 阶段使用内存限流

- 简单可靠，单实例部署足够
- Vercel Serverless 环境下每个冷启动实例独立计数，限流不严格
- 生产环境建议迁移到 Upstash Redis

---

## 踩坑记录

### 1. Supabase Broadcast Channel 不能用 Base64 传二进制数据

**问题**：Supabase Realtime 底层使用 Phoenix Channel，消息经 ETF（External Term Format）编码/解码。Base64 字符串中的 `+`、`/`、`=` 在 ETF 编解码过程中被损坏，导致 `atob` 解码失败。

**现象**：
```
InvalidCharacterError: Failed to execute 'atob' on 'Window':
The string to be decoded is not correctly encoded.
```

**解决方案**：改用 `Array.from(Uint8Array)` 传输数字数组，纯 JSON 数字不受 ETF 编解码影响。

### 2. Broadcast Channel 回调收到的是完整信封

**问题**：`channel.on('broadcast', { event }, callback)` 的 callback 参数是完整信封 `{ type, event, payload }` 而非内层 payload，与官方文档描述不一致。

**现象**：所有自定义字段（`update`、`client_id`、`states`）都是 `undefined`。

**解决方案**：使用 `envelope.payload ?? envelope` 兼容两种情况。

```typescript
channel.on('broadcast', { event: 'sync-update' }, (envelope) => {
  const payload = envelope.payload ?? envelope;
  this.handleRemoteUpdate(payload);
});
```

### 3. Next.js 15 Windows 开发模式 SWC 崩溃

**问题**：`npm run dev` 在 Windows 上可能触发 SWC worker 崩溃（已知 bug）。

**解决方案**：使用生产模式运行 `npm run build && npm run start`。

### 4. Supabase 新版 Key 格式

**现象**：新版 Supabase key 使用 `sb_publishable_` / `sb_secret_` 前缀，不再是传统的 `eyJ` JWT 格式。

**结论**：新版 key 完全兼容 `@supabase/supabase-js` 客户端，无需特殊处理。

---

## 扩展方向

| 方向 | 说明 | 优先级 |
|------|------|--------|
| 全文搜索 | PostgreSQL `ts_vector` + 中文分词 | P2 |
| 版本历史 | 基于 `doc_snapshots` 表的时间线 | P2 |
| 评论功能 | 行内评论 + 线程回复 | P2 |
| 离线编辑 | Service Worker + IndexedDB 缓存 | P3 |
| 端到端加密 | 客户端加密后传输 | P3 |
| 移动端适配 | PWA + 响应式优化 | P2 |
| WebSocket Provider | 替代 Broadcast Channel 的专用协同服务器 | P3 |
