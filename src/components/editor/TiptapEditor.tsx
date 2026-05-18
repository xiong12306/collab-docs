'use client';

/**
 * Tiptap 编辑器组件
 * 集成 Yjs + Supabase Broadcast 实时协同
 * 所有扩展在初始化时配置，避免动态注册
 * 增强：断线重连提示、viewer 只读模式优化
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { SupabaseYjsProvider } from '@/lib/collaboration/provider';
import { getAwarenessColor } from '@/lib/collaboration/awareness';
import { createBrowserClient } from '@/lib/supabase/client';
import { EDITOR_PLACEHOLDER } from '@/constants/editor';
import { Spin, Alert, Button } from 'antd';
import { DisconnectOutlined, ReloadOutlined } from '@ant-design/icons';

interface TiptapEditorProps {
  /** 文档 ID */
  docId: string;
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  userName: string;
  /** 用户颜色（可选，不传则自动分配） */
  userColor?: string;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 编辑器内容变化回调 */
  onContentChange?: (content: Record<string, unknown>) => void;
  /** 连接状态变化回调 */
  onConnectionChange?: (connected: boolean) => void;
}

export function TiptapEditor({
  docId,
  userId,
  userName,
  userColor,
  readOnly = false,
  onContentChange,
  onConnectionChange,
}: TiptapEditorProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  // 确定用户颜色
  const color = userColor || getAwarenessColor(userId);

  // 创建 Yjs Doc 和 Awareness（确保只创建一次）
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
    awarenessRef.current = new Awareness(ydocRef.current);
  }
  const ydoc = ydocRef.current;
  const awareness = awarenessRef.current;

  // 创建 Tiptap Editor — 所有扩展在初始化时配置
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: false, // 使用 Yjs 的协作历史，禁用本地历史
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: { awareness },
        user: {
          name: userName,
          color,
        },
      }),
      Placeholder.configure({
        placeholder: readOnly ? '此文档为只读模式' : EDITOR_PLACEHOLDER,
      }),
    ],
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      // 内容变化时通知父组件
      if (onContentChange) {
        const json = ed.getJSON();
        onContentChange(json);
      }
    },
  });

  /**
   * 手动重连
   */
  const handleReconnect = useCallback(async () => {
    if (!providerRef.current) return;
    setReconnecting(true);
    try {
      await providerRef.current.reconnect();
    } catch {
      // 重连失败静默处理，provider 内部会更新状态
    } finally {
      setReconnecting(false);
    }
  }, []);

  /**
   * 初始化 Supabase Yjs Provider
   */
  useEffect(() => {
    if (!editor || !docId) return;

    if (!awareness) {
      console.warn('Awareness 实例未找到');
      setLoading(false);
      return;
    }

    // 创建 Supabase 浏览器客户端
    let supabaseClient;
    try {
      supabaseClient = createBrowserClient();
    } catch {
      console.error('创建 Supabase 客户端失败');
      setLoading(false);
      return;
    }

    // 创建 Supabase Yjs Provider
    const provider = new SupabaseYjsProvider(
      ydoc,
      awareness,
      docId,
      userId,
      userName,
      color,
      supabaseClient
    );
    providerRef.current = provider;

    // 监听连接状态变化
    provider.onConnectionChange = (isConnected: boolean) => {
      setConnected(isConnected);
      if (onConnectionChange) {
        onConnectionChange(isConnected);
      }
    };

    // 连接
    provider.connect().then(() => {
      setConnected(true);
      setLoading(false);
    }).catch(() => {
      setConnected(false);
      setLoading(false);
    });

    // 清理函数
    return () => {
      provider.disconnect();
      providerRef.current = null;
      setConnected(false);
    };
  }, [editor, docId]); // eslint-disable-line react-hooks/exhaustive-deps

  // docId 变化时重建 Yjs Doc 和 Awareness
  useEffect(() => {
    return () => {
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      awarenessRef.current = null;
    };
  }, [docId]);

  // 更新只读状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" tip="正在连接协同编辑..." />
      </div>
    );
  }

  return (
    <div className={`tiptap-editor ${readOnly ? 'readonly' : ''}`}>
      {/* 断线提示 */}
      {!connected && !loading && (
        <Alert
          message="协同连接已断开"
          description="您的编辑可能无法实时同步给其他协作者"
          type="warning"
          showIcon
          icon={<DisconnectOutlined />}
          action={
            <Button
              size="small"
              type="primary"
              ghost
              icon={<ReloadOutlined />}
              loading={reconnecting}
              onClick={handleReconnect}
            >
              重新连接
            </Button>
          }
          className="mb-4"
          closable
        />
      )}

      <EditorContent editor={editor} className="prose max-w-none min-h-[500px]" />
    </div>
  );
}
