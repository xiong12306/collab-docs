/**
 * 编辑器默认配置常量
 */

/** Tiptap 编辑器占位符文本 */
export const EDITOR_PLACEHOLDER = '开始输入内容...';

/** Yjs 更新持久化间隔（毫秒） */
export const SYNC_INTERVAL = 2000;

/** 文档列表每页数量 */
export const DOCS_PAGE_SIZE = 20;

/** 文档标题最大长度 */
export const MAX_TITLE_LENGTH = 100;

/** 新文档默认标题 */
export const DEFAULT_DOC_TITLE = '未命名文档';

/** Supabase Broadcast 频道前缀 */
export const CHANNEL_PREFIX = 'doc:';

/** Broadcast 事件类型 */
export const BROADCAST_EVENTS = {
  SYNC_UPDATE: 'sync-update',
  AWARENESS_UPDATE: 'awareness-update',
} as const;
