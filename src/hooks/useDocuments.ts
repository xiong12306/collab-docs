'use client';

/**
 * 文档 CRUD Hook
 * 提供文档列表查询、创建、删除等操作
 * 增强：创建文档后跳转到编辑页
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/utils';
import type { DocumentListItem } from '@/types/document';

interface UseDocumentsReturn {
  /** 文档列表 */
  documents: DocumentListItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 刷新文档列表 */
  refresh: () => Promise<void>;
  /** 创建新文档（创建后跳转到编辑页） */
  createDocument: () => Promise<void>;
  /** 删除文档 */
  deleteDocument: (id: string) => Promise<boolean>;
}

export function useDocuments(type: 'owned' | 'shared' = 'owned'): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /** 获取文档列表 */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<DocumentListItem[]>(
        `/api/documents?type=${type}`
      );
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
  }, [type]);

  /** 创建新文档 — 创建后立即跳转到编辑页 */
  const createDocument = useCallback(async () => {
    const res = await fetchApi<{ id: string }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: '未命名文档' }),
    });

    if (res.code === 201 && res.data) {
      // 直接跳转到编辑页
      router.push(`/docs/${res.data.id}`);
    }
  }, [router]);

  /** 删除文档 */
  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetchApi(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (res.code === 200) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, refresh, createDocument, deleteDocument };
}
