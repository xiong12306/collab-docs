/**
 * Supabase Yjs Provider
 * 基于 Supabase Broadcast Channel 实现的 Yjs 实时协同 Provider
 *
 * 职责：
 * 1. 实时同步：通过 Supabase Broadcast Channel 广播和接收 Yjs 增量更新
 * 2. Awareness 光标：广播和接收 Awareness 状态
 * 3. 持久化：每 2 秒批量保存增量更新到服务端
 * 4. 冷启动：首次连接时从服务端加载历史更新
 * 5. 断线重连：监听 Supabase Realtime 连接状态，断线后自动重连 + 补拉缺失 updates
 */
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CHANNEL_PREFIX, BROADCAST_EVENTS, SYNC_INTERVAL } from '@/constants/editor';

/** base64 编解码工具 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Supabase Yjs Provider
 * 连接 Yjs Doc 与 Supabase Broadcast Channel，实现实时协同
 */
export class SupabaseYjsProvider {
  /** Yjs 文档实例 */
  private ydoc: Y.Doc;
  /** Awareness 协议实例 */
  private awareness: Awareness;
  /** 文档 ID */
  private docId: string;
  /** 用户 ID */
  private userId: string;
  /** 用户名 */
  private userName: string;
  /** 用户颜色 */
  private userColor: string;
  /** Supabase 客户端 */
  private supabase: SupabaseClient;
  /** Broadcast Channel */
  private channel: any | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** 是否已连接 */
  private _connected = false;
  /** 待持久化的更新 */
  private pendingUpdates: Uint8Array[] = [];
  /** 持久化定时器 */
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  /** Yjs update 事件处理函数 */
  private onUpdateHandler: (update: Uint8Array, origin: unknown) => void;
  /** Awareness change 事件处理函数 */
  private onAwarenessChangeHandler: () => void;
  /** 是否正在加载历史更新 */
  private loadingHistory = false;
  /** 重连定时器 */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** 重连次数 */
  private reconnectAttempts = 0;
  /** 最大重连次数 */
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  /** 重连延迟基础（毫秒） */
  private static readonly RECONNECT_BASE_DELAY = 2000;

  /** 连接状态变化回调（供外部监听） */
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  /**
   * 创建 Supabase Yjs Provider
   */
  constructor(
    ydoc: Y.Doc,
    awareness: Awareness,
    docId: string,
    userId: string,
    userName: string,
    userColor: string,
    supabase: SupabaseClient
  ) {
    this.ydoc = ydoc;
    this.awareness = awareness;
    this.docId = docId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = userColor;
    this.supabase = supabase;

    // 绑定事件处理函数
    this.onUpdateHandler = this.handleLocalUpdate.bind(this);
    this.onAwarenessChangeHandler = this.handleAwarenessChange.bind(this);
  }

  /** 是否已连接 */
  get connected(): boolean {
    return this._connected;
  }

  /**
   * 连接到 Supabase Broadcast Channel
   */
  async connect(): Promise<void> {
    if (this._connected) return;

    const channelName = `${CHANNEL_PREFIX}${this.docId}`;
    console.log(`[Collab] connect() called — docId=${this.docId}, channelName=${channelName}, ydoc.clientID=${this.ydoc.clientID}, userId=${this.userId}`);

    // 创建 Broadcast Channel（supabase channel 类型定义不完整，需 as any 以支持 broadcast 事件）
    const channel = this.supabase.channel(channelName, {
      config: { broadcast: { self: true } },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    this.channel = channel;

    // 监听 sync-update 事件
    channel.on('broadcast', { event: BROADCAST_EVENTS.SYNC_UPDATE }, (payload: { update: string; client_id: number }) => {
      console.log(`[Collab] 🔵 SYNC_UPDATE received — client_id=${payload.client_id}, my clientID=${this.ydoc.clientID}, updateLength=${payload.update?.length}, isSelf=${payload.client_id === this.ydoc.clientID}`);
      this.handleRemoteUpdate(payload);
    });

    // 监听 awareness-update 事件
    channel.on('broadcast', { event: BROADCAST_EVENTS.AWARENESS_UPDATE }, (payload: { states: Array<{ clientId: number; user: { id: string; name: string; color: string } }> }) => {
      console.log(`[Collab] 🟢 AWARENESS_UPDATE received — states:`, payload.states?.map(s => ({ clientId: s.clientId, userId: s.user?.id, name: s.user?.name })), `my clientID=${this.awareness.clientID}`);
      this.handleRemoteAwareness(payload);
    });

    // 监听 Supabase Realtime 连接状态变化
    channel.subscribe(async (status: string) => {
      console.log(`[Collab] 📡 Channel status changed: ${status} (docId=${this.docId})`);
      if (status === 'SUBSCRIBED') {
        this.setConnected(true);
        this.reconnectAttempts = 0;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        this.setConnected(false);
        this.scheduleReconnect();
      } else if (status === 'CLOSED') {
        this.setConnected(false);
      }
    });

    // 注册 Yjs update 监听
    this.ydoc.on('update', this.onUpdateHandler);

    // 注册 Awareness change 监听（必须在 setLocalStateField 之前，否则初始状态不会触发广播）
    this.awareness.on('change', this.onAwarenessChangeHandler);

    // 设置 Awareness 本地状态（触发 change 事件，需要先注册监听器才能广播出去）
    console.log(`[Collab] Setting local awareness state — userId=${this.userId}, name=${this.userName}, awareness.clientID=${this.awareness.clientID}`);
    this.awareness.setLocalStateField('user', {
      id: this.userId,
      name: this.userName,
      color: this.userColor,
    });
    console.log(`[Collab] Local awareness states after set:`, Array.from(this.awareness.getStates().entries()).map(([id, s]) => ({ clientId: id, user: s.user })));

    // 从服务端加载历史更新（冷启动）
    await this.loadFromServer();

    // 启动持久化定时器
    this.syncTimer = setInterval(() => {
      this.flushToServer();
    }, SYNC_INTERVAL);

    this._connected = true;
    console.log(`[Collab] connect() completed — connected=true, docId=${this.docId}`);
  }

  /**
   * 断开连接，清理资源
   */
  disconnect(): void {
    if (!this._connected && !this.channel) return;

    // 移除事件监听
    this.ydoc.off('update', this.onUpdateHandler);
    this.awareness.off('change', this.onAwarenessChangeHandler);

    // 停止持久化定时器
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    // 停止重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 最后一次持久化
    this.flushToServer();

    // 取消订阅频道
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this._connected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * 手动重连
   * 断开当前连接后重新建立
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    this.reconnectAttempts = 0;
    await this.connect();
  }

  /**
   * 设置连接状态并通知外部
   */
  private setConnected(value: boolean): void {
    const prev = this._connected;
    this._connected = value;
    if (prev !== value && this.onConnectionChange) {
      this.onConnectionChange(value);
    }
  }

  /**
   * 调度自动重连
   * 使用指数退避策略
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= SupabaseYjsProvider.MAX_RECONNECT_ATTEMPTS) {
      console.warn('达到最大重连次数，停止自动重连');
      return;
    }

    // 避免重复调度
    if (this.reconnectTimer) return;

    const delay = SupabaseYjsProvider.RECONNECT_BASE_DELAY * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`将在 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.reconnect();
      } catch (error) {
        console.error('自动重连失败:', error);
      }
    }, delay);
  }

  /**
   * 处理本地 Yjs 更新
   * 广播给其他用户，并缓存待持久化
   */
  private handleLocalUpdate(update: Uint8Array, origin: unknown): void {
    // 忽略远程更新（避免回环）
    if (origin === this) return;

    // 广播给其他用户
    if (this.channel) {
      // 使用 Array.from() 序列化 Uint8Array，避免 Base64 在 Supabase Broadcast Channel
      // 二进制传输中被损坏导致 atob 解码失败
      const updateArray = Array.from(update);
      console.log(`[Collab] 📤 LOCAL_UPDATE broadcast — client_id=${this.ydoc.clientID}, updateSize=${update.length} bytes, arrayLength=${updateArray.length}`);
      this.channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENTS.SYNC_UPDATE,
        payload: {
          update: updateArray,
          client_id: this.ydoc.clientID,
        },
      });
    } else {
      console.warn(`[Collab] ⚠️ LOCAL_UPDATE — channel is null, cannot broadcast!`);
    }

    // 缓存待持久化
    this.pendingUpdates.push(update);
  }

  /**
   * 处理远程 Yjs 更新
   */
  private handleRemoteUpdate(payload: { update: string | number[]; client_id: number }): void {
    // 跳过自己的广播（self: true 时会收到自己发出的消息）
    if (payload.client_id === this.ydoc.clientID) {
      console.log(`[Collab] 🔵 SYNC_UPDATE skipped (self) — client_id=${payload.client_id}`);
      return;
    }

    try {
      // 兼容两种格式：number[]（新格式）和 string（旧 Base64 格式）
      let update: Uint8Array;
      if (Array.isArray(payload.update)) {
        update = new Uint8Array(payload.update);
      } else if (typeof payload.update === 'string') {
        // 旧 Base64 格式（向后兼容）
        update = base64ToUint8Array(payload.update);
      } else {
        console.error(`[Collab] ❌ SYNC_UPDATE — unknown update type: ${typeof payload.update}`, payload.update);
        return;
      }
      console.log(`[Collab] 🔵 SYNC_UPDATE applying — from client_id=${payload.client_id}, updateSize=${update.length} bytes, format=${Array.isArray(payload.update) ? 'array' : 'base64'}`);
      Y.applyUpdate(this.ydoc, update, this);
    } catch (error) {
      console.error('[Collab] ❌ 应用远程更新失败:', error);
      // 诊断日志：打印 payload.update 的类型和前 100 个字符
      console.error(`[Collab] ❌ payload.update type=${typeof payload.update}, preview=`, JSON.stringify(payload.update)?.substring(0, 200));
    }
  }

  /**
   * 处理 Awareness 本地变化
   */
  private handleAwarenessChange(): void {
    if (!this.channel) return;

    const states: Array<{ clientId: number; user: { id: string; name: string; color: string } }> = [];
    this.awareness.getStates().forEach((state: Record<string, any>, clientId: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (state.user) {
        const user = state.user as { id: string; name: string; color: string };
        states.push({ clientId, user });
      }
    });

    console.log(`[Collab] 📤 AWARENESS broadcast — states:`, states.map(s => ({ clientId: s.clientId, userId: s.user?.id, name: s.user?.name })), `my awareness.clientID=${this.awareness.clientID}`);
    this.channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENTS.AWARENESS_UPDATE,
      payload: { states },
    });
  }

  /**
   * 处理远程 Awareness 更新
   * 将远程 Awareness 状态应用到本地 awareness 实例，
   * 使 Tiptap CollaborationCursor 能渲染远程用户光标
   */
  private handleRemoteAwareness(payload: { states: Array<{ clientId: number; user: { id: string; name: string; color: string } }> }): void {
    if (!payload.states || payload.states.length === 0) {
      console.log(`[Collab] 🟢 AWARENESS_UPDATE skipped — empty states`);
      return;
    }

    // 暂时移除本地 awareness change 监听，避免将远程状态再次广播出去（回环）
    this.awareness.off('change', this.onAwarenessChangeHandler);

    try {
      const addedClients: number[] = [];
      const updatedClients: number[] = [];

      for (const state of payload.states) {
        if (state.clientId !== this.awareness.clientID) {
          const isNew = !this.awareness.getStates().has(state.clientId);
          // awareness states 存储为 Map<number, Object>，值为普通对象而非 Map
          this.awareness.getStates().set(state.clientId, { user: state.user });
          // 更新 meta 信息（clock + lastUpdated），防止被 awareness 内部超时清理
          const now = Date.now();
          const existingMeta = this.awareness.meta.get(state.clientId);
          this.awareness.meta.set(state.clientId, {
            clock: (existingMeta?.clock || 0) + 1,
            lastUpdated: now,
          });
          if (isNew) {
            addedClients.push(state.clientId);
          } else {
            updatedClients.push(state.clientId);
          }
        }
      }

      console.log(`[Collab] 🟢 AWARENESS applied — added=${addedClients}, updated=${updatedClients}, totalStates=${this.awareness.getStates().size}`);

      // 手动触发 update 事件，通知 Tiptap CollaborationCursor 和 y-prosemirror 更新远程光标渲染
      if (addedClients.length > 0 || updatedClients.length > 0) {
        this.awareness.emit('update', [{
          added: addedClients,
          updated: updatedClients,
          removed: [],
        }, 'remote']);
      }
    } catch (error) {
      console.error('[Collab] ❌ 应用远程 Awareness 更新失败:', error);
    } finally {
      // 恢复本地 awareness change 监听
      this.awareness.on('change', this.onAwarenessChangeHandler);
    }
  }

  /**
   * 从服务端加载历史更新（冷启动）
   */
  private async loadFromServer(): Promise<void> {
    if (this.loadingHistory) return;
    this.loadingHistory = true;

    try {
      const res = await fetch(`/api/documents/${this.docId}/sync`);
      const data = await res.json();

      if (data.code === 200 && data.data?.updates) {
        const updates = data.data.updates as string[];
        console.log(`[Collab] 📥 Load from server — ${updates.length} historical updates loaded`);
        for (const base64Update of updates) {
          try {
            const update = base64ToUint8Array(base64Update);
            Y.applyUpdate(this.ydoc, update, this);
          } catch (e) {
            console.warn('[Collab] ⚠️ 应用历史更新失败:', e);
          }
        }
      } else {
        console.log(`[Collab] 📥 Load from server — no updates found (code=${data.code})`);
      }
    } catch (error) {
      console.error('[Collab] ❌ 加载历史更新失败:', error);
    } finally {
      this.loadingHistory = false;
    }
  }

  /**
   * 将待持久化的更新批量发送到服务端
   */
  private async flushToServer(): Promise<void> {
    if (this.pendingUpdates.length === 0) return;

    const updatesToSync = this.pendingUpdates.splice(0);

    for (const update of updatesToSync) {
      try {
        const encodedUpdate = uint8ArrayToBase64(update);
        await fetch(`/api/documents/${this.docId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ update: encodedUpdate }),
        });
      } catch (error) {
        console.error('持久化更新失败:', error);
        // 失败的更新放回队列头部，保证更新顺序（旧更新在新更新之前重试）
        this.pendingUpdates.unshift(update);
      }
    }
  }

  /**
   * 手动触发保存当前编辑器内容快照
   */
  async saveContentSnapshot(content: Record<string, unknown>): Promise<void> {
    try {
      const updatesToSync = this.pendingUpdates.splice(0);

      if (updatesToSync.length > 0) {
        // 发送所有待持久化更新（合并为一次请求）
        for (const update of updatesToSync) {
          const encodedUpdate = uint8ArrayToBase64(update);
          await fetch(`/api/documents/${this.docId}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ update: encodedUpdate, content }),
          });
        }
      } else {
        await fetch(`/api/documents/${this.docId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      }
    } catch (error) {
      console.error('保存内容快照失败:', error);
    }
  }
}
