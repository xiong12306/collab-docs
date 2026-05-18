/**
 * 协作者颜色列表
 * 按用户加入顺序分配
 */
export const COLLABORATOR_COLORS = [
  '#7C3AED', // 紫色
  '#2563EB', // 蓝色
  '#059669', // 绿色
  '#D97706', // 橙色
  '#DC2626', // 红色
  '#0891B2', // 青色
  '#4F46E5', // 靛色
  '#BE185D', // 粉色
  '#65A30D', // 黄绿
  '#9333EA', // 深紫
];

/**
 * 根据用户索引获取协作者颜色
 * @param index - 用户在成员列表中的索引
 * @returns 颜色值
 */
export function getCollaboratorColor(index: number): string {
  return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
}
