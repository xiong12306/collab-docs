'use client';

/**
 * 路由鉴权守卫组件
 * 包裹需要登录的页面，未登录时重定向到 /login
 * 完善：loading 闪烁消除、redirect 参数保持
 */
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // 仅在加载完成且未登录时执行重定向
    if (!loading && !user && !hasChecked.current) {
      hasChecked.current = true;
      setRedirecting(true);

      // 构建 redirect 参数，保留当前路径
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [loading, user, router, pathname]);

  // 加载完成且已登录时标记检查完成
  useEffect(() => {
    if (!loading && user) {
      hasChecked.current = true;
    }
  }, [loading, user]);

  // 正在加载用户信息或正在重定向时显示 loading
  if (loading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-3 text-gray-400 text-sm">
            {redirecting ? '正在跳转登录页...' : '加载中...'}
          </p>
        </div>
      </div>
    );
  }

  // 未登录不渲染内容
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
