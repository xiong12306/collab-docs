'use client';

/**
 * 重置密码页面
 * 通过 URL 中的 token 参数验证身份后设置新密码
 */
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-violet-500/8 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Collab Docs</span>
            </div>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            设置<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">新密码</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            请设置一个安全的新密码，建议包含字母、数字和特殊字符。
          </p>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Collab Docs</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">重置密码</h1>
            <p className="text-gray-500 mt-1.5">请输入你的新密码</p>
          </div>

          <Suspense fallback={<div className="text-center py-8 text-gray-400">加载中...</div>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
              返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
