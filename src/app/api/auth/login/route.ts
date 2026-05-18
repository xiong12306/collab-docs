/**
 * POST /api/auth/login
 * 用户登录，签发 JWT 写入 httpOnly Cookie
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import type { AuthUser } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 参数校验
    if (!email || !password) {
      return NextResponse.json(
        { code: 400, data: null, message: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 查询用户（含密码哈希）
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { code: 401, data: null, message: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { code: 401, data: null, message: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // 签发 JWT
    const token = await signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    };

    // 设置 httpOnly Cookie 并返回用户信息
    const response = NextResponse.json(
      { code: 200, data: authUser, message: '登录成功' },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400, // 24 小时
      // MVP 阶段不配置 domain，当前为同域部署（前端与 API 同源）。
      // 若后续需要跨域部署（如前端 app.example.com + API api.example.com），
      // 需要设置 domain: '.example.com' 以支持 Cookie 跨子域共享。
    });

    return response;
  } catch (error) {
    console.error('登录异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json(
      { code: 500, data: null, message, detail: String(error) },
      { status: 500 }
    );
  }
}
