/**
 * POST /api/documents/[id]/share
 * - 生成分享链接（action 未指定或 action=create）
 * - 通过分享链接加入（action=join）
 */
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Role } from '@/types/collaboration';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST 生成分享链接或通过链接加入 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const supabase = getServerClient();

    // 检查文档是否存在
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id, title')
      .eq('id', id)
      .single();

    if (!doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    // 通过分享链接加入
    if (body.action === 'join' && body.token) {
      return handleJoin(supabase, user.id, id, body.token);
    }

    // 生成分享链接 — 仅 owner 可操作
    if (doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可生成分享链接' },
        { status: 403 }
      );
    }

    const { role, expires_in_hours } = body;

    // 角色校验
    if (role !== Role.EDITOR && role !== Role.VIEWER) {
      return NextResponse.json(
        { code: 400, data: null, message: '角色必须为 editor 或 viewer' },
        { status: 400 }
      );
    }

    // 生成唯一 token
    const token = uuidv4();

    // 计算过期时间
    let expiresAt: string | null = null;
    if (expires_in_hours) {
      const expiresDate = new Date();
      expiresDate.setHours(expiresDate.getHours() + expires_in_hours);
      expiresAt = expiresDate.toISOString();
    }

    // 插入分享链接记录
    const { error } = await supabase.from('doc_shares').insert({
      doc_id: id,
      token,
      role,
      created_by: user.id,
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '生成分享链接失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        code: 201,
        data: {
          token,
          share_url: `/share/${token}`,
          role,
          expires_at: expiresAt,
        },
        message: '分享链接已生成',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('分享操作异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理通过分享链接加入文档
 */
async function handleJoin(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  userId: string,
  docId: string,
  token: string
): Promise<NextResponse> {
  // 查询分享链接
  const { data: share, error } = await supabase
    .from('doc_shares')
    .select('id, doc_id, role, expires_at, used')
    .eq('token', token)
    .single();

  if (error || !share) {
    return NextResponse.json(
      { code: 404, data: null, message: '分享链接不存在' },
      { status: 404 }
    );
  }

  // 检查是否已被使用
  if (share.used) {
    return NextResponse.json(
      { code: 410, data: null, message: '该分享链接已被使用' },
      { status: 410 }
    );
  }

  // 检查是否已过期
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json(
      { code: 410, data: null, message: '分享链接已过期' },
      { status: 410 }
    );
  }

  // 检查是否与当前文档匹配（防止通过其他文档的分享链接加入当前文档）
  if (share.doc_id !== docId) {
    return NextResponse.json(
      { code: 400, data: null, message: '分享链接与文档不匹配' },
      { status: 400 }
    );
  }

  // 检查是否已是成员
  const { data: existingMember } = await supabase
    .from('doc_members')
    .select('role')
    .eq('doc_id', docId)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    return NextResponse.json(
      {
        code: 200,
        data: { doc_id: docId, role: existingMember.role },
        message: '已是文档成员',
      },
      { status: 200 }
    );
  }

  // 加入文档
  const { error: insertError } = await supabase.from('doc_members').insert({
    doc_id: docId,
    user_id: userId,
    role: share.role,
  });

  if (insertError) {
    return NextResponse.json(
      { code: 500, data: null, message: '加入文档失败' },
      { status: 500 }
    );
  }

  // 标记分享链接为已使用
  await supabase
    .from('doc_shares')
    .update({ used: true })
    .eq('id', share.id);

  return NextResponse.json(
    {
      code: 200,
      data: { doc_id: docId, role: share.role },
      message: '已加入文档',
    },
    { status: 200 }
  );
}
