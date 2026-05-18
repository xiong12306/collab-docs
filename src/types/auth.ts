/**
 * 认证相关类型定义
 */

/** 认证用户信息（不含密码） */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

/** 登录请求 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 注册请求 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/** 认证 API 统一响应 */
export interface AuthResponse {
  code: number;
  data: AuthUser | null;
  message: string;
}

/** JWT Payload 结构 */
export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

// ==================== P1 新增：密码重置相关类型 ====================

/** 忘记密码请求 */
export interface ForgotPasswordRequest {
  email: string;
}

/** 忘记密码响应 */
export interface ForgotPasswordResponse {
  token: string;       // MVP：直接返回 token（不发送邮件）
  message: string;
}

/** 重置密码请求 */
export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

/** 重置密码响应 */
export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

/** Token 验证结果 */
export interface TokenVerifyResult {
  valid: boolean;
  email?: string;
  message: string;
}
