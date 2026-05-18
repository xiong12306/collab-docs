'use client';

/**
 * 顶部导航栏组件
 * 显示 Logo、用户信息和登出按钮
 */
import { Avatar, Dropdown, Button } from 'antd';
import { LogoutOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  /** 登出 */
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  /** 用户菜单项 */
  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: user?.name || '用户',
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/docs')}
        >
          <FileTextOutlined className="text-blue-600 text-xl" />
          <span className="text-lg font-bold text-gray-900">Collab Docs</span>
        </div>

        {/* 用户信息 */}
        <div className="flex items-center gap-3">
          {user && (
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                <Avatar
                  size="small"
                  src={user.avatar_url}
                  icon={!user.avatar_url && <UserOutlined />}
                />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
            </Dropdown>
          )}
        </div>
      </div>
    </header>
  );
}
