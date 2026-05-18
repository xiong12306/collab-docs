'use client';

/**
 * 分享逻辑 Hook
 * 提供分享链接生成和验证功能
 */
import { useState, useCallback } from 'react';
import { fetchApi } from '@/lib/utils';
import type { ShareInfo, ShareVerification } from '@/types/document';
import type { Role } from '@/types/collaboration';

interface UseShareReturn {
  /** 分享链接信息 */
  shareInfo: ShareInfo | null;
  /** 分享验证结果 */
  verification: ShareVerification | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 生成分享链接 */
  generateShare: (role: Role.EDITOR | Role.VIEWER, expiresInHours?: number) => Promise<ShareInfo | null>;
  /** 验证分享链接 */
  verifyShare: (token: string) => Promise<ShareVerification | null>;
  /** 通过分享链接加入文档 */
  joinByShare: (docId: string, token: string) => Promise<boolean>;
}

export function useShare(docId?: string): UseShareReturn {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [verification, setVerification] = useState<ShareVerification | null>(null);
  const [loading, setLoading] = useState(false);

  /** 生成分享链接 */
  const generateShare = useCallback(
    async (role: Role.EDITOR | Role.VIEWER, expiresInHours?: number): Promise<ShareInfo | null> => {
      if (!docId) return null;
      setLoading(true);
      try {
        const body: Record<string, unknown> = { role };
        if (expiresInHours) {
          body.expires_in_hours = expiresInHours;
        }

        const res = await fetchApi<ShareInfo>(`/api/documents/${docId}/share`, {
          method: 'POST',
          body: JSON.stringify(body),
        });

        if (res.code === 201 && res.data) {
          setShareInfo(res.data);
          return res.data;
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [docId]
  );

  /** 验证分享链接 */
  const verifyShare = useCallback(async (token: string): Promise<ShareVerification | null> => {
    setLoading(true);
    try {
      const res = await fetchApi<ShareVerification>(`/api/share/${token}`);

      if (res.code === 200 && res.data) {
        setVerification(res.data);
        return res.data;
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** 通过分享链接加入文档 */
  const joinByShare = useCallback(
    async (targetDocId: string, token: string): Promise<boolean> => {
      setLoading(true);
      try {
        const res = await fetchApi(`/api/documents/${targetDocId}/share`, {
          method: 'POST',
          body: JSON.stringify({ action: 'join', token }),
        });

        return res.code === 200;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { shareInfo, verification, loading, generateShare, verifyShare, joinByShare };
}
