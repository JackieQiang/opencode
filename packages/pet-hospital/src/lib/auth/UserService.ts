/**
 * 用户服务 - 负责用户管理的业务逻辑
 */

import {
  User,
  CreateUserParams,
  UpdateUserParams,
  UserQueryOptions,
  UserListResult,
  LoginRecord,
  UserStatus,
} from './User';
import {
  UserRepository,
  createInMemoryUserRepository,
} from './UserRepository';

export interface UserService {
  // 用户 CRUD
  createUser(params: CreateUserParams): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getUsersByTenant(tenantId: string, options?: Omit<UserQueryOptions, 'tenantId'>): Promise<UserListResult>;
  queryUsers(options: UserQueryOptions): Promise<UserListResult>;
  updateUser(id: string, updates: UpdateUserParams): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // 密码管理
  setPassword(userId: string, password: string): Promise<void>;
  validatePassword(userId: string, password: string): Promise<boolean>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>;

  // 用户状态管理
  activateUser(userId: string): Promise<void>;
  deactivateUser(userId: string): Promise<void>;
  suspendUser(userId: string, reason?: string): Promise<void>;
  unlockUser(userId: string): Promise<void>;

  // 角色管理
  assignRoles(userId: string, roles: string[]): Promise<void>;
  removeRoles(userId: string, roles: string[]): Promise<void>;
  replaceRoles(userId: string, roles: string[]): Promise<void>;

  // 登录记录
  recordLogin(userId: string, ip: string, userAgent: string, success: boolean, failureReason?: string): Promise<void>;
  getLoginHistory(userId: string, limit?: number): Promise<LoginRecord[]>;

  // 检查锁定状态
  isLocked(userId: string): Promise<boolean>;
}

// 密码服务接口
export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

// 简单的密码服务实现
// TODO: 生产环境应使用 bcrypt 或 argon2
function createSimplePasswordService(): PasswordService {
  return {
    async hash(password: string): Promise<string> {
      // 简单实现：base64 编码 + 前缀
      // 生产环境请使用真正的哈希算法
      const encoder = new TextEncoder();
      const data = encoder.encode(password + 'salt_pet_hospital');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode(...hashArray));
      return `sha256:${hashBase64}`;
    },

    async verify(password: string, hash: string): Promise<boolean> {
      if (!hash.startsWith('sha256:')) {
        return false;
      }
      const newHash = await this.hash(password);
      return newHash === hash;
    },
  };
}

/**
 * 创建用户服务的工厂函数
 */
export function createUserService(
  repository?: UserRepository,
  passwordService?: PasswordService
): UserService {
  const repo = repository || createInMemoryUserRepository();
  const passwordSvc = passwordService || createSimplePasswordService();

  return {
    async createUser(params: CreateUserParams): Promise<User> {
      // 检查用户名是否已存在
      const existingUser = await repo.getByUsername(params.username);
      if (existingUser) {
        throw new Error(`Username already exists: ${params.username}`);
      }

      // 检查邮箱是否已存在
      if (params.email) {
        const existingEmail = await repo.getByEmail(params.email);
        if (existingEmail) {
          throw new Error(`Email already exists: ${params.email}`);
        }
      }

      // 检查手机号是否已存在
      if (params.phone) {
        const existingPhone = await repo.getByPhone(params.phone);
        if (existingPhone) {
          throw new Error(`Phone already exists: ${params.phone}`);
        }
      }

      // 哈希密码
      const passwordHash = await passwordSvc.hash(params.password);

      // 创建用户
      const user = await repo.create(params, passwordHash);

      return user;
    },

    async getUserById(id: string): Promise<User | null> {
      return repo.getById(id);
    },

    async getUserByUsername(username: string): Promise<User | null> {
      return repo.getByUsername(username);
    },

    async getUserByEmail(email: string): Promise<User | null> {
      return repo.getByEmail(email);
    },

    async getUsersByTenant(
      tenantId: string,
      options?: Omit<UserQueryOptions, 'tenantId'>
    ): Promise<UserListResult> {
      return repo.query({ ...options, tenantId });
    },

    async queryUsers(options: UserQueryOptions): Promise<UserListResult> {
      return repo.query(options);
    },

    async updateUser(id: string, updates: UpdateUserParams): Promise<User> {
      const user = await repo.update(id, updates);
      if (!user) {
        throw new Error(`User not found: ${id}`);
      }
      return user;
    },

    async deleteUser(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    async setPassword(userId: string, password: string): Promise<void> {
      const passwordHash = await passwordSvc.hash(password);
      await repo.updatePasswordHash(userId, passwordHash);
    },

    async validatePassword(userId: string, password: string): Promise<boolean> {
      const passwordHash = await repo.getPasswordHash(userId);
      if (!passwordHash) {
        return false;
      }
      return passwordSvc.verify(password, passwordHash);
    },

    async changePassword(
      userId: string,
      oldPassword: string,
      newPassword: string
    ): Promise<boolean> {
      const isValid = await this.validatePassword(userId, oldPassword);
      if (!isValid) {
        return false;
      }
      await this.setPassword(userId, newPassword);
      return true;
    },

    async activateUser(userId: string): Promise<void> {
      await repo.updateStatus(userId, 'active');
    },

    async deactivateUser(userId: string): Promise<void> {
      await repo.updateStatus(userId, 'inactive');
    },

    async suspendUser(userId: string, _reason?: string): Promise<void> {
      await repo.updateStatus(userId, 'suspended');
    },

    async unlockUser(userId: string): Promise<void> {
      await repo.clearLockedUntil(userId);
      await repo.resetLoginAttempts(userId);
    },

    async assignRoles(userId: string, roles: string[]): Promise<void> {
      await repo.assignRoles(userId, roles);
    },

    async removeRoles(userId: string, roles: string[]): Promise<void> {
      await repo.removeRoles(userId, roles);
    },

    async replaceRoles(userId: string, roles: string[]): Promise<void> {
      const user = await repo.getUserById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // 获取需要添加和移除的角色
      const currentRoles = new Set(user.roles);
      const newRoles = new Set(roles);

      const toAdd = roles.filter(r => !currentRoles.has(r));
      const toRemove = user.roles.filter(r => !newRoles.has(r));

      if (toAdd.length > 0) {
        await repo.assignRoles(userId, toAdd);
      }
      if (toRemove.length > 0) {
        await repo.removeRoles(userId, toRemove);
      }
    },

    async recordLogin(
      userId: string,
      ip: string,
      userAgent: string,
      success: boolean,
      failureReason?: string
    ): Promise<void> {
      await repo.addLoginRecord({
        userId,
        ip,
        userAgent,
        timestamp: new Date(),
        success,
        failureReason,
      });

      if (success) {
        await repo.resetLoginAttempts(userId);
        await repo.clearLockedUntil(userId);
        // 更新最后登录时间
        const user = await repo.getUserById(userId);
        if (user) {
          await repo.update(userId, { lastLoginAt: new Date() });
        }
      } else {
        const attempts = await repo.incrementLoginAttempts(userId);
        // 锁定账户：5 次失败后锁定 15 分钟
        if (attempts >= 5) {
          const lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await repo.setLockedUntil(userId, lockUntil);
        }
      }
    },

    async getLoginHistory(userId: string, limit: number = 10): Promise<LoginRecord[]> {
      return repo.getLoginHistory(userId, limit);
    },

    async isLocked(userId: string): Promise<boolean> {
      const user = await repo.getById(userId);
      if (!user) {
        return false;
      }
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return true;
      }
      return false;
    },
  };
}
