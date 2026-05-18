/**
 * Awareness 光标同步管理
 * 监听 Awareness 变化事件，通过 Broadcast 广播和接收 Awareness 状态
 *
 * 注意：实际的光标广播已集成在 SupabaseYjsProvider 中。
 * 本模块提供 Awareness 辅助功能：颜色分配、在线用户提取、状态管理。
 */
import type { CollabUser } from '@/types/collaboration';
import { COLLABORATOR_COLORS } from '@/constants/colors';

/**
 * 根据用户 ID 分配固定颜色
 * 使用用户 ID 的哈希值来确保同一用户在不同设备上获得相同颜色
 * @param userId - 用户 ID
 * @returns 颜色值
 */
export function getAwarenessColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

/**
 * 从 Awareness 状态中提取在线用户列表
 * @param awarenessStates - Awareness getStates() 返回的 Map（值为普通对象）
 * @returns 在线用户列表
 */
export function getOnlineUsers(
  awarenessStates: Map<number, Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
): CollabUser[] {
  const users: CollabUser[] = [];

  awarenessStates.forEach((state, clientId) => {
    if (state.user) {
      const userState = state.user as {
        id: string;
        name: string;
        color: string;
      };

      users.push({
        id: userState.id,
        name: userState.name,
        color: userState.color,
      });
    }
  });

  return users;
}

/**
 * 获取去重后的在线用户列表（同一用户可能有多个标签页）
 * @param awarenessStates - Awareness getStates() 返回的 Map（值为普通对象）
 * @returns 去重的在线用户列表
 */
export function getUniqueOnlineUsers(
  awarenessStates: Map<number, Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
): CollabUser[] {
  const users = getOnlineUsers(awarenessStates);
  const seen = new Set<string>();
  const unique: CollabUser[] = [];

  for (const user of users) {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      unique.push(user);
    }
  }

  return unique;
}

/**
 * 获取在线用户数量（去重）
 * @param awarenessStates - Awareness getStates() 返回的 Map（值为普通对象）
 * @returns 在线用户数量
 */
export function getOnlineUserCount(
  awarenessStates: Map<number, Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
): number {
  return getUniqueOnlineUsers(awarenessStates).length;
}
