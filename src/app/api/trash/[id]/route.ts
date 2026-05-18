/**
 * PATCH /api/trash/[id] — 恢复文档（将 deleted_at 设为 NULL）
 * DELETE /api/trash/[id] — 永久删除文档（物理删除，级联删除关联数据）
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** PATCH 恢复文档 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const supabase = getServerClient();

    // 检查文档是否在回收站中且属于当前用户
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id, deleted_at')
      .eq('id', id)
      .single();

    if (!doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    if (doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可恢复文档' },
        { status: 403 }
      );
    }

    if (!doc.deleted_at) {
      return NextResponse.json(
        { code: 400, data: null, message: '文档不在回收站中' },
        { status: 400 }
      );
    }

    // 恢复文档：将 deleted_at 设为 NULL
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '恢复失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: null, message: '文档已恢复' },
      { status: 200 }
    );
  } catch (error) {
    console.error('恢复文档异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** DELETE 永久删除文档（物理删除） */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const supabase = getServerClient();

    // 检查文档是否在回收站中且属于当前用户
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id, deleted_at')
      .eq('id', id)
      .single();

    if (!doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    if (doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可永久删除文档' },
        { status: 403 }
      );
    }

    if (!doc.deleted_at) {
      return NextResponse.json(
        { code: 400, data: null, message: '文档不在回收站中，请先移入回收站' },
        { status: 400 }
      );
    }

    // 物理删除文档（级联删除关联数据：doc_members, doc_shares, yjs_updates, doc_snapshots）
    const { error } = await supabase.from('documents').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '永久删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: null, message: '文档已永久删除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('永久删除文档异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
