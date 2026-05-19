'use client';

/**
 * 文档 CRUD Hook
 * 提供文档列表查询、创建、删除等操作
 * P1 增强：支持搜索/排序参数，排序持久化到 localStorage
 * 实时更新增强：集成 Supabase Broadcast Channel 接收其他用户的文档变更通知
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/utils';
import { useDocumentRealtime, type DocChangeEvent } from './useDocumentRealtime';
import { useAuth } from './useAuth';
import type { DocumentListItem, SortOrder } from '@/types/document';

/** localStorage 排序持久化 key */
const SORT_STORAGE_KEY = 'collab-docs-sort-order';

/** 获取持久化的排序方式 */
function getStoredSortOrder(): SortOrder {
  if (typeof window === 'undefined') return 'updated_desc';
  return (localStorage.getItem(SORT_STORAGE_KEY) as SortOrder) || 'updated_desc';
}

/** 保存排序方式到 localStorage */
function setStoredSortOrder(order: SortOrder): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SORT_STORAGE_KEY, order);
}

interface UseDocumentsReturn {
  /** 文档列表 */
  documents: DocumentListItem[];
  /** 是否正在加载 */
  loading: boolean;
  /** 刷新文档列表 */
  refresh: (params?: { search?: string; sort?: SortOrder }) => Promise<void>;
  /** 创建新文档（创建后跳转到编辑页） */
  createDocument: () => Promise<void>;
  /** 删除文档 */
  deleteDocument: (id: string) => Promise<boolean>;
  /** 当前排序方式 */
  sortOrder: SortOrder;
  /** 设置排序方式 */
  setSortOrder: (order: SortOrder) => void;
  /** 当前搜索关键词 */
  searchKeyword: string;
  /** 设置搜索关键词 */
  setSearchKeyword: (keyword: string) => void;
}

export function useDocuments(type: 'owned' | 'shared' = 'owned'): UseDocumentsReturn {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrderState] = useState<SortOrder>(getStoredSortOrder);
  const [searchKeyword, setSearchKeyword] = useState('');
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 实时更新防抖 ref
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 获取当前用户信息，用于广播变更时附带用户 ID
  const { user } = useAuth();

  /** 设置排序方式并持久化 */
  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order);
    setStoredSortOrder(order);
  }, []);

  /** 获取文档列表 */
  const refresh = useCallback(async (params?: { search?: string; sort?: SortOrder }) => {
    setLoading(true);
    try {
      const search = params?.search ?? searchKeyword;
      const sort = params?.sort ?? sortOrder;
      const queryParams = new URLSearchParams({ type });
      if (search.trim()) queryParams.set('search', search.trim());
      queryParams.set('sort', sort);

      const res = await fetchApi<DocumentListItem[]>(
        `/api/documents?${queryParams.toString()}`
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
  }, [type, searchKeyword, sortOrder]);

  // 集成实时更新：接收到变更通知时防抖 300ms 后刷新列表
  const { broadcastChange } = useDocumentRealtime((_payload) => {
    // 收到变更通知时，使用 300ms 防抖避免频繁刷新
    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current);
    }
    realtimeDebounceRef.current = setTimeout(() => {
      refresh({ search: searchKeyword, sort: sortOrder });
    }, 300);
  });

  /** 创建新文档 — 创建后立即跳转到编辑页 */
  const createDocument = useCallback(async () => {
    const res = await fetchApi<{ id: string }>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ title: '未命名文档' }),
    });

    if (res.code === 201 && res.data) {
      // 广播文档创建通知
      broadcastChange('created', res.data.id, user?.id || '');
      // 直接跳转到编辑页
      router.push(`/docs/${res.data.id}`);
    }
  }, [router, broadcastChange, user]);

  /** 删除文档 */
  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await fetchApi(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (res.code === 200) {
        // 广播文档删除通知
        broadcastChange('deleted', id, user?.id || '');
        await refresh();
        return true;
      }
      return false;
    },
    [refresh, broadcastChange, user]
  );

  // 搜索关键词变化时防抖 300ms 后重新查询
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      refresh({ search: searchKeyword, sort: sortOrder });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  // 排序方式变化时立即重新查询
  useEffect(() => {
    refresh({ search: searchKeyword, sort: sortOrder });
  }, [sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // 首次加载
  useEffect(() => {
    refresh();
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  // 组件卸载时清理实时更新防抖定时器
  useEffect(() => {
    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
    };
  }, []);

  return {
    documents,
    loading,
    refresh,
    createDocument,
    deleteDocument,
    sortOrder,
    setSortOrder,
    searchKeyword,
    setSearchKeyword,
  };
}
