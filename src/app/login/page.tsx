'use client';

/**
 * 登录/注册页面
 * 包含登录和注册两个 Tab
 */
import { Suspense, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Collab Docs</h1>
          <p className="text-gray-500 mt-2">多人实时协作文档</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-center font-medium transition-colors ${
              activeTab === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('login')}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-center font-medium transition-colors ${
              activeTab === 'register'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('register')}
          >
            注册
          </button>
        </div>

        {/* 表单区域 — LoginForm 使用 useSearchParams，需要 Suspense 包裹 */}
        <Suspense fallback={<div className="text-center py-4">加载中...</div>}>
          {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
        </Suspense>
      </div>
    </div>
  );
}
