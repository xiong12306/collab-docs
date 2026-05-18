/**
 * GET /api/share/[token] — 验证分享链接
 * 不需要登录也可以查看分享信息，但加入需要登录
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/** GET 验证分享链接 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const supabase = getServerClient();

    // 查询分享链接
    const { data: share, error } = await supabase
      .from('doc_shares')
      .select('doc_id, role, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !share) {
      return NextResponse.json(
        { code: 404, data: null, message: '分享链接不存在' },
        { status: 404 }
      );
    }

    // 检查是否过期
    const isExpired = share.expires_at
      ? new Date(share.expires_at) < new Date()
      : false;

    // 查询文档标题（P1：过滤已软删除的文档）
    const { data: doc } = await supabase
      .from('documents')
      .select('title')
      .eq('id', share.doc_id)
      .is('deleted_at', null)
      .single();

    // P1：文档已被软删除
    if (!doc) {
      return NextResponse.json(
        { code: 410, data: null, message: '文档已被删除' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        code: 200,
        data: {
          doc_id: share.doc_id,
          title: doc.title,
          role: share.role,
          expires_at: share.expires_at,
          is_expired: isExpired,
          is_used: share.used,
        },
        message: 'ok',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('验证分享链接异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
