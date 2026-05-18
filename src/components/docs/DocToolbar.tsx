'use client';

/**
 * 文档工具栏组件
 * 提供 H1-H3、粗体/斜体、有序/无序列表、引用、代码块等格式操作
 * viewer 权限下按钮禁用
 */
import { Button, Tooltip, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  AlignLeftOutlined,
} from '@ant-design/icons';
import { useCurrentEditor } from '@tiptap/react';

interface DocToolbarProps {
  /** 是否只读模式（viewer 时禁用所有按钮） */
  readOnly?: boolean;
}

/** 工具栏按钮样式 */
const TOOLBAR_BTN_CLASS = 'flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors';
const TOOLBAR_BTN_ACTIVE_CLASS = 'bg-blue-50 text-blue-600';
const TOOLBAR_BTN_DISABLED_CLASS = 'opacity-40 cursor-not-allowed';

export function DocToolbar({ readOnly = false }: DocToolbarProps) {
  const { editor } = useCurrentEditor();

  if (!editor) return null;

  /** 执行编辑器命令 */
  const runCommand = (command: () => void) => {
    if (readOnly) return;
    command();
  };

  /** 检查当前是否激活某个格式 */
  const isActive = (name: string, attrs?: Record<string, unknown>): boolean => {
    return editor.isActive(name, attrs);
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200 sticky top-14 z-40 flex-wrap">
      {/* 标题 H1-H3 */}
      <Tooltip title="标题 1">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('heading', { level: 1 }) ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          disabled={readOnly}
        >
          <span className="text-sm font-bold">H1</span>
        </button>
      </Tooltip>

      <Tooltip title="标题 2">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('heading', { level: 2 }) ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          disabled={readOnly}
        >
          <span className="text-sm font-bold">H2</span>
        </button>
      </Tooltip>

      <Tooltip title="标题 3">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('heading', { level: 3 }) ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          disabled={readOnly}
        >
          <span className="text-sm font-bold">H3</span>
        </button>
      </Tooltip>

      <Divider type="vertical" className="mx-1" />

      {/* 粗体 */}
      <Tooltip title="粗体 (Ctrl+B)">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('bold') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
          disabled={readOnly}
        >
          <BoldOutlined />
        </button>
      </Tooltip>

      {/* 斜体 */}
      <Tooltip title="斜体 (Ctrl+I)">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('italic') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
          disabled={readOnly}
        >
          <ItalicOutlined />
        </button>
      </Tooltip>

      <Divider type="vertical" className="mx-1" />

      {/* 有序列表 */}
      <Tooltip title="有序列表">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('orderedList') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
          disabled={readOnly}
        >
          <OrderedListOutlined />
        </button>
      </Tooltip>

      {/* 无序列表 */}
      <Tooltip title="无序列表">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('bulletList') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
          disabled={readOnly}
        >
          <UnorderedListOutlined />
        </button>
      </Tooltip>

      <Divider type="vertical" className="mx-1" />

      {/* 引用 */}
      <Tooltip title="引用">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('blockquote') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
          disabled={readOnly}
        >
          <AlignLeftOutlined />
        </button>
      </Tooltip>

      {/* 代码块 */}
      <Tooltip title="代码块">
        <button
          className={`${TOOLBAR_BTN_CLASS} ${isActive('codeBlock') ? TOOLBAR_BTN_ACTIVE_CLASS : ''} ${readOnly ? TOOLBAR_BTN_DISABLED_CLASS : ''}`}
          onClick={() => runCommand(() => editor.chain().focus().toggleCodeBlock().run())}
          disabled={readOnly}
        >
          <CodeOutlined />
        </button>
      </Tooltip>
    </div>
  );
}
