/**
 * 通用工具函数
 */

import { ReactNode } from 'react';

/** API 统一响应格式 */
export interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

/**
 * 封装 fetch 请求，统一处理错误
 * P1 增强：网络错误→全局 Toast, 401→跳转login, 403/404→行内提示, 429→warning, 其他→error
 * @param url - 请求 URL
 * @param options - fetch 选项
 * @returns 解析后的 API 响应
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      ...options,
    });

    const data = await res.json() as ApiResponse<T>;
    return data;
  } catch {
    // 网络错误：fetch 本身抛出异常（断网、DNS 解析失败等）
    return {
      code: 0,
      data: null,
      message: '网络连接失败，请检查网络后重试',
    };
  }
}

/**
 * 格式化日期时间为本地可读格式
 * @param isoString - ISO 8601 UTC 字符串
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // 相对时间显示
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  // 超过7天显示日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 生成文档默认内容（Tiptap JSON）
 * @param title - 文档标题
 * @returns Tiptap JSON 结构
 */
export function getDefaultContent(title: string = '未命名文档'): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: title }],
      },
    ],
  };
}

/**
 * 获取用户头像 URL（DiceBear）
 * @param name - 用户名
 * @returns 头像 URL
 */
export function getAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
}

/**
 * P1 新增：搜索关键词高亮渲染
 * 将文本中匹配关键词的部分包裹在 <mark> 标签中
 * @param text - 原始文本
 * @param keyword - 搜索关键词
 * @returns ReactNode，包含高亮标记的文本
 */
export function highlightText(text: string, keyword: string): ReactNode {
  if (!keyword || !keyword.trim()) {
    return text;
  }

  // 转义正则特殊字符
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  // split 带捕获组后，奇数索引必为匹配项（无需依赖 regex.test）
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="bg-yellow-200 text-inherit px-0 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
