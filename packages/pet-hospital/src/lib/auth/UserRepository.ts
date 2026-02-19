/**
 * 用户仓库 - 负责用户数据的存储和检索
 */

import {
  User,
  CreateUserParams,
  UpdateUserParams,
  UserQueryOptions,
  UserListResult,
  LoginRecord,
  PasswordResetRequest,
  EmailVerificationRequest,
  UserStatus,
} from './User';

// 生成唯一 ID
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export interface UserRepository {
  // 用户 CRUD
  create(params: CreateUserParams, passwordHash: string): Promise<User>;
  getById(id: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByPhone(phone: string): Promise<User | null>;
  query(options: UserQueryOptions): Promise<UserListResult>;
  update(id: string, updates: UpdateUserParams): Promise<User | null>;
  delete(id: string): Promise<boolean>;

  // 密码相关
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  getPasswordHash(id: string): Promise<string | null>;

  // 状态管理
  updateStatus(id: string, status: UserStatus): Promise<void>;
  incrementLoginAttempts(id: string): Promise<number>;
  resetLoginAttempts(id: string): Promise<void>;
  setLockedUntil(id: string, until: Date): Promise<void>;
  clearLockedUntil(id: string): Promise<void>;

  // 角色管理
  assignRoles(id: string, roles: string[]): Promise<void>;
  removeRoles(id: string, roles: string[]): Promise<void>;

  // 登录记录
  addLoginRecord(record: Omit<LoginRecord, 'id'>): Promise<void>;
  getLoginHistory(userId: string, limit?: number): Promise<LoginRecord[]>;

  // 密码重置
  createPasswordResetRequest(userId: string, token: string, expiresAt: Date): Promise<PasswordResetRequest>;
  getPasswordResetRequest(token: string): Promise<PasswordResetRequest | null>;
  markPasswordResetUsed(token: string): Promise<void>;

  // 邮箱验证
  createEmailVerification(userId: string, email: string, token: string, expiresAt: Date): Promise<EmailVerificationRequest>;
  getEmailVerification(token: string): Promise<EmailVerificationRequest | null>;
  markEmailVerified(userId: string): Promise<void>;
}

/**
 * 内存实现的用户仓库
 * TODO: 后续可替换为数据库实现
 */
export function createUserRepository(): UserRepository {
  // 内存存储
  const users = new Map<string, User>();
  const usernameIndex = new Map<string, string>();  // username -> userId
  const emailIndex = new Map<string, string>();     // email -> userId
  const phoneIndex = new Map<string, string>();    // phone -> userId
  const loginRecords = new Map<string, LoginRecord[]>();  // userId -> records
  const passwordResetRequests = new Map<string, PasswordResetRequest>();
  const emailVerifications = new Map<string, EmailVerificationRequest>();

  return {
    async create(params: CreateUserParams, passwordHash: string): Promise<User> {
      const now = new Date();
      const user: User = {
        id: generateId(),
        tenantId: params.tenantId,
        username: params.username,
        email: params.email,
        phone: params.phone,
        passwordHash,
        displayName: params.displayName || params.username,
        department: params.department,
        status: 'pending',
        roles: params.roles || ['pet_owner'],  // 默认角色
        loginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      };

      users.set(user.id, user);
      usernameIndex.set(user.username.toLowerCase(), user.id);
      if (user.email) {
        emailIndex.set(user.email.toLowerCase(), user.id);
      }
      if (user.phone) {
        phoneIndex.set(user.phone, user.id);
      }
      loginRecords.set(user.id, []);

      return user;
    },

    async getById(id: string): Promise<User | null> {
      const user = users.get(id);
      if (!user) return null;
      // 移除敏感信息
      const { passwordHash, loginAttempts, lockedUntil, ...safeUser } = user;
      return safeUser as User;
    },

    async getByUsername(username: string): Promise<User | null> {
      const userId = usernameIndex.get(username.toLowerCase());
      if (!userId) return null;
      return this.getById(userId);
    },

    async getByEmail(email: string): Promise<User | null> {
      const userId = emailIndex.get(email.toLowerCase());
      if (!userId) return null;
      return this.getById(userId);
    },

    async getByPhone(phone: string): Promise<User | null> {
      const userId = phoneIndex.get(phone);
      if (!userId) return null;
      return this.getById(userId);
    },

    async query(options: UserQueryOptions): Promise<UserListResult> {
      let result = Array.from(users.values());

      // 按租户过滤
      if (options.tenantId) {
        result = result.filter(u => u.tenantId === options.tenantId);
      }

      // 按状态过滤
      if (options.status) {
        result = result.filter(u => u.status === options.status);
      }

      // 按角色过滤
      if (options.roles && options.roles.length > 0) {
        result = result.filter(u =>
          options.roles!.some(role => u.roles.includes(role))
        );
      }

      // 搜索
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        result = result.filter(u =>
          u.username.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower) ||
          u.phone?.includes(searchLower) ||
          u.displayName?.toLowerCase().includes(searchLower)
        );
      }

      // 排序
      const sortBy = options.sortBy || 'createdAt';
      const sortOrder = options.sortOrder || 'desc';
      result.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'username') {
          cmp = a.username.localeCompare(b.username);
        } else if (sortBy === 'lastLoginAt') {
          cmp = (a.lastLoginAt?.getTime() || 0) - (b.lastLoginAt?.getTime() || 0);
        } else {
          cmp = a.createdAt.getTime() - b.createdAt.getTime();
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });

      // 分页
      const total = result.length;
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      result = result.slice(offset, offset + limit);

      // 移除敏感信息
      const safeUsers = result.map(({ passwordHash, loginAttempts, lockedUntil, ...u }) => u as User);

      return {
        users: safeUsers,
        total,
        limit,
        offset,
      };
    },

    async update(id: string, updates: UpdateUserParams): Promise<User | null> {
      const user = users.get(id);
      if (!user) return null;

      const updatedUser: User = {
        ...user,
        ...updates,
        updatedAt: new Date(),
      };

      // 更新索引
      if (updates.email && updates.email !== user.email) {
        if (user.email) emailIndex.delete(user.email.toLowerCase());
        emailIndex.set(updates.email.toLowerCase(), id);
      }
      if (updates.phone && updates.phone !== user.phone) {
        if (user.phone) phoneIndex.delete(user.phone);
        phoneIndex.set(updates.phone, id);
      }

      users.set(id, updatedUser);

      const { passwordHash, loginAttempts, lockedUntil, ...safeUser } = updatedUser;
      return safeUser as User;
    },

    async delete(id: string): Promise<boolean> {
      const user = users.get(id);
      if (!user) return false;

      usernameIndex.delete(user.username.toLowerCase());
      if (user.email) emailIndex.delete(user.email.toLowerCase());
      if (user.phone) phoneIndex.delete(user.phone);
      users.delete(id);
      loginRecords.delete(id);

      return true;
    },

    async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.passwordHash = passwordHash;
        user.passwordChangedAt = new Date();
        user.updatedAt = new Date();
      }
    },

    async getPasswordHash(id: string): Promise<string | null> {
      const user = users.get(id);
      return user?.passwordHash || null;
    },

    async updateStatus(id: string, status: UserStatus): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.status = status;
        user.updatedAt = new Date();
      }
    },

    async incrementLoginAttempts(id: string): Promise<number> {
      const user = users.get(id);
      if (user) {
        user.loginAttempts += 1;
        return user.loginAttempts;
      }
      return 0;
    },

    async resetLoginAttempts(id: string): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.loginAttempts = 0;
      }
    },

    async setLockedUntil(id: string, until: Date): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.lockedUntil = until;
      }
    },

    async clearLockedUntil(id: string): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.lockedUntil = undefined;
      }
    },

    async assignRoles(id: string, roles: string[]): Promise<void> {
      const user = users.get(id);
      if (user) {
        const existingRoles = new Set(user.roles);
        roles.forEach(r => existingRoles.add(r));
        user.roles = Array.from(existingRoles);
        user.updatedAt = new Date();
      }
    },

    async removeRoles(id: string, roles: string[]): Promise<void> {
      const user = users.get(id);
      if (user) {
        user.roles = user.roles.filter(r => !roles.includes(r));
        user.updatedAt = new Date();
      }
    },

    async addLoginRecord(record: Omit<LoginRecord, 'id'>): Promise<void> {
      const fullRecord: LoginRecord = {
        ...record,
        id: generateId(),
      };
      const records = loginRecords.get(record.userId) || [];
      records.unshift(fullRecord);  // 添加到开头
      // 只保留最近 100 条
      if (records.length > 100) {
        records.length = 100;
      }
      loginRecords.set(record.userId, records);
    },

    async getLoginHistory(userId: string, limit: number = 10): Promise<LoginRecord[]> {
      const records = loginRecords.get(userId) || [];
      return records.slice(0, limit);
    },

    async createPasswordResetRequest(
      userId: string,
      token: string,
      expiresAt: Date
    ): Promise<PasswordResetRequest> {
      const request: PasswordResetRequest = {
        id: generateId(),
        userId,
        token,
        expiresAt,
      };
      passwordResetRequests.set(token, request);
      return request;
    },

    async getPasswordResetRequest(token: string): Promise<PasswordResetRequest | null> {
      return passwordResetRequests.get(token) || null;
    },

    async markPasswordResetUsed(token: string): Promise<void> {
      const request = passwordResetRequests.get(token);
      if (request) {
        request.usedAt = new Date();
      }
    },

    async createEmailVerification(
      userId: string,
      email: string,
      token: string,
      expiresAt: Date
    ): Promise<EmailVerificationRequest> {
      const request: EmailVerificationRequest = {
        id: generateId(),
        userId,
        email,
        token,
        expiresAt,
      };
      emailVerifications.set(token, request);
      return request;
    },

    async getEmailVerification(token: string): Promise<EmailVerificationRequest | null> {
      return emailVerifications.get(token) || null;
    },

    async markEmailVerified(userId: string): Promise<void> {
      const user = users.get(userId);
      if (user) {
        user.emailVerifiedAt = new Date();
        if (user.status === 'pending') {
          user.status = 'active';
        }
        user.updatedAt = new Date();
      }
    },
  };
}

/**
 * 创建用户仓库的工厂函数
 */
export function createInMemoryUserRepository(): UserRepository {
  return createUserRepository();
}
