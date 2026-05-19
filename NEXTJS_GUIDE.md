# Next.js 入门指南

> 面向零基础开发者，从零开始理解 Next.js 的核心概念。每个知识点都配有代码示例，让你快速上手。

---

## 目录

- [Next.js 是什么？](#nextjs-是什么)
- [核心概念](#核心概念)
  - [App Router vs Pages Router](#app-router-vs-pages-router)
  - [文件即路由](#文件即路由)
  - [Server Components vs Client Components](#server-components-vs-client-components)
  - [数据获取](#数据获取)
  - [API Routes](#api-routes)
  - [Middleware](#middleware)
  - [布局与模板](#布局与模板)
  - [路由组与动态路由](#路由组与动态路由)
- [样式方案](#样式方案)
- [部署](#部署)
- [常见问题](#常见问题)

---

## Next.js 是什么？

一句话：**Next.js 是 React 的全栈框架**。

React 本身只是一个 UI 库，它只负责渲染界面。要做一个完整的网站，你还需要：
- 路由（页面跳转）
- 服务端渲染（SEO、首屏速度）
- API 接口（后端逻辑）
- 打包构建（部署上线）

Next.js 把这些都帮你搞定了，你只需要写代码。

### 为什么要用 Next.js？

| 没有 Next.js | 有 Next.js |
|-------------|-----------|
| 用 React Router 做路由 | 文件夹结构即路由，零配置 |
| 用 Express 写后端 API | API Routes 和前端在同一个项目 |
| 用 react-helmet 管理 SEO | 内置 `<head>` 管理 |
| 手动配置 Webpack | 零配置打包 |
| 部署到 VPS | 一键部署到 Vercel |

---

## 核心概念

### App Router vs Pages Router

Next.js 有两套路由系统：

| | Pages Router（旧） | App Router（新） |
|--|-------------------|-----------------|
| 目录 | `src/pages/` | `src/app/` |
| 路由文件 | `pages/about.tsx` | `app/about/page.tsx` |
| 布局 | `_app.tsx` 全局 | `layout.tsx` 嵌套 |
| 服务端组件 | 不支持 | 默认 Server Component |
| 数据获取 | `getServerSideProps` | `async` 函数直接 `await` |
| 推荐度 | ⚠️ 旧项目维护 | ✅ 新项目首选 |

**新项目一律用 App Router**，本指南也只讲 App Router。

---

### 文件即路由

这是 Next.js 最核心的设计：**文件路径就是 URL 路径**。

```
src/app/
├── page.tsx              → /            （首页）
├── about/
│   └── page.tsx          → /about       （关于页）
├── blog/
│   ├── page.tsx          → /blog        （博客列表）
│   └── [id]/
│       └── page.tsx      → /blog/123    （博客详情，动态路由）
└── settings/
    └── page.tsx          → /settings    （设置页）
```

#### 规则很简单

1. 每个文件夹 = URL 中的一个路径段
2. `page.tsx` = 该路径对应的页面组件
3. `layout.tsx` = 该路径及其子路径的共享布局

#### 最简单的页面

```tsx
// src/app/about/page.tsx
export default function AboutPage() {
  return <h1>关于我们</h1>;
}
```

访问 `/about` 就能看到这个页面。不需要写路由配置，不需要注册路由，放个文件就行。

---

### Server Components vs Client Components

这是 Next.js App Router 最重要的概念。

**默认所有组件都是 Server Component**（在服务端运行），如果需要浏览器端的交互（useState、onClick 等），必须显式声明 `'use client'`。

#### Server Component（默认）

```tsx
// src/app/page.tsx
// 这是 Server Component —— 在服务端运行，不发送 JS 到浏览器

// ✅ 可以直接访问数据库
import { getServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = getServerClient();
  const { data } = await supabase.from('documents').select('*');

  return (
    <ul>
      {data.map(doc => <li key={doc.id}>{doc.title}</li>)}
    </ul>
  );
}
```

**优点**：
- 不发送 JavaScript 到浏览器，页面更轻量
- 可以直接访问数据库、文件系统、环境变量
- SEO 友好（HTML 直接输出）

**限制**：
- ❌ 不能用 `useState`、`useEffect`
- ❌ 不能用 `onClick`、`onChange`
- ❌ 不能用浏览器 API（`window`、`localStorage`）

#### Client Component（需要 'use client'）

```tsx
// src/components/Counter.tsx
'use client';  // ← 这一行是关键！

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>点击次数：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

**优点**：
- ✅ 可以用所有 React Hooks
- ✅ 可以处理用户交互
- ✅ 可以用浏览器 API

**限制**：
- 不能直接访问数据库（需要通过 API）
- 会发送 JavaScript 到浏览器

#### 什么时候用哪个？

| 场景 | 用 Server | 用 Client |
|------|---------|----------|
| 读取数据库 | ✅ | ❌ |
| 表单交互 | ❌ | ✅ |
| 显示静态内容 | ✅ | 也能用但不推荐 |
| useState/useEffect | ❌ | ✅ |
| onClick/onChange | ❌ | ✅ |
| SEO 关键页面 | ✅ | ❌ |

#### Server 和 Client 可以混用

```tsx
// Server Component
import { getServerClient } from '@/lib/supabase/server';
import Counter from '@/components/Counter';  // Client Component

export default async function Page() {
  const supabase = getServerClient();
  const { data } = await supabase.from('documents').select('*');

  return (
    <div>
      {/* 服务端渲染的数据 */}
      <ul>{data.map(doc => <li key={doc.id}>{doc.title}</li>)}</ul>

      {/* 客户端交互组件 */}
      <Counter />
    </div>
  );
}
```

> **经验法则**：默认用 Server Component，只在需要交互时才用 Client Component。

---

### 数据获取

App Router 中的数据获取非常简单——直接在组件里 `await`。

#### Server Component 中获取数据

```tsx
// src/app/docs/page.tsx
export default async function DocsPage() {
  // 这是 Server Component，可以直接 await
  const res = await fetch('https://api.example.com/docs');
  const docs = await res.json();

  return (
    <ul>
      {docs.map(doc => <li key={doc.id}>{doc.title}</li>)}
    </ul>
  );
}
```

#### Client Component 中获取数据

Client Component 不能是 `async` 函数，需要用 `useEffect`：

```tsx
// src/components/DocList.tsx
'use client';

import { useState, useEffect } from 'react';

export default function DocList() {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => setDocs(data));
  }, []);

  return (
    <ul>
      {docs.map(doc => <li key={doc.id}>{doc.title}</li>)}
    </ul>
  );
}
```

#### 封装成 Hook（推荐做法）

把数据获取逻辑封装成自定义 Hook，更干净：

```tsx
// src/hooks/useDocuments.ts
'use client';

import { useState, useEffect } from 'react';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        setDocuments(data);
        setLoading(false);
      });
  }, []);

  return { documents, loading };
}
```

使用：

```tsx
// src/components/DocList.tsx
'use client';

import { useDocuments } from '@/hooks/useDocuments';

export default function DocList() {
  const { documents, loading } = useDocuments();

  if (loading) return <div>加载中...</div>;

  return (
    <ul>
      {documents.map(doc => <li key={doc.id}>{doc.title}</li>)}
    </ul>
  );
}
```

---

### API Routes

API Routes 让你在 Next.js 项目中写后端接口，不需要单独部署后端服务。

#### 基本用法

在 `src/app/api/` 目录下创建 `route.ts`：

```ts
// src/app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: 'Hello World' });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ received: body });
}
```

访问 `GET /api/hello` 返回 `{ message: 'Hello World' }`。

#### 读取请求参数

```ts
// src/app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = params.id;  // 从 URL 中获取

  // 查询数据库...
  return Response.json({ id: userId, name: '张三' });
}
```

#### 读取 Cookie 和请求头

```ts
// src/app/api/auth/me/route.ts
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return Response.json({ error: '未登录' }, { status: 401 });
  }

  // 验证 token...
  return Response.json({ user: { id: '1', name: '张三' } });
}
```

#### 设置 Cookie

```ts
// src/app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  // 验证密码...
  const token = '签发的-jwt-token';

  return Response.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': `token=${token}; HttpOnly; Secure; Path=/; Max-Age=86400`,
      },
    }
  );
}
```

#### 读取环境变量

```ts
// 服务端环境变量（不带 NEXT_PUBLIC_ 前缀）
// 只能在 Server Components 和 API Routes 中访问
const dbUrl = process.env.DATABASE_URL;

// 公开环境变量（带 NEXT_PUBLIC_ 前缀）
// 可以在客户端和服务端都访问
const publicUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

### Middleware

Middleware 在每个请求到达页面或 API 之前运行，适合做鉴权、重定向、限流等。

#### 基本用法

```ts
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 检查是否已登录
  const token = request.cookies.get('token');

  // 未登录且访问受保护页面 → 重定向到登录页
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 已登录 → 放行
  return NextResponse.next();
}

// 配置哪些路径需要经过 Middleware
export const config = {
  matcher: [
    '/docs/:path*',
    '/trash/:path*',
    '/api/:path*',
  ],
};
```

#### 在 Middleware 中注入请求头

```ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token');

  if (token) {
    // 将用户 ID 注入请求头，后续 API Route 可以读取
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', 'user-123');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}
```

#### Matcher 配置

```ts
// 精确匹配
export const config = {
  matcher: '/about',
};

// 通配符匹配
export const config = {
  matcher: ['/docs/:path*', '/api/:path*'],
};

// 排除某些路径
export const config = {
  matcher: ['/((?!login|register|_next/static).*)'],
};
```

---

### 布局与模板

#### Layout（布局）

`layout.tsx` 包裹页面，**在导航时不会重新渲染**（状态保持）：

```tsx
// src/app/layout.tsx（根布局，必须有）
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// src/app/docs/layout.tsx（文档模块布局）
import { Header } from '@/components/layout/Header';

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      <main>{children}</main>
    </div>
  );
}
```

布局嵌套规则：

```
app/layout.tsx          ← 包裹所有页面
  └── app/docs/layout.tsx  ← 包裹 /docs/* 页面
        └── app/docs/[id]/layout.tsx  ← 包裹 /docs/123 页面
```

#### Template（模板）

`template.tsx` 和 `layout.tsx` 类似，但**在导航时会重新渲染**（状态不保持）：

```tsx
// src/app/docs/template.tsx
export default function DocsTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  // 每次导航到 /docs/* 都会重新挂载
  return <div className="animate-fadeIn">{children}</div>;
}
```

#### Layout vs Template

| | Layout | Template |
|--|--------|----------|
| 导航时 | 保持挂载，不重新渲染 | 重新挂载 |
| 状态保持 | ✅ 保持 | ❌ 重置 |
| 适用场景 | 侧边栏、导航栏 | 进入动画、埋点 |

---

### 路由组与动态路由

#### 路由组 `(folder)`

用括号包裹的文件夹不会出现在 URL 中，用于组织代码：

```
src/app/
├── (auth)/              ← 路由组，不出现在 URL 中
│   ├── login/page.tsx   → /login
│   └── register/page.tsx → /register
├── (main)/              ← 另一个路由组
│   ├── docs/page.tsx    → /docs
│   └── trash/page.tsx   → /trash
```

每个路由组可以有独立的 `layout.tsx`：

```
src/app/
├── (auth)/
│   ├── layout.tsx       ← 登录/注册共用简洁布局
│   ├── login/page.tsx
│   └── register/page.tsx
├── (main)/
│   ├── layout.tsx       ← 主内容区共用 Header + Sidebar 布局
│   ├── docs/page.tsx
│   └── trash/page.tsx
```

#### 动态路由 `[param]`

```tsx
// src/app/docs/[id]/page.tsx
export default function DocPage({ params }: { params: { id: string } }) {
  // 访问 /docs/abc123 → params.id = "abc123"
  return <h1>文档 {params.id}</h1>;
}
```

#### Catch-all 路由 `[...slug]`

```tsx
// src/app/shop/[...slug]/page.tsx
export default function ShopPage({ params }: { params: { slug: string[] } }) {
  // /shop/a/b/c → params.slug = ["a", "b", "c"]
  return <h1>路径：{params.slug.join('/')}</h1>;
}
```

---

## 样式方案

Next.js 支持多种样式方案，推荐组合使用：

### Tailwind CSS（原子化 CSS）

```tsx
// 安装：npm install -D tailwindcss postcss autoprefixer
// 初始化：npx tailwindcss init -p

// 组件中使用
export default function Card() {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <h2 className="text-xl font-bold text-gray-900">标题</h2>
      <p className="text-gray-500 mt-2">描述文字</p>
    </div>
  );
}
```

### CSS Modules（局部作用域 CSS）

```tsx
// Button.module.css
.btn {
  padding: 8px 16px;
  border-radius: 8px;
}
.primary {
  background: blue;
  color: white;
}

// Button.tsx
import styles from './Button.module.css';

export default function Button() {
  return <button className={`${styles.btn} ${styles.primary}`}>点击</button>;
}
```

### Ant Design 组件库

```tsx
// 安装：npm install antd @ant-design/icons @ant-design/nextjs-registry

// app/layout.tsx
import { AntdRegistry } from '@ant-design/nextjs-registry';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}

// 组件中使用
'use client';

import { Button, Input, message } from 'antd';

export default function LoginForm() {
  return (
    <form>
      <Input placeholder="邮箱" />
      <Input.Password placeholder="密码" />
      <Button type="primary" htmlType="submit">登录</Button>
    </form>
  );
}
```

> **注意**：Ant Design 组件必须在 Client Component 中使用（加 `'use client'`）。`AntdRegistry` 用于解决 SSR 样式闪烁问题。

---

## 部署

### Vercel 部署（最简单）

1. 将代码推送到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入项目
3. 配置环境变量
4. 点击部署

Vercel 自动识别 Next.js，零配置部署。每次推送代码自动触发重新部署。

### 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 中添加：

```bash
# 公开变量（浏览器可见）
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 私密变量（仅服务端可用）
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
```

### 自托管部署

```bash
# 构建
npm run build

# 启动
npm run start

# 指定端口
npm run start -- -p 8080
```

---

## 常见问题

### Q: `use client` 必须写在文件第一行吗？

是的。`'use client'` 必须是文件最顶部的一行（可以在注释之后），否则不生效。

### Q: Server Component 可以导入 Client Component 吗？

可以。Server Component 可以导入并渲染 Client Component，反之不行——Client Component 不能直接导入 Server Component（但可以通过 `children` prop 传递）。

```tsx
// ✅ Server Component 导入 Client Component
// page.tsx (Server)
import Counter from './Counter';  // Client Component

export default function Page() {
  return <Counter />;  // OK
}

// ❌ Client Component 不能直接导入 Server Component
// Widget.tsx (Client)
'use client';
import ServerComponent from './Server';  // ❌ 不行

// ✅ 通过 children 传递
// page.tsx (Server)
import Widget from './Widget';
import ServerComponent from './Server';

export default function Page() {
  return (
    <Widget>
      <ServerComponent />  {/* 作为 children 传递，OK */}
    </Widget>
  );
}
```

### Q: 为什么我的页面数据不更新？

Server Component 默认会被缓存。如果你需要实时数据，可以：

```tsx
// 方式 1：取消缓存
export const dynamic = 'force-dynamic';

// 方式 2：设置重新验证时间
export const revalidate = 60; // 60 秒后重新验证

// 方式 3：fetch 中设置
const res = await fetch('https://api.example.com/data', {
  cache: 'no-store',  // 不缓存
});
```

### Q: `'use client'` 的组件里所有子组件都变成了 Client Component 吗？

不是。`'use client'` 只标记当前文件为 Client Component。被它导入的模块如果也标记了 `'use client'` 才是 Client Component，否则还是 Server Component。

但注意：如果一个 Client Component 导入了一个没有 `'use client'` 的模块，那个模块会在客户端运行（因为整个组件树都在客户端了）。

### Q: API Route 中 `params` 怎么获取？

Next.js 15 中 `params` 是 Promise，需要 await：

```ts
// Next.js 15
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return Response.json({ id });
}
```

### Q: 如何在 API Route 中获取客户端 IP？

```ts
import { headers } from 'next/headers';

export async function GET() {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  return Response.json({ ip });
}
```

### Q: 图片用 `<img>` 还是 `next/image`？

优先用 `next/image`，自动优化图片大小、格式、懒加载：

```tsx
import Image from 'next/image';

export default function Avatar() {
  return (
    <Image
      src="/avatar.png"
      alt="头像"
      width={48}
      height={48}
      className="rounded-full"
    />
  );
}
```

---

## 推荐学习资源

- [Next.js 官方文档](https://nextjs.org/docs) — 最权威的参考
- [React 官方文档](https://react.dev) — 理解 React 基础
- [Next.js Learn 教程](https://nextjs.org/learn) — 官方互动教程
- [Vercel 模板库](https://vercel.com/templates) — 开箱即用的项目模板

---

> 💡 **学习建议**：不要只看文档，边看边写。看到每个例子，都在自己的项目里敲一遍，改改参数看看效果。编程是手艺活，熟能生巧。
