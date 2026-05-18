/**
 * Supabase 服务端客户端
 * 用于 API Routes 和 Server Components
 * 使用 service_role key 绕过 RLS（API Routes 自行做权限校验）
 *
 * Vercel Serverless 环境下每次请求可能是独立实例，
 * 不缓存客户端，每次都从环境变量重新创建。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 创建 Supabase 服务端客户端
 * 使用 SUPABASE_SERVICE_ROLE_KEY 绕过 RLS 策略
 * API Routes 中自行实现权限校验逻辑
 *
 * 注意：不使用 Database 泛型，因为自定义类型可能与 Supabase 内部类型推断不兼容
 * API Routes 中对查询结果使用类型断言确保类型安全
 */
export function getServerClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `缺少 Supabase 环境变量：NEXT_PUBLIC_SUPABASE_URL=${!!supabaseUrl}, SUPABASE_SERVICE_ROLE_KEY=${!!serviceRoleKey}`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
