/**
 * GET /api/documents/[id]/members — 获取文档成员列表
 * POST /api/documents/[id]/members — 邀请成员
 * PATCH /api/documents/[id]/members — 修改成员权限
 * DELETE /api/documents/[id]/members?user_id=xxx — 移除成员
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { Role } from '@/types/collaboration';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET 获取文档成员列表 */
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

    // 检查文档是否存在及用户权限（P1：过滤已软删除的文档）
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

    // 检查当前用户是否有权限查看成员（owner 或 doc_member）
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
        { code: 403, data: null, message: '无权限查看成员' },
        { status: 403 }
      );
    }

    // 查询成员列表
    const { data: members, error } = await supabase
      .from('doc_members')
      .select('doc_id, user_id, role, invited_at')
      .eq('doc_id', id);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '查询成员失败' },
        { status: 500 }
      );
    }

    // 收集所有需要查询的用户 ID
    const userIds = [doc.owner_id, ...(members || []).map((m) => m.user_id)];
    const uniqueUserIds = [...new Set(userIds)];

    // 批量查询用户信息
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', uniqueUserIds);

    // 构建用户信息映射
    const userMap = new Map(
      (users || []).map((u) => [u.id, u])
    );

    const result = [];

    // 添加 owner
    const ownerInfo = userMap.get(doc.owner_id);
    if (ownerInfo) {
      result.push({
        user_id: ownerInfo.id,
        name: ownerInfo.name,
        email: ownerInfo.email,
        role: 'owner',
        invited_at: '',
      });
    }

    // 添加其他成员（跳过 owner 记录）
    for (const m of members || []) {
      if (m.role === 'owner') continue;
      const u = userMap.get(m.user_id);
      if (u) {
        result.push({
          user_id: u.id,
          name: u.name,
          email: u.email,
          role: m.role,
          invited_at: m.invited_at,
        });
      }
    }

    return NextResponse.json(
      { code: 200, data: result, message: 'ok' },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取成员列表异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** POST 邀请成员 */
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
    const { email, role } = body;

    // 参数校验
    if (!email || !role) {
      return NextResponse.json(
        { code: 400, data: null, message: '邮箱和角色为必填项' },
        { status: 400 }
      );
    }

    if (role !== Role.EDITOR && role !== Role.VIEWER) {
      return NextResponse.json(
        { code: 400, data: null, message: '角色必须为 editor 或 viewer' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 检查权限：仅 owner 可邀请（P1：过滤已软删除的文档）
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!doc || doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可邀请成员' },
        { status: 403 }
      );
    }

    // 查找目标用户
    const { data: targetUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { code: 404, data: null, message: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否已是成员
    const { data: existingMember } = await supabase
      .from('doc_members')
      .select('role')
      .eq('doc_id', id)
      .eq('user_id', targetUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { code: 409, data: null, message: '用户已是成员' },
        { status: 409 }
      );
    }

    // 添加成员
    const { error } = await supabase.from('doc_members').insert({
      doc_id: id,
      user_id: targetUser.id,
      role,
    });

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '邀请失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        code: 201,
        data: { doc_id: id, user_id: targetUser.id, role },
        message: '邀请成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('邀请成员异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** PATCH 修改成员权限 */
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
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { code: 400, data: null, message: '用户ID和角色为必填项' },
        { status: 400 }
      );
    }

    // 校验角色合法性
    if (!['editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { code: 400, data: null, message: '无效的角色' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 检查权限：仅 owner 可修改（P1：过滤已软删除的文档）
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!doc || doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可修改权限' },
        { status: 403 }
      );
    }

    // 不能修改 owner 的权限
    if (doc.owner_id === user_id) {
      return NextResponse.json(
        { code: 400, data: null, message: '不能修改拥有者权限' },
        { status: 400 }
      );
    }

    // 更新权限
    const { error } = await supabase
      .from('doc_members')
      .update({ role })
      .eq('doc_id', id)
      .eq('user_id', user_id);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '更新权限失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: null, message: '权限已更新' },
      { status: 200 }
    );
  } catch (error) {
    console.error('修改成员权限异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** DELETE 移除成员 */
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { code: 400, data: null, message: '缺少 user_id 参数' },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // 检查权限：仅 owner 可移除（P1：过滤已软删除的文档）
    const { data: doc } = await supabase
      .from('documents')
      .select('owner_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (!doc || doc.owner_id !== user.id) {
      return NextResponse.json(
        { code: 403, data: null, message: '仅拥有者可移除成员' },
        { status: 403 }
      );
    }

    // 不能移除 owner
    if (doc.owner_id === userId) {
      return NextResponse.json(
        { code: 400, data: null, message: '不能移除拥有者' },
        { status: 400 }
      );
    }

    // 移除成员
    const { error } = await supabase
      .from('doc_members')
      .delete()
      .eq('doc_id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '移除成员失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 200, data: null, message: '成员已移除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('移除成员异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
