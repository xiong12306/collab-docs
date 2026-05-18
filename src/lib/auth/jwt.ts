/**
 * JWT 签发与验证
 * 使用 jose 库，兼容 Edge Runtime
 */
import { SignJWT, jwtVerify } from 'jose';
import type { JwtPayload } from '@/types/auth';

/** JWT 密钥，从环境变量读取 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('缺少环境变量 JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

/**
 * 签发 JWT
 * @param payload - JWT payload 中的业务字段（sub, email, name）
 * @returns 签名后的 JWT 字符串
 */
export async function signToken(payload: {
  sub: string;
  email: string;
  name: string;
}): Promise<string> {
  const secret = getJwtSecret();
  const token = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // 24 小时有效期
    .sign(secret);

  return token;
}

/**
 * 验证 JWT
 * @param token - JWT 字符串
 * @returns 验证成功返回 payload，失败返回 null
 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    // Token 过期、签名无效等异常
    return null;
  }
}
