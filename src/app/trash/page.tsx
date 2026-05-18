'use client';

/**
 * 回收站页面
 * 显示已删除的文档列表，支持恢复和永久删除
 */
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/layout/Header';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { TrashList } from '@/components/trash/TrashList';
import { useTrash } from '@/hooks/useTrash';
import { Empty } from 'antd';

export default function TrashPage() {
  const { documents, loading, restoreDoc, permanentDelete, refresh } = useTrash();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">回收站</h1>
              <p className="text-sm text-gray-500 mt-1">
                文档删除后将保留 30 天，过期后自动永久删除
              </p>
            </div>
          </div>

          {/* 文档列表 */}
          {loading ? (
            <LoadingSkeleton type="list" />
          ) : documents.length === 0 ? (
            <Empty
              description="回收站是空的"
              className="py-20"
            />
          ) : (
            <TrashList
              documents={documents}
              onRestore={restoreDoc}
              onPermanentDelete={permanentDelete}
              onRefresh={refresh}
            />
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
