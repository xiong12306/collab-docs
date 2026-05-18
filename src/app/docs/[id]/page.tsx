'use client';

/**
 * 文档编辑页面
 * 核心：Tiptap 编辑器 + 多人实时协同
 * 增强：LoadingSkeleton、404/403、断线重连、viewer 只读模式
 * P1 增强：删除改为移入回收站提示，LoadingSkeleton 替换自定义骨架
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Breadcrumb, Input, Button, Tag, message, Tooltip, Popconfirm,
  Alert, Result,
} from 'antd';
import {
  HomeOutlined,
  ShareAltOutlined,
  CloudOutlined,
  DisconnectOutlined,
  TeamOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DocToolbar } from '@/components/docs/DocToolbar';
import { ShareModal } from '@/components/docs/ShareModal';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { SupabaseYjsProvider } from '@/lib/collaboration/provider';
import { getAwarenessColor, getUniqueOnlineUsers } from '@/lib/collaboration/awareness';
import { createBrowserClient } from '@/lib/supabase/client';
import { fetchApi } from '@/lib/utils';
import { EDITOR_PLACEHOLDER } from '@/constants/editor';
import { canEdit, canManage, ROLE_LABELS } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import type { DocumentDetail } from '@/types/document';
import type { CollabUser } from '@/types/collaboration';

/** 页面错误状态 */
type PageError = 'not_found' | 'forbidden' | 'network' | null;

export default function DocEditPage() {
  return (
    <AuthGuard>
      <DocEditContent />
    </AuthGuard>
  );
}

/** 文档编辑内容（需在 AuthGuard 内） */
function DocEditContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const docId = params.id as string;

  // 文档状态
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<PageError>(null);
  const [title, setTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false);

  // Refs
  const providerRef = useRef<SupabaseYjsProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const lastContentRef = useRef<Record<string, unknown> | null>(null);

  // 用户颜色
  const userColor = user ? getAwarenessColor(user.id) : '#666666';

  // 创建 Yjs Doc 和 Awareness（确保只创建一次）
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
    awarenessRef.current = new Awareness(ydocRef.current);
  }
  const ydoc = ydocRef.current;
  const awareness = awarenessRef.current;

  // 创建 Tiptap 编辑器，将 awareness 通过 provider 对象传递给 CollaborationCursor
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
        provider: { awareness },
        user: {
          name: user?.name || '匿名',
          color: userColor,
        },
      }),
      Placeholder.configure({
        placeholder: EDITOR_PLACEHOLDER,
      }),
    ],
    editable: false, // 初始不可编辑，等权限确认后再设置
    onUpdate: ({ editor: ed }) => {
      lastContentRef.current = ed.getJSON();
      // 更新字数统计
      const text = ed.getText();
      setWordCount(text.split(/\s+/).filter(Boolean).length);
    },
  });

  /**
   * 获取文档详情
   */
  useEffect(() => {
    if (!docId) return;

    const fetchDoc = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const res = await fetchApi<DocumentDetail>(`/api/documents/${docId}`);
        if (res.code === 200 && res.data) {
          setDoc(res.data);
          setTitle(res.data.title);
        } else if (res.code === 404) {
          setPageError('not_found');
        } else if (res.code === 403) {
          setPageError('forbidden');
        } else {
          setPageError('network');
          message.error(res.message || '加载文档失败');
        }
      } catch {
        setPageError('network');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [docId]);

  /**
   * 设置编辑器可编辑状态
   */
  useEffect(() => {
    if (!editor || !doc) return;

    const isEditable = canEdit(doc.my_role);
    editor.setEditable(isEditable);
  }, [editor, doc]);

  /**
   * 初始化 Supabase Yjs Provider
   */
  useEffect(() => {
    if (!editor || !docId || !user || pageError) return;

    // 销毁旧的 ydoc（docId 变化时）
    if (ydocRef.current && ydocRef.current !== ydoc) {
      ydocRef.current.destroy();
    }
    ydocRef.current = ydoc;

    if (!awareness) {
      console.warn('Awareness 实例未找到');
      return;
    }

    // 创建 Supabase 客户端
    let supabaseClient;
    try {
      supabaseClient = createBrowserClient();
    } catch {
      console.error('创建 Supabase 客户端失败');
      return;
    }

    // 创建 Provider
    const provider = new SupabaseYjsProvider(
      ydoc,
      awareness,
      docId,
      user.id,
      user.name,
      userColor,
      supabaseClient
    );
    providerRef.current = provider;

    // 监听连接状态变化
    provider.onConnectionChange = (isConnected: boolean) => {
      setConnected(isConnected);
      if (isConnected) {
        setReconnecting(false);
        setShowDisconnectBanner(false);
        message.success('已重新连接协同');
      } else {
        setShowDisconnectBanner(true);
      }
    };

    // 连接
    provider.connect().then(() => {
      setConnected(true);
      setShowDisconnectBanner(false);
    }).catch(() => {
      setConnected(false);
      setShowDisconnectBanner(true);
    });

    // 定期更新在线用户
    const userUpdateTimer = setInterval(() => {
      if (awareness) {
        const states = awareness.getStates();
        const users = getUniqueOnlineUsers(states);
        setOnlineUsers(users);
      }
    }, 3000);

    // 定期自动保存
    const saveTimer = setInterval(() => {
      if (lastContentRef.current && provider.connected) {
        saveContent();
      }
    }, 10000); // 每 10 秒自动保存

    // 清理
    return () => {
      clearInterval(userUpdateTimer);
      clearInterval(saveTimer);
      provider.disconnect();
      providerRef.current = null;
      setConnected(false);
    };
  }, [editor, docId, user, pageError]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 手动重连
   */
  const handleReconnect = useCallback(async () => {
    if (!providerRef.current) return;
    setReconnecting(true);
    try {
      await providerRef.current.reconnect();
    } catch {
      message.error('重连失败，请检查网络');
    } finally {
      setReconnecting(false);
    }
  }, []);

  /**
   * 保存文档内容
   */
  const saveContent = useCallback(async () => {
    if (!lastContentRef.current || !docId) return;

    setSaving(true);
    try {
      await fetchApi(`/api/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: lastContentRef.current }),
      });
      setLastSaved(new Date());
    } catch {
      // 静默失败，下次自动重试
    } finally {
      setSaving(false);
    }
  }, [docId]);

  /**
   * 更新文档标题
   */
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!docId || newTitle === title) return;

    setTitle(newTitle);
    try {
      await fetchApi(`/api/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle }),
      });
    } catch {
      message.error('标题保存失败');
    }
  }, [docId, title]);

  /**
   * 删除文档（P1：改为移入回收站）
   */
  const handleDelete = useCallback(async () => {
    if (!docId) return;

    const res = await fetchApi(`/api/documents/${docId}`, {
      method: 'DELETE',
    });

    if (res.code === 200) {
      message.success('文档已移入回收站');
      router.push('/docs');
    } else {
      message.error(res.message || '删除失败');
    }
  }, [docId, router]);

  // ===== 加载中 — Loading Skeleton =====
  if (loading) {
    return <LoadingSkeleton type="editor" />;
  }

  // ===== 404 页面 =====
  if (pageError === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="404"
          title="文档不存在"
          subTitle="该文档可能已被删除或链接有误"
          extra={
            <Button type="primary" onClick={() => router.push('/docs')}>
              返回文档列表
            </Button>
          }
        />
      </div>
    );
  }

  // ===== 403 页面 =====
  if (pageError === 'forbidden') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="403"
          title="无权限访问"
          subTitle="您没有权限查看此文档，请联系文档拥有者"
          extra={
            <Button type="primary" onClick={() => router.push('/docs')}>
              返回文档列表
            </Button>
          }
        />
      </div>
    );
  }

  // ===== 网络错误 =====
  if (pageError === 'network' && !doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="500"
          title="加载失败"
          subTitle="网络错误，请检查网络连接后重试"
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  // 文档数据缺失
  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Result
          status="404"
          title="文档不存在"
          subTitle="该文档可能已被删除"
          extra={
            <Button type="primary" onClick={() => router.push('/docs')}>
              返回文档列表
            </Button>
          }
        />
      </div>
    );
  }

  const readOnly = !canEdit(doc.my_role);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 断线提示横幅 */}
      {showDisconnectBanner && (
        <div className="connection-banner bg-amber-50 text-amber-800 border-b border-amber-200 flex items-center justify-center gap-3">
          <DisconnectOutlined />
          <span className="text-sm">协同连接已断开，您的编辑可能无法同步</span>
          <Button
            size="small"
            type="link"
            icon={<ReloadOutlined />}
            loading={reconnecting}
            onClick={handleReconnect}
            className="text-amber-700"
          >
            重新连接
          </Button>
          <button
            className="text-amber-600 hover:text-amber-800 text-sm ml-2"
            onClick={() => setShowDisconnectBanner(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 左侧：面包屑 + 标题 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Breadcrumb
              items={[
                {
                  title: (
                    <span className="cursor-pointer" onClick={() => router.push('/docs')}>
                      <HomeOutlined /> 文档
                    </span>
                  ),
                },
                {
                  title: (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={(e) => handleTitleChange(e.target.value)}
                      onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                      bordered={false}
                      className="font-medium text-base p-0"
                      style={{ width: 240 }}
                      disabled={readOnly}
                      readOnly={readOnly}
                    />
                  ),
                },
              ]}
            />
            {/* 角色标签 */}
            <Tag
              color={doc.my_role === 'owner' ? 'purple' : doc.my_role === 'editor' ? 'blue' : 'default'}
              icon={readOnly ? <EyeOutlined /> : undefined}
            >
              {ROLE_LABELS[doc.my_role as keyof typeof ROLE_LABELS] || doc.my_role}
            </Tag>
            {readOnly && (
              <Tag color="orange" className="text-xs">只读</Tag>
            )}
          </div>

          {/* 右侧：协作者 + 操作 */}
          <div className="flex items-center gap-3">
            {/* 在线协作者 */}
            <Tooltip title={`${onlineUsers.length} 人在线`}>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <TeamOutlined />
                <span>{onlineUsers.length}</span>
              </div>
            </Tooltip>

            {/* 连接状态 */}
            <Tooltip title={connected ? '已连接协同' : reconnecting ? '正在重连...' : '未连接'}>
              {connected ? (
                <CloudOutlined className="text-green-500" />
              ) : (
                <DisconnectOutlined
                  className={`text-red-400 ${reconnecting ? 'animate-pulse' : 'cursor-pointer'}`}
                  onClick={!reconnecting ? handleReconnect : undefined}
                />
              )}
            </Tooltip>

            {/* 分享按钮（仅 owner） */}
            {canManage(doc.my_role) && (
              <Button
                type="primary"
                size="small"
                icon={<ShareAltOutlined />}
                onClick={() => setShareOpen(true)}
              >
                分享
              </Button>
            )}

            {/* 删除按钮（仅 owner） */}
            {canManage(doc.my_role) && (
              <Popconfirm
                title="移入回收站？"
                description="文档将移入回收站，30 天后自动删除"
                onConfirm={handleDelete}
                okText="移入回收站"
                cancelText="取消"
                okButtonProps={{ danger: true }}
              >
                <Button danger size="small" icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        </div>
      </header>

      {/* 工具栏 */}
      {editor && <DocToolbar readOnly={readOnly} />}

      {/* 编辑器主体 */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-6">
        <div className={`tiptap-editor ${readOnly ? 'readonly' : ''}`}>
          {editor && (
            <EditorContent
              editor={editor}
              className="editor-container prose max-w-none min-h-[600px] bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200"
            />
          )}
        </div>
      </main>

      {/* 底部状态栏 */}
      <footer className="bg-white border-t border-gray-200 py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>{wordCount} 字</span>
            <span className="hidden sm:inline">
              {saving
                ? '保存中...'
                : lastSaved
                ? `上次保存：${lastSaved.toLocaleTimeString()}`
                : '未保存'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span>{connected ? '已连接' : reconnecting ? '重连中' : '未连接'}</span>
          </div>
        </div>
      </footer>

      {/* 分享弹窗 */}
      {shareOpen && (
        <ShareModal
          docId={docId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
