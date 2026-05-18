'use client';

/**
 * 鉴权状态 Hook
 * 获取当前登录用户信息，自动处理加载状态
 */
import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types/auth';

interface UseAuthReturn {
  /** 当前用户信息 */
  user: AuthUser | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 手动刷新用户信息 */
  refresh: () => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** 获取当前用户信息 */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.code === 200 && data.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 登出 */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  // 初始化时获取用户信息
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading, refresh, logout };
}
