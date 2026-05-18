'use client';

/**
 * 协同编辑 Hook
 * 管理编辑器实例、连接状态和在线用户
 * 增强：断线重连支持
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { SupabaseYjsProvider } from '@/lib/collaboration/provider';
import { getAwarenessColor, getUniqueOnlineUsers } from '@/lib/collaboration/awareness';
import { createBrowserClient } from '@/lib/supabase/client';
import { EDITOR_PLACEHOLDER } from '@/constants/editor';
import type { CollabUser } from '@/types/collaboration';

interface UseCollaborationReturn {
  /** Tiptap Editor 实例 */
  editor: Editor | null;
  /** 是否已连接到协同 */
  connected: boolean;
  /** 在线用户列表 */
  onlineUsers: CollabUser[];
  /** 是否正在加载 */
  loading: boolean;
  /** 手动保存内容 */
  saveContent: () => Promise<void>;
  /** 手动重连 */
  reconnect: () => Promise<void>;
}

/**
 * 协同编辑 Hook
 * @param docId - 文档 ID
 * @param userId - 用户 ID
 * @param userName - 用户名
 * @param readOnly - 是否只读
 */
export function useCollaboration(
  docId: string,
  userId: string,
  userName: string,
  readOnly: boolean = false
): UseCollaborationReturn {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([]);
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const lastContentRef = useRef<Record<string, unknown> | null>(null);

  // 用户颜色
  const userColor = getAwarenessColor(userId);

  // 创建 Yjs Doc
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  // 创建 Tiptap 编辑器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        user: {
          name: userName,
          color: userColor,
        },
      }),
      Placeholder.configure({
        placeholder: readOnly ? '此文档为只读模式' : EDITOR_PLACEHOLDER,
      }),
    ],
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      lastContentRef.current = ed.getJSON();
    },
  });

  /**
   * 初始化 Supabase Yjs Provider
   */
  useEffect(() => {
    if (!editor || !docId) return;

    const collabExtension = editor.extensionManager.extensions.find(
      (ext: any) => ext.name === 'collaboration' // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const awareness = collabExtension?.options?.awareness;

    if (!awareness) {
      console.warn('Collaboration awareness 未找到');
      setLoading(false);
      return;
    }

    let supabaseClient;
    try {
      supabaseClient = createBrowserClient();
    } catch {
      console.error('创建 Supabase 客户端失败');
      setLoading(false);
      return;
    }

    const provider = new SupabaseYjsProvider(
      ydoc,
      awareness,
      docId,
      userId,
      userName,
      userColor,
      supabaseClient
    );
    providerRef.current = provider;

    // 监听连接状态
    provider.onConnectionChange = (isConnected: boolean) => {
      setConnected(isConnected);
      if (isConnected) {
        setLoading(false);
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

    // 定期更新在线用户
    const userUpdateTimer = setInterval(() => {
      if (awareness) {
        const states = awareness.getStates();
        const users = getUniqueOnlineUsers(states);
        setOnlineUsers(users);
      }
    }, 3000);

    // 清理
    return () => {
      clearInterval(userUpdateTimer);
      provider.disconnect();
      providerRef.current = null;
      setConnected(false);
    };
  }, [editor, docId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 更新只读状态
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  /**
   * 手动保存内容
   */
  const saveContent = useCallback(async () => {
    if (!providerRef.current || !lastContentRef.current) return;
    await providerRef.current.saveContentSnapshot(lastContentRef.current);
  }, []);

  /**
   * 手动重连
   */
  const reconnect = useCallback(async () => {
    if (!providerRef.current) return;
    await providerRef.current.reconnect();
  }, []);

  return {
    editor,
    connected,
    onlineUsers,
    loading,
    saveContent,
    reconnect,
  };
}
