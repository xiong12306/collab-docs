/**
 * Supabase 浏览器端客户端
 * 用于客户端组件中的数据查询和 Realtime 订阅
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Supabase 浏览器客户端单例 */
let browserClient: SupabaseClient | null = null;

/**
 * 创建或复用 Supabase 浏览器客户端
 * 使用 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function createBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '缺少 Supabase 环境变量：NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
