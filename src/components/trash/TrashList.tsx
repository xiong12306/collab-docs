'use client';

/**
 * 回收站文档列表组件
 * 列表布局展示已删除的文档卡片
 */
import { Modal } from 'antd';
import { TrashCard } from './TrashCard';
import type { TrashDocListItem } from '@/types/document';

interface TrashListProps {
  documents: TrashDocListItem[];
  /** 恢复文档回调 */
  onRestore: (id: string) => Promise<boolean>;
  /** 永久删除文档回调 */
  onPermanentDelete: (id: string) => Promise<boolean>;
  /** 刷新列表回调 */
  onRefresh: () => Promise<void>;
}

export function TrashList({ documents, onRestore, onPermanentDelete }: TrashListProps) {
  /** 恢复文档 */
  const handleRestore = async (id: string): Promise<boolean> => {
    return onRestore(id);
  };

  /** 永久删除文档 — 二次确认 */
  const handlePermanentDelete = (id: string, title: string) => {
    Modal.confirm({
      title: '永久删除',
      content: `确定要永久删除「${title}」吗？此操作不可恢复。`,
      okText: '永久删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        await onPermanentDelete(id);
      },
    });
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <TrashCard
          key={doc.id}
          document={doc}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      ))}
    </div>
  );
}
