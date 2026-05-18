/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录或 Token 已过期' },
        { status: 401 }
      );
    }

    // 从数据库获取最新用户信息（含头像）
    const supabase = getServerClient();
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, name, avatar_url')
      .eq('id', user.id)
      .single();

    if (!dbUser) {
      return NextResponse.json(
        { code: 401, data: null, message: '用户不存在' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        code: 200,
        data: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatar_url: dbUser.avatar_url,
        },
        message: 'ok',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取用户信息异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
