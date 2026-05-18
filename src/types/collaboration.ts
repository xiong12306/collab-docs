/**
 * 协同相关类型定义
 */

/** 权限角色枚举 */
export enum Role {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

/** 协作用户信息 */
export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    index: number;
    length: number;
  };
}

/** Awareness 光标状态 */
export interface AwarenessState {
  user: CollabUser;
  clientId: number;
}

/** Yjs 同步消息 */
export interface YjsSyncMessage {
  type: 'sync' | 'update';
  doc_id: string;
  update: string; // base64 编码
  client_id: number;
}

/** Awareness 消息 */
export interface AwarenessMessage {
  type: 'awareness';
  doc_id: string;
  states: AwarenessState[];
}
