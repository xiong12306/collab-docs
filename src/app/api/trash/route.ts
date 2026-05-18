/**
 * GET /api/trash — 获取回收站文档列表
 * 返回当前用户拥有的已软删除文档，包含剩余天数
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/middleware';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { code: 401, data: null, message: '未登录' },
        { status: 401 }
      );
    }

    const supabase = getServerClient();

    // 查询当前用户拥有的已删除文档
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, title, updated_at, deleted_at, owner_id')
      .eq('owner_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { code: 500, data: null, message: '查询回收站失败' },
        { status: 500 }
      );
    }

    // 计算剩余天数（30 天自动删除）
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const result = (docs || []).map((doc) => {
      const deletedAt = new Date(doc.deleted_at).getTime();
      const now = Date.now();
      const elapsed = now - deletedAt;
      const remainingDays = Math.max(0, Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000)));

      return {
        id: doc.id,
        title: doc.title,
        updated_at: doc.updated_at,
        deleted_at: doc.deleted_at,
        owner_id: doc.owner_id,
        remaining_days: remainingDays,
      };
    });

    return NextResponse.json(
      { code: 200, data: result, message: 'ok' },
      { status: 200 }
    );
  } catch (error) {
    console.error('获取回收站列表异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
