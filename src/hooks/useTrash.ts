'use client';

/**
 * 回收站 Hook
 * 提供回收站文档列表查询、恢复、永久删除操作
 */
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { fetchApi } from '@/lib/utils';
import type { TrashDocListItem } from '@/types/document';

interface UseTrashReturn {
  /** 回收站文档列表 */
  documents: TrashDocListItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 刷新回收站列表 */
  refresh: () => Promise<void>;
  /** 恢复文档 */
  restoreDoc: (id: string) => Promise<boolean>;
  /** 永久删除文档 */
  permanentDelete: (id: string) => Promise<boolean>;
}

export function useTrash(): UseTrashReturn {
  const [documents, setDocuments] = useState<TrashDocListItem[]>([]);
  const [loading, setLoading] = useState(true);

  /** 获取回收站文档列表 */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<TrashDocListItem[]>('/api/trash');
      if (res.code === 200 && res.data) {
        setDocuments(res.data);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 恢复文档 */
  const restoreDoc = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetchApi(`/api/trash/${id}`, {
      method: 'PATCH',
    });

    if (res.code === 200) {
      message.success('文档已恢复');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return true;
    } else {
      message.error(res.message || '恢复失败');
      return false;
    }
  }, []);

  /** 永久删除文档 */
  const permanentDelete = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetchApi(`/api/trash/${id}`, {
      method: 'DELETE',
    });

    if (res.code === 200) {
      message.success('文档已永久删除');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      return true;
    } else {
      message.error(res.message || '删除失败');
      return false;
    }
  }, []);

  // 首次加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, refresh, restoreDoc, permanentDelete };
}
