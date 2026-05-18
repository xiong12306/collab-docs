/**
 * POST /api/documents — 创建文档
 * GET /api/documents?type=owned|shared — 获取文档列表
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';
import { getDefaultContent } from '@/lib/utils';

/** POST 创建文档 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const title = body.title || '未命名文档';

    const supabase = getServerClient();

    // 创建文档
    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        title,
        content: getDefaultContent(title),
        owner_id: user.id,
      })
      .select('id, title, content, owner_id, created_at, updated_at')
      .single();

    if (error || !doc) {
      return NextResponse.json(
        { code: 500, data: null, message: '创建文档失败' },
        { status: 500 }
      );
    }

    // 自动添加 owner 为 doc_member
    const { error: memberError } = await supabase.from('doc_members').insert({
      doc_id: doc.id,
      user_id: user.id,
      role: 'owner',
    });

    if (memberError) {
      // 成员插入失败，回滚文档创建
      await supabase.from('documents').delete().eq('id', doc.id);
      return NextResponse.json(
        { code: 500, data: null, message: '创建文档失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 201, data: doc, message: '创建成功' },
      { status: 201 }
    );
  } catch (error) {
    console.error('创建文档异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/** GET 获取文档列表 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'owned';

    const supabase = getServerClient();

    if (type === 'owned') {
      // 获取我的文档（owner）
      const { data: docs, error } = await supabase
        .from('documents')
        .select('id, title, updated_at, owner_id')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { code: 500, data: null, message: '查询失败' },
          { status: 500 }
        );
      }

      // 查询每个文档的成员数量
      const docIds = docs?.map((d) => d.id) || [];
      let memberCounts: Record<string, number> = {};

      if (docIds.length > 0) {
        const { data: members } = await supabase
          .from('doc_members')
          .select('doc_id')
          .in('doc_id', docIds);

        if (members) {
          members.forEach((m) => {
            memberCounts[m.doc_id] = (memberCounts[m.doc_id] || 0) + 1;
          });
        }
      }

      const result = (docs || []).map((doc) => ({
        id: doc.id,
        title: doc.title,
        updated_at: doc.updated_at,
        owner_id: doc.owner_id,
        member_count: memberCounts[doc.id] || 1,
        role: 'owner',
      }));

      return NextResponse.json(
        { code: 200, data: result, message: 'ok' },
        { status: 200 }
      );
    } else {
      // 获取共享给我的文档（doc_members 中有记录且非 owner）
      const { data: memberDocs, error } = await supabase
        .from('doc_members')
        .select('doc_id, role')
        .eq('user_id', user.id)
        .neq('role', 'owner');

      if (error || !memberDocs || memberDocs.length === 0) {
        return NextResponse.json(
          { code: 200, data: [], message: 'ok' },
          { status: 200 }
        );
      }

      const sharedDocIds = memberDocs.map((m) => m.doc_id);
      const roleMap = new Map(memberDocs.map((m) => [m.doc_id, m.role]));

      const { data: docs } = await supabase
        .from('documents')
        .select('id, title, updated_at, owner_id')
        .in('id', sharedDocIds)
        .order('updated_at', { ascending: false });

      // 查询成员数量
      let memberCounts: Record<string, number> = {};
      const { data: members } = await supabase
        .from('doc_members')
        .select('doc_id')
        .in('doc_id', sharedDocIds);

      if (members) {
        members.forEach((m) => {
          memberCounts[m.doc_id] = (memberCounts[m.doc_id] || 0) + 1;
        });
      }

      const result = (docs || []).map((doc) => ({
        id: doc.id,
        title: doc.title,
        updated_at: doc.updated_at,
        owner_id: doc.owner_id,
        member_count: memberCounts[doc.id] || 1,
        role: roleMap.get(doc.id) || 'viewer',
      }));

      return NextResponse.json(
        { code: 200, data: result, message: 'ok' },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('获取文档列表异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
