'use client';

/**
 * 注册表单组件
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Form, message } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';

interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /** 提交注册 */
  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (data.code === 201 && data.data) {
        message.success('注册成功');
        router.push('/docs');
      } else {
        message.error(data.message || '注册失败');
      }
    } catch {
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form<RegisterFormValues> onFinish={onFinish} layout="vertical" size="large">
      <Form.Item
        name="name"
        rules={[{ required: true, message: '请输入姓名' }]}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder="姓名"
          style={{ borderRadius: '12px', padding: '10px 14px' }}
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '邮箱格式不正确' },
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder="邮箱"
          style={{ borderRadius: '12px', padding: '10px 14px' }}
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6位' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="密码（至少6位）"
          style={{ borderRadius: '12px', padding: '10px 14px' }}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          style={{
            borderRadius: '12px',
            height: '48px',
            fontWeight: 600,
            fontSize: '15px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
          }}
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  );
}
