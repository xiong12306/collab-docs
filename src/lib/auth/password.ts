/**
 * 密码哈希与验证
 * 使用 bcryptjs 库
 */
import bcrypt from 'bcryptjs';

/** bcrypt 哈希轮数 */
const SALT_ROUNDS = 10;

/**
 * 对密码进行哈希
 * @param password - 明文密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/**
 * 验证密码是否匹配
 * @param password - 用户输入的明文密码
 * @param hash - 数据库中存储的哈希密码
 * @returns 是否匹配
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
