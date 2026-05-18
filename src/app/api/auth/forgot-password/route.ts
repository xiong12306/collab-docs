/**
 * POST /api/auth/forgot-password — 请求密码重置
 * 验证邮箱是否已注册，生成 token
 * MVP：直接在响应中返回 rawToken（不发送邮件）
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // 参数校验
    if (!email) {
      return NextResponse.json(
        { code: 400, data: null, message: '邮箱为必填项' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 查询邮箱是否已注册
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { code: 404, data: null, message: '该邮箱未注册' },
        { status: 404 }
      );
    }

    // 生成安全 token（64 字符 hex）
    const rawToken = crypto.randomBytes(32).toString('hex');
    // 存储 SHA-256 哈希值，不存原文
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    // 1 小时后过期
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 写入 password_reset_tokens 表
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('插入密码重置 token 失败:', insertError);
      return NextResponse.json(
        { code: 500, data: null, message: '请求重置失败，请稍后重试' },
        { status: 500 }
      );
    }

    // MVP：直接在响应中返回 rawToken（未来改为发送邮件）
    return NextResponse.json(
      {
        code: 200,
        data: {
          token: rawToken,
          message: '邮箱验证成功，请设置新密码',
        },
        message: 'ok',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('忘记密码异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
