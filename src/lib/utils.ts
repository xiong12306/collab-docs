/**
 * 通用工具函数
 */

/** API 统一响应格式 */
export interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

/**
 * 封装 fetch 请求，统一处理错误
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
      ...options,
    });

    const data = await res.json();
    return data as ApiResponse<T>;
  } catch {
    return {
      code: 500,
      data: null,
      message: '网络错误，请稍后重试',
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
