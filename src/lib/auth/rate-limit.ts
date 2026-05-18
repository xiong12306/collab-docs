/**
 * 轻量级 API 限流
 *
 * 基于 IP 的滑动窗口计数器。
 * MVP 阶段使用内存存储，适用于单实例部署。
 * 生产环境建议迁移到 Upstash Redis 等分布式存储。
 */

interface RateLimitEntry {
  timestamps: number[];
}

// 内存存储：IP → 请求时间戳列表
const store = new Map<string, RateLimitEntry>();

// 定期清理过期条目（每 60 秒）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60_000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 60_000);

export interface RateLimitConfig {
  /** 时间窗口（毫秒），默认 60_000 (1分钟) */
  windowMs?: number;
  /** 窗口内最大请求数，默认 5 */
  maxRequests?: number;
}

const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  windowMs: 60_000,
  maxRequests: 5,
};

/**
 * 检查是否超出限流
 * @returns { limited: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = {}
): { limited: boolean; remaining: number; resetAt: number } {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }

  // 移除窗口外的旧记录
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const limited = entry.timestamps.length >= maxRequests;
  if (!limited) {
    entry.timestamps.push(now);
  }

  const resetAt = entry.timestamps.length > 0 ? entry.timestamps[0] + windowMs : now + windowMs;

  return {
    limited,
    remaining: Math.max(0, maxRequests - entry.timestamps.length),
    resetAt,
  };
}

/**
 * 从请求中提取客户端 IP
 * Vercel 部署时通过 x-forwarded-for 获取真实 IP
 */
export function getClientIp(request: Request | import('next/server').NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
