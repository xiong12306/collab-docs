/**
 * POST /api/auth/logout
 * 退出登录，清除 Cookie
 */
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { code: 200, data: null, message: '已退出登录' },
    { status: 200 }
  );

  // 清除 token Cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即过期
  });

  return response;
}
