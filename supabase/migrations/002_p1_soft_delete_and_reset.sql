-- P1 增量：软删除 + 密码重置
-- 日期：2025-07-14

-- ==================== documents 表 — 新增软删除字段 ====================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 索引：回收站查询优化（仅索引已删除的文档）
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at) WHERE deleted_at IS NOT NULL;

-- 索引：列表查询优化（未删除 + 按更新时间排序）
CREATE INDEX IF NOT EXISTS idx_documents_active_updated ON public.documents(owner_id, updated_at DESC) WHERE deleted_at IS NULL;

-- ==================== password_reset_tokens 表 — 新增 ====================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,  -- SHA-256 哈希后的 token，不存原文
  expires_at  TIMESTAMPTZ NOT NULL,  -- 过期时间
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 仅服务端操作，不开放客户端直接访问
CREATE POLICY "password_reset_tokens_no_access" ON public.password_reset_tokens
  FOR ALL USING (false) WITH CHECK (false);
