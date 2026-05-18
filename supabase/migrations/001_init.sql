-- ============================================================
-- collab-docs 数据库初始化迁移
-- 数据库：Supabase PostgreSQL
-- ============================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);

-- 2. 文档表
CREATE TABLE IF NOT EXISTS public.documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT '未命名文档',
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX idx_documents_updated_at ON public.documents(updated_at DESC);

-- 3. 文档成员表（权限控制）
CREATE TABLE IF NOT EXISTS public.doc_members (
  doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doc_id, user_id)
);

CREATE INDEX idx_doc_members_user_id ON public.doc_members(user_id);
CREATE INDEX idx_doc_members_doc_id ON public.doc_members(doc_id);

-- 4. Yjs 更新持久化表（二进制增量更新）
CREATE TABLE IF NOT EXISTS public.yjs_updates (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  update      TEXT NOT NULL,  -- base64 编码的 Yjs 更新二进制
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yjs_updates_doc_id ON public.yjs_updates(doc_id);

-- 5. 分享链接表
CREATE TABLE IF NOT EXISTS public.doc_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('editor', 'viewer')) DEFAULT 'editor',
  created_by  UUID NOT NULL REFERENCES public.users(id),
  expires_at  TIMESTAMPTZ,          -- NULL 表示永不过期
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_shares_token ON public.doc_shares(token);
CREATE INDEX idx_doc_shares_doc_id ON public.doc_shares(doc_id);

-- 6. 文档快照表（P1 历史版本，MVP 阶段预留）
CREATE TABLE IF NOT EXISTS public.doc_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_snapshots_doc_id ON public.doc_snapshots(doc_id);

-- ============================================================
-- RLS（Row Level Security）策略
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yjs_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_snapshots ENABLE ROW LEVEL SECURITY;

-- users：用户只能读自己的记录
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.jwt() ->> 'sub' = id::text);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.jwt() ->> 'sub' = id::text);

-- documents：owner 或 doc_members 中有记录的用户可读
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    owner_id::text = auth.jwt() ->> 'sub'
    OR EXISTS (
      SELECT 1 FROM public.doc_members
      WHERE doc_id = documents.id
      AND user_id::text = auth.jwt() ->> 'sub'
    )
  );

-- documents：仅 owner 可写
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (owner_id::text = auth.jwt() ->> 'sub');

CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (owner_id::text = auth.jwt() ->> 'sub');

CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (owner_id::text = auth.jwt() ->> 'sub');

-- doc_members：有权限的用户可查看
CREATE POLICY "doc_members_select" ON public.doc_members
  FOR SELECT USING (
    doc_id IN (
      SELECT id FROM public.documents
      WHERE owner_id::text = auth.jwt() ->> 'sub'
      OR EXISTS (
        SELECT 1 FROM public.doc_members dm
        WHERE dm.doc_id = documents.id
        AND dm.user_id::text = auth.jwt() ->> 'sub'
      )
    )
  );

-- doc_members：仅 owner 可管理成员
CREATE POLICY "doc_members_insert" ON public.doc_members
  FOR INSERT WITH CHECK (
    doc_id IN (SELECT id FROM public.documents WHERE owner_id::text = auth.jwt() ->> 'sub')
  );

CREATE POLICY "doc_members_delete" ON public.doc_members
  FOR DELETE USING (
    doc_id IN (SELECT id FROM public.documents WHERE owner_id::text = auth.jwt() ->> 'sub')
  );

-- yjs_updates：有文档访问权限的用户可读写
CREATE POLICY "yjs_updates_select" ON public.yjs_updates
  FOR SELECT USING (
    doc_id IN (
      SELECT id FROM public.documents
      WHERE owner_id::text = auth.jwt() ->> 'sub'
      OR EXISTS (
        SELECT 1 FROM public.doc_members
        WHERE doc_id = documents.id AND user_id::text = auth.jwt() ->> 'sub'
      )
    )
  );

CREATE POLICY "yjs_updates_insert" ON public.yjs_updates
  FOR INSERT WITH CHECK (
    doc_id IN (
      SELECT id FROM public.documents
      WHERE owner_id::text = auth.jwt() ->> 'sub'
      OR EXISTS (
        SELECT 1 FROM public.doc_members
        WHERE doc_id = documents.id
        AND user_id::text = auth.jwt() ->> 'sub'
        AND role IN ('owner', 'editor')
      )
    )
  );

-- doc_shares：owner 可读写，受邀者可通过 token 验证
CREATE POLICY "doc_shares_select" ON public.doc_shares
  FOR SELECT USING (
    doc_id IN (SELECT id FROM public.documents WHERE owner_id::text = auth.jwt() ->> 'sub')
  );

CREATE POLICY "doc_shares_insert" ON public.doc_shares
  FOR INSERT WITH CHECK (created_by::text = auth.jwt() ->> 'sub');

-- doc_snapshots：有文档访问权限的用户可读
CREATE POLICY "doc_snapshots_select" ON public.doc_snapshots
  FOR SELECT USING (
    doc_id IN (
      SELECT id FROM public.documents
      WHERE owner_id::text = auth.jwt() ->> 'sub'
      OR EXISTS (
        SELECT 1 FROM public.doc_members
        WHERE doc_id = documents.id AND user_id::text = auth.jwt() ->> 'sub'
      )
    )
  );

-- ============================================================
-- 触发器：自动更新 updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
