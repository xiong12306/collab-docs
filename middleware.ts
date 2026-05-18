import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Next.js Middleware — 鉴权拦截
 *
 * 规则：
 * - /docs/** 路径需要登录，未登录重定向到 /login
 * - /api/auth/** 路径放行（登录/注册接口）
 * - /api/** 其他路径需要验证 JWT，无效返回 401
 * - 其他路径放行
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 登录/注册页面和静态资源放行
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // 认证相关 API 放行
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
