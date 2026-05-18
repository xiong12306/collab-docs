/**
 * 鉴权中间件逻辑
 * 从 Cookie 中读取 JWT 并验证用户身份
 * 供 API Routes 使用
 */
import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import type { AuthUser } from '@/types/auth';

/**
 * 从请求中获取当前登录用户
 * 读取 httpOnly Cookie 中的 JWT，验证后返回用户信息
 *
 * 设计说明（双重验证）：
 * Next.js Middleware（middleware.ts）已将 x-user-id 注入请求头，
 * 但 API Routes 仍通过此函数从 Cookie 重新验证 JWT。
 * 这是 MVP 阶段的有意设计——双重验证确保安全：
 * - Middleware 层：拦截未登录请求，保护路由
 * - API Route 层：独立验证 JWT，不信任上游输入（防御请求伪造）
 * 未来优化可考虑信任 Middleware 注入的请求头，省去二次验证开销。
 *
 * @returns 用户信息，未登录或 Token 无效返回 null
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar_url: null, // JWT 中不含 avatar_url，从数据库获取
    };
  } catch {
    return null;
  }
}

/**
 * 从请求头中获取当前用户 ID（由 Middleware 注入）
 * 用于已通过 Middleware 鉴权的 API Routes
 * @param headers - 请求头
 * @returns 用户 ID，不存在返回 null
 */
export function getUserIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-user-id');
}
