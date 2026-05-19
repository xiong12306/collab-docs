'use client';

/**
 * 文档列表实时更新 Hook
 * 通过 Supabase Broadcast Channel 接收其他用户的文档变更通知
 * 实现文档列表的实时刷新能力
 */
import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** 文档变更事件类型 */
export type DocChangeEvent = 'created' | 'updated' | 'deleted';

/** 文档变更通知 payload */
export interface DocChangePayload {
  event: DocChangeEvent;
  docId: string;
  userId: string; // 变更发起者的用户 ID，避免自己刷新自己
}

/**
 * 文档列表实时更新 Hook
 * 通过 Supabase Broadcast Channel 接收其他用户的文档变更通知
 *
 * @param onChange - 接收到变更通知时的回调函数
 * @returns broadcastChange - 广播文档变更通知的方法
 */
export function useDocumentRealtime(onChange: (payload: DocChangePayload) => void) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let supabaseClient;
    try {
      supabaseClient = createBrowserClient();
    } catch {
      // Broadcast 连接失败不应阻塞正常功能
      return;
    }

    const channel = supabaseClient.channel('doc-list-updates', {
      config: { broadcast: { self: true } }, // self: true 因为需要自己创建/删除后也刷新
    });

    channel.on('broadcast', { event: 'doc-change' }, (payload: { payload: DocChangePayload }) => {
      onChangeRef.current(payload.payload);
    });

    channel.subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  /** 广播文档变更通知 */
  const broadcastChange = useCallback((event: DocChangeEvent, docId: string, userId: string) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'doc-change',
      payload: { event, docId, userId },
    });
  }, []);

  return { broadcastChange };
}
