'use client';

/**
 * 回收站文档卡片组件
 * 显示文档标题、删除时间、剩余天数
 * 支持恢复和永久删除操作
 */
import { Card, Button, Tag } from 'antd';
import {
  FileTextOutlined,
  UndoOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '@/lib/utils';
import type { TrashDocListItem } from '@/types/document';

interface TrashCardProps {
  document: TrashDocListItem;
  onRestore: (id: string) => Promise<boolean>;
  onPermanentDelete: (id: string, title: string) => void;
}

export function TrashCard({ document, onRestore, onPermanentDelete }: TrashCardProps) {
  return (
    <Card
      className="hover:shadow-sm transition-shadow"
      styles={{ body: { padding: '16px' } }}
    >
      <div className="flex items-center justify-between">
        {/* 左侧：文档信息 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileTextOutlined className="text-gray-400 text-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-gray-900 truncate m-0">
              {document.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span>删除于 {formatDateTime(document.deleted_at)}</span>
              <Tag
                color={document.remaining_days <= 7 ? 'red' : 'default'}
                icon={<ClockCircleOutlined />}
                className="text-xs"
              >
                剩余 {document.remaining_days} 天
              </Tag>
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            type="link"
            icon={<UndoOutlined />}
            onClick={() => onRestore(document.id)}
          >
            恢复
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onPermanentDelete(document.id, document.title)}
          >
            永久删除
          </Button>
        </div>
      </div>
    </Card>
  );
}
