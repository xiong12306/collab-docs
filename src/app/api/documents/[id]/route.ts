/**
 * GET /api/documents/[id] — 获取文档详情
 * PATCH /api/documents/[id] — 更新文档
 * DELETE /api/documents/[id] — 删除文档（P1：改为软删除）
 * P1 增强：所有查询加 deleted_at 过滤，DELETE 改为软删除
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Role } from '@/types/collaboration';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET 获取文档详情 */
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

    // 查询文档（P1：过滤已软删除的文档）
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, title, content, owner_id, created_at, updated_at, deleted_at')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !doc) {
      return NextResponse.json(
        { code: 404, data: null, message: '文档不存在' },
        { status: 404 }
      );
    }

    // 检查权限：owner 或 doc_member
    let myRole = '';
    if (doc.owner_id === user.id) {
      myRole = Role.OWNER;
    } else {
      const { data: member } = await supabase
        .from('doc_members')
        .select('role')
        .eq('doc_id', id)
        .eq('user_id', user.id)
        .single();

      if (!member) {
        return NextResponse.json(
          { code: 403, data: null, message: '无权限访问此文档' },
          { status: 403 }
        );
      }
      myRole = member.role;
    }

    return NextResponse.json(
      { code: 200, data: { ...doc, my_role: myRole }, message: 'ok' },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取文档详情异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** PATCH 更新文档 */
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
    const body = await request.json();
    const supabase = getServerClient();

    // P1：检查权限时过滤已软删除的文档
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

    let canEditDoc = doc.owner_id === user.id;
    if (!canEditDoc) {
      const { data: member } = await supabase
        .from('doc_members')
        .select('role')
        .eq('doc_id', id)
        .eq('user_id', user.id)
        .single();
      canEditDoc = member?.role === Role.EDITOR;
    }

    if (!canEditDoc) {
      return NextResponse.json(
        { code: 403, data: null, message: '无权限编辑此文档' },
        { status: 403 }
      );
    }

    // 更新文档
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;

    const { data: updatedDoc, error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id)
      .select('id, title')
      .single();

    if (error || !updatedDoc) {
      return NextResponse.json(
        { code: 500, data: null, message: '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: updatedDoc, message: '更新成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('更新文档异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** DELETE 删除文档（P1：改为软删除） */
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

    // P1：检查权限时过滤已软删除的文档
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

    if (doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可删除文档' },
        { status: 403 }
      );
    }

    // P1 改造：软删除 — 设置 deleted_at 为当前时间
    const { error } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: null, message: '文档已移入回收站' },
      { status: 200 }
    );
  } catch (error) {
    console.error('删除文档异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
