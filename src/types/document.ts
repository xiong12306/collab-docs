/**
 * 文档相关类型定义
 */

import { Role } from './collaboration';

/** 文档 */
export interface Document {
  id: string;
  title: string;
  content: Record<string, unknown>; // Tiptap JSON
  owner_id: string;
  created_at: string;
  updated_at: string;
}

/** 文档成员（含关联用户信息） */
export interface DocMember {
  doc_id: string;
  user_id: string;
  role: Role;
  invited_at: string;
  // join 后补充的用户信息
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
}

/** 分享链接 */
export interface DocShare {
  id: string;
  doc_id: string;
  token: string;
  role: Role;
  created_by: string;
  expires_at: string | null;
  used: boolean;
  created_at: string;
}

/** 创建文档请求 */
export interface CreateDocumentRequest {
  title?: string;
}

/** 更新文档请求 */
export interface UpdateDocumentRequest {
  title?: string;
  content?: Record<string, unknown>;
}

/** 邀请成员请求 */
export interface InviteMemberRequest {
  email: string;
  role: Role.EDITOR | Role.VIEWER;
}

/** 修改成员权限请求 */
export interface UpdateMemberRoleRequest {
  user_id: string;
  role: Role;
}

/** 生成分享链接请求 */
export interface ShareRequest {
  role: Role.EDITOR | Role.VIEWER;
  expires_in_hours?: number; // null = 永不过期
}

/** 通过分享链接加入请求 */
export interface JoinByShareRequest {
  token: string;
}

/** 文档列表项（含聚合信息） */
export interface DocumentListItem {
  id: string;
  title: string;
  updated_at: string;
  owner_id: string;
  member_count: number;
  role: string;
}

/** 文档详情（含当前用户角色） */
export interface DocumentDetail extends Document {
  my_role: string;
}

/** 分享链接信息 */
export interface ShareInfo {
  token: string;
  share_url: string;
  role: string;
  expires_at: string | null;
}

/** 分享链接验证结果 */
export interface ShareVerification {
  doc_id: string;
  title: string;
  role: string;
  expires_at: string | null;
  is_expired: boolean;
  is_used: boolean;
}
