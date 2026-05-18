'use client';

/**
 * 文档卡片组件
 * 显示文档标题、更新时间、成员数量和角色
 * P1 增强：标题搜索高亮
 */
import { Card, Tag, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  FileTextOutlined,
  MoreOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { formatDateTime, highlightText } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS, canManage } from '@/constants/roles';
import type { DocumentListItem } from '@/types/document';
import type { Role } from '@/types/collaboration';

interface DocCardProps {
  document: DocumentListItem;
  /** P1 新增：搜索关键词，用于标题高亮 */
  searchKeyword?: string;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function DocCard({ document, searchKeyword = '', onDelete, onShare }: DocCardProps) {
  const router = useRouter();

  /** 点击卡片进入编辑页 */
  const handleClick = () => {
    router.push(`/docs/${document.id}`);
  };

  /** 操作菜单项 */
  const menuItems: MenuProps['items'] = [];

  if (canManage(document.role)) {
    menuItems.push(
      {
        key: 'share',
        icon: <ShareAltOutlined />,
        label: '分享',
        onClick: () => {
          onShare?.(document.id);
        },
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '移入回收站',
        danger: true,
        onClick: () => {
          onDelete?.(document.id);
        },
      }
    );
  }

  return (
    <div className="doc-card-wrapper">
      <Card
        hoverable
        className="cursor-pointer"
        styles={{
          body: { padding: '16px' },
        }}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* 文档图标和标题（P1：搜索高亮） */}
            <div className="flex items-center gap-2 mb-2">
              <FileTextOutlined className="text-blue-500 text-lg flex-shrink-0" />
              <h3 className="text-base font-medium text-gray-900 truncate m-0">
                {highlightText(document.title, searchKeyword)}
              </h3>
            </div>

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="truncate">{formatDateTime(document.updated_at)}</span>
              <span className="flex items-center gap-1 flex-shrink-0">
                <TeamOutlined />
                {document.member_count}
              </span>
            </div>
          </div>

          {/* 角色标签和更多操作 */}
          <div className="flex items-center gap-2 ml-2">
            <Tag
              color={ROLE_COLORS[document.role as Role]}
              className="text-xs"
            >
              {ROLE_LABELS[document.role as Role] || document.role}
            </Tag>
            {menuItems.length > 0 && (
              <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                <MoreOutlined
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
