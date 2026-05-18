/**
 * POST /api/auth/reset-password — 执行密码重置
 * 验证 token，更新密码
 * Token 验证：SHA-256(rawToken) 与数据库 token_hash 比对
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/auth/password';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, new_password } = body;

    // 参数校验
    if (!token || !new_password) {
      return NextResponse.json(
        { code: 400, data: null, message: 'token 和新密码为必填项' },
        { status: 400 }
      );
    }

    // 密码强度校验
    if (new_password.length < 6) {
      return NextResponse.json(
        { code: 422, data: null, message: '密码长度不能少于 6 位' },
        { status: 422 }
      );
    }

    // 计算 token 的 SHA-256 哈希
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const supabase = getServerClient();

    // 查找有效的 token 记录
    const { data: tokenRecord, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, token_hash, expires_at, used')
      .eq('token_hash', tokenHash)
      .eq('used', false)
      .single();

    if (error || !tokenRecord) {
      return NextResponse.json(
        { code: 400, data: null, message: '重置链接无效或已使用' },
        { status: 400 }
      );
    }

    // 检查 token 是否过期
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { code: 400, data: null, message: '重置链接已过期，请重新申请' },
        { status: 400 }
      );
    }

    // 更新用户密码
    const newPasswordHash = await hashPassword(new_password);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', tokenRecord.user_id);

    if (updateError) {
      console.error('更新密码失败:', updateError);
      return NextResponse.json(
        { code: 500, data: null, message: '密码重置失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 标记 token 为已使用
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id);

    return NextResponse.json(
      { code: 200, data: null, message: '密码重置成功，请使用新密码登录' },
      { status: 200 }
    );
  } catch (error) {
    console.error('重置密码异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
