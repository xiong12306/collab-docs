'use client';

/**
 * 重置密码页面
 * 通过 URL 中的 token 参数验证身份后设置新密码
 */
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Collab Docs</h1>
          <p className="text-gray-500 mt-2">重置密码</p>
        </div>

        <Suspense fallback={<div className="text-center py-4">加载中...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
