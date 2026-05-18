'use client';

/**
 * 密码重置流程 Hook
 * 封装忘记密码和重置密码的 API 调用
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';

interface UsePasswordResetReturn {
  /** 忘记密码请求 loading */
  forgotLoading: boolean;
  /** 重置密码请求 loading */
  resetLoading: boolean;
  /** 错误信息 */
  error: string;
  /** 请求密码重置（验证邮箱） */
  requestReset: (email: string) => Promise<boolean>;
  /** 执行密码重置 */
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
}

export function usePasswordReset(): UsePasswordResetReturn {
  const router = useRouter();
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');

  /** 清除错误 */
  const clearError = () => setError('');

  /** 请求密码重置（验证邮箱） */
  const requestReset = async (email: string): Promise<boolean> => {
    setForgotLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data) {
        message.success('邮箱验证成功');
        // MVP：拿到 token 后跳转到重置密码页
        const token = data.data.token;
        setTimeout(() => {
          router.push(`/reset-password?token=${encodeURIComponent(token)}`);
        }, 800);
        return true;
      } else {
        setError(data.message || '验证失败');
        return false;
      }
    } catch {
      setError('网络错误，请稍后重试');
      return false;
    } finally {
      setForgotLoading(false);
    }
  };

  /** 执行密码重置 */
  const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
    setResetLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await res.json();

      if (data.code === 200) {
        message.success('密码重置成功，请使用新密码登录');
        setTimeout(() => {
          router.push('/login');
        }, 1000);
        return true;
      } else {
        setError(data.message || '重置失败');
        return false;
      }
    } catch {
      setError('网络错误，请稍后重试');
      return false;
    } finally {
      setResetLoading(false);
    }
  };

  return {
    forgotLoading,
    resetLoading,
    error,
    requestReset,
    resetPassword,
    clearError,
  };
}
