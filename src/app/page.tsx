import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * 首页 — 根据登录状态重定向
 * - 已登录 → /docs（文档列表）
 * - 未登录 → /login
 * 使用服务端 JWT 验证避免客户端闪烁
 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      redirect('/docs');
    }
  }

  redirect('/login');
}
