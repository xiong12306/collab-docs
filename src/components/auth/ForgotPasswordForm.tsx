'use client';

/**
 * 忘记密码表单组件
 * 输入邮箱验证后，自动跳转到重置密码页面（MVP 方案）
 * 使用 usePasswordReset hook 封装 API 调用
 */
import { Button, Input, Form, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { usePasswordReset } from '@/hooks/usePasswordReset';

interface ForgotPasswordFormValues {
  email: string;
}

export function ForgotPasswordForm() {
  const { forgotLoading, requestReset } = usePasswordReset();

  /** 提交忘记密码请求 */
  const onFinish = async (values: ForgotPasswordFormValues) => {
    const success = await requestReset(values.email);
    if (!success) {
      // hook 内部已处理错误状态，此处仅做兜底
      message.error('验证失败，请重试');
    }
  };

  return (
    <Form<ForgotPasswordFormValues> onFinish={onFinish} layout="vertical" size="large">
      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '邮箱格式不正确' },
        ]}
      >
        <Input
          prefix={<MailOutlined className="text-gray-400" />}
          placeholder="注册时使用的邮箱"
          style={{ borderRadius: '12px', padding: '10px 14px' }}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={forgotLoading}
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
          验证邮箱
        </Button>
      </Form.Item>
    </Form>
  );
}
