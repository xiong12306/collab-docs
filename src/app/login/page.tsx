'use client';

/**
 * 登录/注册页面
 * 左右分栏布局：左侧品牌展示区 + 右侧表单区
 */
import { Suspense, useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        {/* 装饰性几何元素 */}
        <div className="absolute inset-0">
          {/* 大圆 */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full bg-violet-500/8 blur-3xl" />
          {/* 网格线 */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          {/* 浮动方块 */}
          <div className="absolute top-16 right-24 w-16 h-16 border border-white/10 rounded-lg rotate-12 animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-32 right-40 w-10 h-10 border border-white/10 rounded-md -rotate-12 animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-16 w-20 h-20 border border-white/5 rounded-xl rotate-45 animate-pulse" style={{ animationDuration: '5s' }} />
        </div>

        {/* 品牌内容 */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">Collab Docs</span>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            让协作<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">更自然流畅</span>
          </h2>

          <p className="text-lg text-slate-400 leading-relaxed max-w-md mb-12">
            实时多人编辑，无缝协同创作。告别繁琐，拥抱高效的文档协作体验。
          </p>

          {/* 特性列表 */}
          <div className="space-y-4">
            {[
              { icon: '⚡', title: '实时同步', desc: '毫秒级延迟，所见即所得' },
              { icon: '👥', title: '多人协作', desc: '同时在线编辑，互不干扰' },
              { icon: '🔒', title: '安全可靠', desc: '数据加密传输，隐私无忧' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{item.icon}</span>
                <div>
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-sm text-slate-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
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

          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'login' ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-gray-500 mt-1.5">
              {activeTab === 'login' ? '登录以继续使用 Collab Docs' : '注册即可开始协作'}
            </p>
          </div>

          {/* Tab 切换 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('login')}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('register')}
            >
              注册
            </button>
          </div>

          {/* 表单区域 */}
          <Suspense fallback={<div className="text-center py-8 text-gray-400">加载中...</div>}>
            {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
