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
import type { AuthUser } from '@/types/auth';

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
        <Input prefix={<MailOutlined />} placeholder="邮箱" />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          登录
        </Button>
      </Form.Item>

      {/* P1 新增：忘记密码链接 */}
      <div className="text-center">
        <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 text-sm">
          忘记密码？
        </Link>
      </div>
    </Form>
  );
}
