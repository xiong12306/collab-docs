'use client';

/**
 * 文档列表页
 * 包含我的文档 / 共享给我 两个 Tab
 * P1 增强：集成搜索框、排序切换、Loading Skeleton 替换 Spin
 */
import { useState } from 'react';
import { Button, Empty, Input, Select } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/layout/Header';
import { DocList } from '@/components/docs/DocList';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useDocuments } from '@/hooks/useDocuments';
import type { SortOrder } from '@/types/document';

/** 排序选项 */
const sortOptions = [
  { value: 'updated_desc', label: '最近更新' },
  { value: 'updated_asc', label: '最早更新' },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');
  const {
    documents,
    loading,
    createDocument,
    sortOrder,
    setSortOrder,
    searchKeyword,
    setSearchKeyword,
  } = useDocuments(activeTab);

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

          {/* Tab 切换 + 搜索框 + 排序 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* 左侧：Tab 切换 */}
            <div className="flex border-b border-gray-200">
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

            {/* 右侧：搜索框 + 排序 */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="搜索文档..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{ width: 220 }}
              />
              <Select
                value={sortOrder}
                onChange={(value: SortOrder) => setSortOrder(value)}
                options={sortOptions}
                style={{ width: 130 }}
              />
            </div>
          </div>

          {/* 文档列表 */}
          {loading ? (
            <LoadingSkeleton type="list" />
          ) : documents.length === 0 ? (
            <Empty
              description={
                searchKeyword
                  ? `没有找到包含"${searchKeyword}"的文档`
                  : activeTab === 'owned'
                  ? '还没有文档，点击新建开始'
                  : '没有共享文档'
              }
              className="py-20"
            />
          ) : (
            <DocList documents={documents} searchKeyword={searchKeyword} />
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
