'use client';

/**
 * Loading Skeleton 通用组件
 * 支持 list / detail / editor 三种模式
 */
import { Skeleton } from 'antd';

interface LoadingSkeletonProps {
  /** 骨架屏类型：list-列表、detail-详情页、editor-编辑器 */
  type?: 'list' | 'detail' | 'editor';
}

/** 列表模式骨架：3 行卡片 */
function ListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <Skeleton active paragraph={{ rows: 2, width: ['60%', '40%'] }} title={{ width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

/** 详情模式骨架：标题 + 内容区域 */
function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto w-full px-8 py-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <Skeleton active paragraph={{ rows: 6, width: ['90%', '75%', '85%', '60%', '95%', '45%'] }} title={{ width: '50%' }} />
      </div>
    </div>
  );
}

/** 编辑器模式骨架：工具栏 + 编辑区 */
function EditorSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶栏骨架 */}
      <div className="bg-white border-b border-gray-200 h-14 flex items-center px-4">
        <Skeleton.Input active style={{ width: 200, height: 24 }} />
      </div>
      {/* 工具栏骨架 */}
      <div className="bg-white border-b border-gray-200 h-10 flex items-center px-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton.Avatar key={i} active shape="square" size={28} />
        ))}
      </div>
      {/* 编辑区骨架 */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <Skeleton active paragraph={{ rows: 7, width: ['40%', '90%', '75%', '85%', '60%', '95%', '45%'] }} title={false} />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading Skeleton 通用组件
 * 根据类型渲染不同骨架屏样式
 */
export function LoadingSkeleton({ type = 'list' }: LoadingSkeletonProps) {
  switch (type) {
    case 'list':
      return <ListSkeleton />;
    case 'detail':
      return <DetailSkeleton />;
    case 'editor':
      return <EditorSkeleton />;
    default:
      return <ListSkeleton />;
  }
}
