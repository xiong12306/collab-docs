'use client';

/**
 * 重置密码表单组件
 * 通过 URL 中的 token 参数验证身份后设置新密码
 * 使用 usePasswordReset hook 封装 API 调用
 */
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Form, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePasswordReset } from '@/hooks/usePasswordReset';

interface ResetPasswordFormValues {
  new_password: string;
  confirm_password: string;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetLoading, error, resetPassword, clearError } = usePasswordReset();

  const token = searchParams.get('token') || '';

  /** 提交重置密码请求 */
  const onFinish = async (values: ResetPasswordFormValues) => {
    // 前端二次校验密码一致
    if (values.new_password !== values.confirm_password) {
      clearError();
      // 使用临时方式提示（不污染 hook 的 error 状态）
      return;
    }

    if (!token) {
      return;
    }

    await resetPassword(token, values.new_password);
  };

  // 没有 token 时显示错误提示
  if (!token) {
    return (
      <div>
        <Alert
          type="error"
          message="重置链接无效"
          description="未检测到有效的重置令牌，请重新申请密码重置。"
          showIcon
          className="mb-4"
        />
        <div className="text-center">
          <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-blue-500 transition-colors">
            重新申请
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          className="mb-4"
          closable
          onClose={clearError}
        />
      )}

      <Form<ResetPasswordFormValues> onFinish={onFinish} layout="vertical" size="large">
        <Form.Item
          name="new_password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于 6 位' },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="新密码（至少 6 位）"
            style={{ borderRadius: '12px', padding: '10px 14px' }}
          />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          dependencies={['new_password']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('new_password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="确认新密码"
            style={{ borderRadius: '12px', padding: '10px 14px' }}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={resetLoading}
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
            重置密码
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
