'use client';

/**
 * 成员管理列表组件
 * 显示文档成员，支持邀请、修改权限、移除
 */
import { useState, useEffect, useCallback } from 'react';
import { List, Avatar, Tag, Button, Modal, Form, Select, Input, message, Popconfirm } from 'antd';
import { UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { fetchApi } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles';
import type { Role } from '@/types/collaboration';

interface MemberItem {
  user_id: string;
  name: string;
  email: string;
  role: string;
  invited_at: string;
}

interface MemberListProps {
  docId: string;
}

export function MemberList({ docId }: MemberListProps) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm] = Form.useForm();

  /** 获取成员列表 */
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<MemberItem[]>(`/api/documents/${docId}/members`);
      if (res.code === 200 && res.data) {
        setMembers(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /** 邀请成员 */
  const handleInvite = async (values: { email: string; role: string }) => {
    const res = await fetchApi(`/api/documents/${docId}/members`, {
      method: 'POST',
      body: JSON.stringify(values),
    });

    if (res.code === 201) {
      message.success('邀请成功');
      setInviteOpen(false);
      inviteForm.resetFields();
      fetchMembers();
    } else {
      message.error(res.message || '邀请失败');
    }
  };

  /** 修改成员权限 */
  const handleRoleChange = async (userId: string, newRole: string) => {
    const res = await fetchApi(`/api/documents/${docId}/members`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: userId, role: newRole }),
    });

    if (res.code === 200) {
      message.success('权限已更新');
      fetchMembers();
    } else {
      message.error(res.message || '更新失败');
    }
  };

  /** 移除成员 */
  const handleRemove = async (userId: string) => {
    const res = await fetchApi(`/api/documents/${docId}/members?user_id=${userId}`, {
      method: 'DELETE',
    });

    if (res.code === 200) {
      message.success('成员已移除');
      fetchMembers();
    } else {
      message.error(res.message || '移除失败');
    }
  };

  return (
    <div>
      {/* 邀请按钮 */}
      <Button
        type="dashed"
        icon={<UserAddOutlined />}
        onClick={() => setInviteOpen(true)}
        className="mb-4 w-full"
      >
        邀请成员
      </Button>

      {/* 成员列表 */}
      <List
        loading={loading}
        dataSource={members}
        renderItem={(item) => (
          <List.Item
            actions={[
              item.role !== 'owner' && (
                <Select
                  key="role"
                  value={item.role}
                  size="small"
                  style={{ width: 100 }}
                  onChange={(val) => handleRoleChange(item.user_id, val)}
                  options={[
                    { value: 'editor', label: '编辑者' },
                    { value: 'viewer', label: '查看者' },
                  ]}
                />
              ),
              item.role !== 'owner' && (
                <Popconfirm
                  key="remove"
                  title="确认移除此成员？"
                  onConfirm={() => handleRemove(item.user_id)}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              ),
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={<Avatar>{item.name[0]}</Avatar>}
              title={
                <span>
                  {item.name}
                  <Tag
                    color={ROLE_COLORS[item.role as Role]}
                    className="ml-2 text-xs"
                  >
                    {ROLE_LABELS[item.role as Role] || item.role}
                  </Tag>
                </span>
              }
              description={item.email}
            />
          </List.Item>
        )}
      />

      {/* 邀请成员弹窗 */}
      <Modal
        title="邀请成员"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
      >
        <Form form={inviteForm} onFinish={handleInvite} layout="vertical">
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="输入用户邮箱" />
          </Form.Item>
          <Form.Item
            name="role"
            label="权限"
            initialValue="editor"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select>
              <Select.Option value="editor">编辑者</Select.Option>
              <Select.Option value="viewer">查看者</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              邀请
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
