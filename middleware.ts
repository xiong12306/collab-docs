import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';

/**
 * Next.js Middleware — 鉴权拦截 + 限流
 *
 * 规则：
 * - /docs/** 路径需要登录，未登录重定向到 /login
 * - /api/auth/login 和 /api/auth/register 限流（每 IP 每分钟 5 次）
 * - /api/auth/** 其他路径放行（如 /me, /logout）
 * - /api/** 其他路径需要验证 JWT，无效返回 401
 * - 其他路径放行
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 登录/注册页面和静态资源放行
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // 认证相关 API — 登录和注册需要限流
  if (pathname === '/api/auth/login' || pathname === '/api/auth/register') {
    const ip = getClientIp(request);
    const { limited, remaining, resetAt } = checkRateLimit(ip, {
      windowMs: 60_000,   // 1 分钟窗口
      maxRequests: 5,     // 每分钟最多 5 次
    });

    if (limited) {
      return NextResponse.json(
        { code: 429, data: null, message: '请求过于频繁，请稍后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    return response;
  }

  // 其他认证 API 放行（/me, /logout）
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // 分享链接验证 API 放行（不需要登录也可以查看）
  if (pathname.match(/^\/api\/share\/[^/]+$/) && !pathname.includes('join')) {
    return NextResponse.next();
  }

  // 从 Cookie 中读取 JWT
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // 未登录：页面请求重定向到登录页，API 请求返回 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录，请先登录' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 验证 JWT
  const payload = await verifyToken(token);
  if (!payload) {
    // Token 无效或过期
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { code: 401, data: null, message: 'Token 已过期，请重新登录' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 将用户信息注入请求头，供下游 API Routes 使用
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub as string);
  requestHeaders.set('x-user-email', payload.email as string);
  requestHeaders.set('x-user-name', payload.name as string);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/** Middleware 匹配规则 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
