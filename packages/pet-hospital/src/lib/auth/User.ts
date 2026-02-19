/**
 * 用户实体和类型定义
 */

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// 用户实体
export interface User {
  id: string;
  tenantId: string;
  username: string;
  email?: string;
  phone?: string;
  passwordHash?: string;  // 密码哈希

  // 基本信息
  avatar?: string;
  displayName?: string;
  department?: string;

  // 状态
  status: UserStatus;
  roles: string[];

  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;

  // 安全相关
  loginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
}

// 登录记录
export interface LoginRecord {
  id: string;
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

// 创建用户参数
export interface CreateUserParams {
  tenantId: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
  roles?: string[];
  displayName?: string;
  department?: string;
}

// 更新用户参数
export interface UpdateUserParams {
  email?: string;
  phone?: string;
  displayName?: string;
  department?: string;
  avatar?: string;
  status?: UserStatus;
}

// 用户查询选项
export interface UserQueryOptions {
  tenantId?: string;
  status?: UserStatus;
  roles?: string[];
  search?: string;  // 搜索 username/email/phone
  limit?: number;
  offset?: number;
  sortBy?: 'username' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

// 用户列表结果
export interface UserListResult {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

// 密码重置请求
export interface PasswordResetRequest {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
}

// 邮箱验证请求
export interface EmailVerificationRequest {
  id: string;
  userId: string;
  token: string;
  email: string;
  expiresAt: Date;
  usedAt?: Date;
}
