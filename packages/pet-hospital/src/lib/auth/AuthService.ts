/**
 * 认证服务 - 负责用户注册、登录、登出等认证逻辑
 */

import {
  User,
  CreateUserParams,
} from './User';
import { UserService } from './UserService';
import { JWTService, TokenPair } from './JWTService';

// 注册参数
export interface RegisterParams {
  tenantId: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
}

// 登录参数
export interface LoginParams {
  username: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

// 认证结果
export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 会话信息
export interface Session {
  id: string;
  userId: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

// Token 存储（内存实现）
interface TokenStore {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthService {
  // 注册登录
  register(params: RegisterParams): Promise<AuthResult>;
  login(params: LoginParams): Promise<AuthResult>;
  logout(userId: string, accessToken?: string): Promise<void>;

  // Token 管理
  refreshToken(refreshToken: string): Promise<TokenPair>;
  revokeToken(accessToken: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;

  // 密码管理
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;

  // 会话管理
  getActiveSessions(userId: string): Promise<Session[]>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
}

/**
 * 创建认证服务的工厂函数
 */
export function createAuthService(
  userService: UserService,
  jwtService: JWTService
): AuthService {
  // 内存存储 Token（生产环境应使用 Redis）
  const tokenStore = new Map<string, TokenStore>();  // accessToken -> store

  // 清理过期 Token
  setInterval(() => {
    const now = new Date();
    for (const [token, store] of tokenStore.entries()) {
      if (store.expiresAt < now) {
        tokenStore.delete(token);
      }
    }
  }, 60 * 60 * 1000); // 每小时清理

  return {
    async register(params: RegisterParams): Promise<AuthResult> {
      // 检查用户名是否已存在
      const existingUser = await userService.getUserByUsername(params.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // 检查邮箱是否已存在
      if (params.email) {
        const existingEmail = await userService.getUserByEmail(params.email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // 创建用户
      const createParams: CreateUserParams = {
        tenantId: params.tenantId,
        username: params.username,
        email: params.email,
        phone: params.phone,
        password: params.password,
        roles: ['pet_owner'], // 默认角色
      };

      const user = await userService.createUser(createParams);

      // 生成 Token
      const tokenPair = jwtService.generateTokenPair(user, params.tenantId, []);

      // 存储 Token
      tokenStore.set(tokenPair.accessToken, {
        userId: user.id,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1000),
      });

      return {
        user,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };
    },

    async login(params: LoginParams): Promise<AuthResult> {
      // 查找用户（支持用户名或邮箱）
      let user = await userService.getUserByUsername(params.username);
      if (!user && params.username.includes('@')) {
        user = await userService.getUserByEmail(params.username);
      }

      if (!user) {
        // 记录失败的登录尝试
        await userService.recordLogin(
          '',
          params.ip || 'unknown',
          params.userAgent || 'unknown',
          false,
          'User not found'
        );
        throw new Error('Invalid credentials');
      }

      // 检查用户状态
      if (user.status === 'suspended') {
        await userService.recordLogin(
          user.id,
          params.ip || 'unknown',
          params.userAgent || 'unknown',
          false,
          'Account suspended'
        );
        throw new Error('Account is suspended');
      }

      if (user.status === 'inactive') {
        await userService.recordLogin(
          user.id,
          params.ip || 'unknown',
          params.userAgent || 'unknown',
          false,
          'Account inactive'
        );
        throw new Error('Account is inactive');
      }

      // 检查锁定状态
      const isLocked = await userService.isLocked(user.id);
      if (isLocked) {
        await userService.recordLogin(
          user.id,
          params.ip || 'unknown',
          params.userAgent || 'unknown',
          false,
          'Account locked'
        );
        throw new Error('Account is locked. Please try again later.');
      }

      // 验证密码
      const isValid = await userService.validatePassword(user.id, params.password);
      if (!isValid) {
        await userService.recordLogin(
          user.id,
          params.ip || 'unknown',
          params.userAgent || 'unknown',
          false,
          'Invalid password'
        );
        throw new Error('Invalid credentials');
      }

      // 记录成功登录
      await userService.recordLogin(
        user.id,
        params.ip || 'unknown',
        params.userAgent || 'unknown',
        true
      );

      // 获取最新的用户信息
      const freshUser = await userService.getUserById(user.id);
      if (!freshUser) {
        throw new Error('User not found');
      }

      // 生成 Token
      const tokenPair = jwtService.generateTokenPair(freshUser, freshUser.tenantId, []);

      // 存储 Token
      tokenStore.set(tokenPair.accessToken, {
        userId: freshUser.id,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1000),
      });

      return {
        user: freshUser,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn,
      };
    },

    async logout(userId: string, accessToken?: string): Promise<void> {
      if (accessToken) {
        tokenStore.delete(accessToken);
      }

      // 如果提供了 userId，撤销所有该用户的 Token
      if (userId) {
        for (const [token, store] of tokenStore.entries()) {
          if (store.userId === userId) {
            tokenStore.delete(token);
          }
        }
      }
    },

    async refreshToken(refreshToken: string): Promise<TokenPair> {
      // 验证 refresh token
      const payload = await jwtService.verifyRefreshToken(refreshToken);

      // 获取用户信息
      const user = await userService.getUserById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // 检查用户状态
      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }

      // 生成新的 Token 对
      const tokenPair = jwtService.generateTokenPair(user, user.tenantId, []);

      // 存储新 Token
      tokenStore.set(tokenPair.accessToken, {
        userId: user.id,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: new Date(Date.now() + tokenPair.expiresIn * 1000),
      });

      return tokenPair;
    },

    async revokeToken(accessToken: string): Promise<void> {
      tokenStore.delete(accessToken);
    },

    async revokeAllUserTokens(userId: string): Promise<void> {
      for (const [token, store] of tokenStore.entries()) {
        if (store.userId === userId) {
          tokenStore.delete(token);
        }
      }
    },

    async forgotPassword(email: string): Promise<void> {
      // 查找用户
      const user = await userService.getUserByEmail(email);
      if (!user) {
        // 为了安全，不透露用户是否存在
        return;
      }

      // TODO: 发送重置邮件
      // 在实际实现中，应该：
      // 1. 生成重置 Token
      // 2. 发送包含重置链接的邮件
      // 3. 存储 Token 到数据库（带过期时间）
      console.log(`Password reset requested for user: ${user.username}`);
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      // TODO: 实现密码重置
      // 在实际实现中，应该：
      // 1. 验证 Token
      // 2. 检查 Token 是否已使用
      // 3. 更新用户密码
      // 4. 标记 Token 已使用
      console.log(`Password reset with token: ${token}`);
    },

    async changePassword(
      userId: string,
      oldPassword: string,
      newPassword: string
    ): Promise<void> {
      const success = await userService.changePassword(userId, oldPassword, newPassword);
      if (!success) {
        throw new Error('Invalid old password');
      }
    },

    async getActiveSessions(userId: string): Promise<Session[]> {
      const sessions: Session[] = [];

      for (const [token, store] of tokenStore.entries()) {
        if (store.userId === userId && store.expiresAt > new Date()) {
          sessions.push({
            id: token.substring(0, 8),
            userId,
            ip: 'unknown',
            userAgent: 'unknown',
            createdAt: new Date(store.expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000), // 估算
            expiresAt: store.expiresAt,
          });
        }
      }

      return sessions;
    },

    async revokeSession(userId: string, sessionId: string): Promise<void> {
      for (const [token, store] of tokenStore.entries()) {
        if (store.userId === userId && token.startsWith(sessionId)) {
          tokenStore.delete(token);
        }
      }
    },
  };
}
