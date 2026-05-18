'use client';

/**
 * 左侧侧边栏组件
 * 文档编辑页面的侧边栏，显示文档列表导航
 */
import { Menu } from 'antd';
import {
  FileTextOutlined,
  PlusOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';

interface SidebarProps {
  /** 当前选中的文档 ID */
  activeDocId?: string;
  /** 文档列表 */
  documents?: Array<{ id: string; title: string }>;
}

export function Sidebar({ activeDocId, documents = [] }: SidebarProps) {
  const router = useRouter();

  /** 菜单项 */
  const menuItems: MenuProps['items'] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '文档列表',
      onClick: () => router.push('/docs'),
    },
    {
      type: 'divider',
    },
    {
      key: 'new',
      icon: <PlusOutlined />,
      label: '新建文档',
    },
    {
      type: 'divider',
    },
    ...documents.map((doc) => ({
      key: doc.id,
      icon: <FileTextOutlined />,
      label: doc.title || '未命名文档',
      onClick: () => router.push(`/docs/${doc.id}`),
    })),
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          文档
        </h2>
      </div>
      <Menu
        mode="inline"
        selectedKeys={activeDocId ? [activeDocId] : ['home']}
        items={menuItems}
        className="border-none"
      />
    </aside>
  );
}
