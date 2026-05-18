/**
 * 权限角色常量
 */
import { Role } from '@/types/collaboration';

/** 角色显示名称映射 */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.OWNER]: '拥有者',
  [Role.EDITOR]: '编辑者',
  [Role.VIEWER]: '查看者',
};

/** 角色颜色映射 */
export const ROLE_COLORS: Record<Role, string> = {
  [Role.OWNER]: '#7C3AED',
  [Role.EDITOR]: '#2563EB',
  [Role.VIEWER]: '#6B7280',
};

/**
 * 判断角色是否可以编辑文档内容
 * owner 和 editor 可编辑
 */
export function canEdit(role: Role | string): boolean {
  return role === Role.OWNER || role === Role.EDITOR;
}

/**
 * 判断角色是否可以管理文档（删除、邀请、分享）
 * 仅 owner 可管理
 */
export function canManage(role: Role | string): boolean {
  return role === Role.OWNER;
}
