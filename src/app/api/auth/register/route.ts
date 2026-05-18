/**
 * POST /api/auth/register
 * 注册新用户
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import type { AuthUser } from '@/types/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 参数校验
    if (!email || !password || !name) {
      return NextResponse.json(
        { code: 400, data: null, message: '邮箱、密码和姓名为必填项' },
        { status: 400 }
      );
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { code: 400, data: null, message: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 密码长度校验
    if (password.length < 6) {
      return NextResponse.json(
        { code: 400, data: null, message: '密码至少6位' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 检查邮箱是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { code: 409, data: null, message: '该邮箱已注册' },
        { status: 409 }
      );
    }

    // 密码哈希
    const passwordHash = await hashPassword(password);

    // 生成 DiceBear 头像
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    // 插入用户记录
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        avatar_url: avatarUrl,
      })
      .select('id, email, name, avatar_url')
      .single();

    if (error || !newUser) {
      return NextResponse.json(
        { code: 500, data: null, message: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 签发 JWT
    const token = await signToken({
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    const authUser: AuthUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar_url: newUser.avatar_url,
    };

    // 设置 httpOnly Cookie 并返回用户信息
    const response = NextResponse.json(
      { code: 201, data: authUser, message: '注册成功' },
      { status: 201 }
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
    console.error('注册异常:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json(
      { code: 500, data: null, message, detail: String(error) },
      { status: 500 }
    );
  }
}
