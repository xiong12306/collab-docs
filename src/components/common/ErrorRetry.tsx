'use client';

/**
 * 行内错误提示 + 重试按钮组件
 * 用于 403/404 等行内错误场景
 */
import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ErrorRetryProps {
  /** 错误标题 */
  title?: string;
  /** 错误描述 */
  subTitle?: string;
  /** 错误状态码（用于 Result 组件图标） */
  status?: 403 | 404 | 500 | 'error' | 'info' | 'success' | 'warning';
  /** 重试回调 */
  onRetry?: () => void;
  /** 重试按钮文本 */
  retryText?: string;
}

/**
 * 行内错误提示 + 重试按钮
 * 替代全局 message.error，提供行内错误展示和重试操作
 */
export function ErrorRetry({
  title = '加载失败',
  subTitle = '请稍后重试',
  status = 'error',
  onRetry,
  retryText = '重试',
}: ErrorRetryProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        extra={
          onRetry ? (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry}
            >
              {retryText}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
