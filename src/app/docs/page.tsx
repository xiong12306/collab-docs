'use client';

/**
 * 文档列表页
 * 包含我的文档 / 共享给我 两个 Tab
 */
import { useState } from 'react';
import { Button, Empty, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/layout/Header';
import { DocList } from '@/components/docs/DocList';
import { useDocuments } from '@/hooks/useDocuments';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');
  const { documents, loading, createDocument } = useDocuments(activeTab);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* 页面标题和操作 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">我的文档</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={createDocument}
            >
              新建文档
            </Button>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'owned'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('owned')}
            >
              我的文档
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'shared'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('shared')}
            >
              共享给我
            </button>
          </div>

          {/* 文档列表 */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Spin size="large" />
            </div>
          ) : documents.length === 0 ? (
            <Empty
              description={activeTab === 'owned' ? '还没有文档，点击新建开始' : '没有共享文档'}
              className="py-20"
            />
          ) : (
            <DocList documents={documents} />
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
