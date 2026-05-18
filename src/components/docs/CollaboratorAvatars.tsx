'use client';

/**
 * 在线协作者头像列表组件
 * 从 Awareness getStates() 获取在线用户
 * DiceBear 头像 + 用户名，最多显示 5 个，超出显示 +N
 */
import { useState, useEffect } from 'react';
import { Avatar, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getUniqueOnlineUsers } from '@/lib/collaboration/awareness';
import type { CollabUser } from '@/types/collaboration';

/** 最多显示的头像数量 */
const MAX_VISIBLE = 5;

interface CollaboratorAvatarsProps {
  /** Awareness 实例（由 Tiptap Collaboration 扩展创建） */
  awareness: Map<number, Map<string, any>> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** 当前用户 ID（用于过滤自己） */
  currentUserId?: string;
}

export function CollaboratorAvatars({ awareness, currentUserId }: CollaboratorAvatarsProps) {
  const [users, setUsers] = useState<CollabUser[]>([]);

  /** 定期从 Awareness 中提取在线用户 */
  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const allUsers = getUniqueOnlineUsers(awareness);
      // 可选：过滤掉自己
      const otherUsers = currentUserId
        ? allUsers.filter((u) => u.id !== currentUserId)
        : allUsers;
      setUsers(otherUsers);
    };

    updateUsers();

    // 定期更新（因为 awareness 状态变化可能不触发 React 重渲染）
    const timer = setInterval(updateUsers, 2000);

    return () => clearInterval(timer);
  }, [awareness, currentUserId]);

  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const remainingCount = users.length - MAX_VISIBLE;

  return (
    <div className="flex items-center -space-x-2">
      {visibleUsers.map((user) => (
        <Tooltip key={user.id} title={user.name}>
          <Avatar
            size="small"
            style={{
              backgroundColor: user.color,
              border: '2px solid white',
              cursor: 'default',
            }}
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
            icon={<UserOutlined />}
          >
            {user.name[0]}
          </Avatar>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Avatar
          size="small"
          style={{
            backgroundColor: '#f0f0f0',
            color: '#666',
            border: '2px solid white',
            fontSize: '10px',
            cursor: 'default',
          }}
        >
          +{remainingCount}
        </Avatar>
      )}
    </div>
  );
}
