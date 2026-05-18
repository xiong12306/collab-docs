'use client';

/**
 * 忘记密码页面
 * 输入邮箱验证后直接跳转到重置密码页面（MVP 不发送邮件）
 */
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Collab Docs</h1>
          <p className="text-gray-500 mt-2">找回密码</p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
