'use client';

/**
 * 登录表单组件
 * P1 增强：底部增加「忘记密码？」链接
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Form, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  /** 提交登录 */
  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (data.code === 200 && data.data) {
        message.success('登录成功');
        // 跳转到原始页面或文档列表
        const redirect = searchParams.get('redirect') || '/docs';
        router.push(redirect);
      } else {
        message.error(data.message || '登录失败');
      }
    } catch {
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form<LoginFormValues> onFinish={onFinish} layout="vertical" size="large">
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
          className="rounded-xl"
          style={{ borderRadius: '12px', padding: '10px 14px' }}
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="密码"
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
          登录
        </Button>
      </Form.Item>

      {/* P1 新增：忘记密码链接 */}
      <div className="text-center">
        <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
          忘记密码？
        </Link>
      </div>
    </Form>
  );
}
