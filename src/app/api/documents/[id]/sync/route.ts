/**
 * GET /api/documents/[id]/sync — 获取文档的所有 Yjs 增量更新
 * POST /api/documents/[id]/sync — 保存 Yjs 增量更新
 *
 * Yjs 更新以 base64 编码存储在 yjs_updates 表中。
 * POST 保存更新时同时更新 documents.content 为 Tiptap JSON 快照。
 * P1 增强：查询加 deleted_at 过滤
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Role } from '@/types/collaboration';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET 获取文档的所有 Yjs 增量更新（冷启动恢复） */
export async function GET(request: Request, context: RouteContext) {
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

    // P1：检查文档访问权限时过滤已软删除的文档
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    // 检查用户是否是 owner 或 doc_member
    let hasAccess = doc.owner_id === user.id;
    if (!hasAccess) {
      const { data: member } = await supabase
        .from('doc_members')
        .select('role')
        .eq('doc_id', id)
        .eq('user_id', user.id)
        .single();
      hasAccess = !!member;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { code: 403, data: null, message: '无权限访问' },
        { status: 403 }
      );
    }

    // 获取所有 Yjs 增量更新
    const { data: updates, error } = await supabase
      .from('yjs_updates')
      .select('update')
      .eq('doc_id', id)
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '查询更新失败' },
        { status: 500 }
      );
    }

    const updateList = (updates || []).map((row: { update: string }) => row.update);

    return NextResponse.json(
      { code: 200, data: { updates: updateList }, message: 'ok' },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取 Yjs 更新异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** POST 保存 Yjs 增量更新 */
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
    const { update, content } = body as { update?: string; content?: Record<string, unknown> };

    if (!update) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少 update 参数' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // P1：检查文档是否存在时过滤已软删除的文档
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    // 检查写入权限：仅 owner 和 editor 可写入
    let canWrite = doc.owner_id === user.id;
    if (!canWrite) {
      const { data: member } = await supabase
        .from('doc_members')
        .select('role')
        .eq('doc_id', id)
        .eq('user_id', user.id)
        .single();
      canWrite = member?.role === Role.EDITOR;
    }

    if (!canWrite) {
      return NextResponse.json(
        { code: 403, data: null, message: '无写入权限' },
        { status: 403 }
      );
    }

    // 保存 Yjs 增量更新到 yjs_updates 表
    const { error: insertError } = await supabase
      .from('yjs_updates')
      .insert({
        doc_id: id,
        update,
      });

    if (insertError) {
      return NextResponse.json(
        { code: 500, data: null, message: '保存更新失败' },
        { status: 500 }
      );
    }

    // 同时更新 documents.content（Tiptap JSON 快照）
    if (content) {
      await supabase
        .from('documents')
        .update({ content })
        .eq('id', id);
    }

    return NextResponse.json(
      { code: 200, data: null, message: '同步成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('保存 Yjs 更新异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
