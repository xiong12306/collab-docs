'use client';

/**
 * 分享弹窗组件
 * 生成分享链接、设置角色和过期时间
 */
import { useState } from 'react';
import { Modal, Form, Select, InputNumber, Button, message, Tabs, Tag } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import { useShare } from '@/hooks/useShare';
import { MemberList } from './MemberList';
import { Role } from '@/types/collaboration';

interface ShareModalProps {
  docId: string;
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ docId, open, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState('share');
  const { shareInfo, generateShare, loading } = useShare(docId);

  /** 复制分享链接 */
  const handleCopyLink = () => {
    if (shareInfo?.share_url) {
      const fullUrl = `${window.location.origin}${shareInfo.share_url}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        message.success('链接已复制');
      });
    }
  };

  /** 生成分享链接 */
  const handleGenerateShare = async (values: { role: string; expires_in_hours?: number }) => {
    const result = await generateShare(values.role as Role.EDITOR | Role.VIEWER, values.expires_in_hours);
    if (!result) {
      message.error('生成分享链接失败');
    }
  };

  return (
    <Modal
      title="分享与成员管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'share',
            label: '分享链接',
            children: (
              <div>
                {/* 生成分享链接表单 */}
                <Form
                  layout="inline"
                  onFinish={handleGenerateShare}
                  className="mb-4"
                >
                  <Form.Item name="role" initialValue="editor">
                    <Select style={{ width: 120 }}>
                      <Select.Option value="editor">可编辑</Select.Option>
                      <Select.Option value="viewer">可查看</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="expires_in_hours">
                    <InputNumber
                      placeholder="过期小时数"
                      min={1}
                      style={{ width: 140 }}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      生成链接
                    </Button>
                  </Form.Item>
                </Form>

                {/* 已生成的分享链接 */}
                {shareInfo && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkOutlined />
                      <span className="text-sm text-gray-600">分享链接</span>
                      <Tag color={shareInfo.role === 'editor' ? 'blue' : 'default'}>
                        {shareInfo.role === 'editor' ? '可编辑' : '可查看'}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white border rounded text-sm overflow-hidden text-ellipsis">
                        {shareInfo.share_url}
                      </code>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={handleCopyLink}
                      >
                        复制
                      </Button>
                    </div>
                    {shareInfo.expires_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        过期时间：{new Date(shareInfo.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'members',
            label: '成员管理',
            children: <MemberList docId={docId} />,
          },
        ]}
      />
    </Modal>
  );
}
