/**
 * GET /api/cron/cleanup-trash — Vercel Cron 定时清理回收站
 * 删除 deleted_at 超过 30 天的文档（物理删除）
 * 认证：请求头 Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // 验证 CRON_SECRET
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET 环境变量未配置');
      return NextResponse.json(
        { code: 500, data: null, message: 'CRON_SECRET 未配置' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { code: 401, data: null, message: '无效的认证凭据' },
        { status: 401 }
      );
    }

    const supabase = getServerClient();

    // 查询超过 30 天的已删除文档
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredDocs, error: queryError } = await supabase
      .from('documents')
      .select('id')
      .lt('deleted_at', thirtyDaysAgo)
      .limit(100); // MVP：每次最多清理 100 条，避免超时

    if (queryError) {
      console.error('查询过期文档失败:', queryError);
      return NextResponse.json(
        { code: 500, data: null, message: '查询过期文档失败' },
        { status: 500 }
      );
    }

    if (!expiredDocs || expiredDocs.length === 0) {
      return NextResponse.json(
        { code: 200, data: { deleted_count: 0 }, message: '没有需要清理的文档' },
        { status: 200 }
      );
    }

    // 逐个物理删除（级联删除关联数据）
    let deletedCount = 0;
    for (const doc of expiredDocs) {
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (deleteError) {
        console.error(`删除文档 ${doc.id} 失败:`, deleteError);
      } else {
        deletedCount++;
      }
    }

    console.log(`清理完成，共删除 ${deletedCount} 个过期文档`);

    return NextResponse.json(
      { code: 200, data: { deleted_count: deletedCount }, message: '清理完成' },
      { status: 200 }
    );
  } catch (error) {
    console.error('清理回收站异常:', error);
    return NextResponse.json(
      { code: 500, data: null, message: '服务器内部错误' },
      { status: 500 }
    );
  }
}
