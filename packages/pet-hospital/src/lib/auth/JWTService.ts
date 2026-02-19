/**
 * JWT 服务 - 负责 JWT Token 的生成和验证
 */

import * as jose from 'jose';
import { User } from './User';
import { getConfig } from './Config';

export interface JWTPayload {
  sub: string;        // userId
  tenantId: string;
  username: string;
  roles: string[];
  permissions: string[];
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  jti: string;       // token id for revocation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTService {
  // 生成 Token
  generateAccessToken(user: User, tenantId: string, permissions: string[]): Promise<string>;
  generateRefreshToken(user: User): Promise<string>;
  generateTokenPair(user: User, tenantId: string, permissions: string[]): Promise<TokenPair>;

  // 验证 Token
  verifyAccessToken(token: string): Promise<JWTPayload>;
  verifyRefreshToken(token: string): Promise<JWTPayload>;

  // 解析 Token
  decodeToken(token: string): Promise<JWTPayload | null>;

  // Token 黑名单
  addToBlacklist(tokenId: string, expiresAt: Date): void;
  isBlacklisted(tokenId: string): boolean;
}

// 生成 Token ID
function generateJTI(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 创建 JWT 服务的工厂函数
 */
export function createJWTService(secret?: string): JWTService {
  // 使用提供的密钥或从配置获取
  const config = getConfig();
  const secretKey = secret
    ? new TextEncoder().encode(secret)
    : new TextEncoder().encode(config.jwt.secret);

  const accessTokenExpiry = config.jwt.accessTokenExpiry;
  const refreshTokenExpiry = config.jwt.refreshTokenExpiry;

  // Token 黑名单
  const blacklist = new Map<string, Date>();

  // 清理过期的黑名单条目
  if (typeof setInterval !== 'undefined') {
    setInterval(() => {
      const now = new Date();
      for (const [jti, expiresAt] of blacklist.entries()) {
        if (expiresAt < now) {
          blacklist.delete(jti);
        }
      }
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  return {
    async generateAccessToken(user: User, tenantId: string, permissions: string[]): Promise<string> {
      const jti = generateJTI();
      const payload = {
        sub: user.id,
        tenantId,
        username: user.username,
        roles: user.roles,
        permissions,
        type: 'access',
        jti,
      };

      const jwt = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(accessTokenExpiry)
        .setJti(jti);

      return jwt.sign(secretKey);
    },

    async generateRefreshToken(user: User): Promise<string> {
      const jti = generateJTI();
      const payload = {
        sub: user.id,
        type: 'refresh',
        jti,
      };

      const jwt = new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(refreshTokenExpiry)
        .setJti(jti);

      return jwt.sign(secretKey);
    },

    async generateTokenPair(user: User, tenantId: string, permissions: string[]): Promise<TokenPair> {
      const accessToken = await this.generateAccessToken(user, tenantId, permissions);
      const refreshToken = await this.generateRefreshToken(user);

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600, // access token 过期时间（秒）
      };
    },

    async verifyAccessToken(token: string): Promise<JWTPayload> {
      const { payload } = await jose.jwtVerify(token, secretKey);

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // 检查黑名单
      if (payload.jti && this.isBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      return payload as unknown as JWTPayload;
    },

    async verifyRefreshToken(token: string): Promise<JWTPayload> {
      const { payload } = await jose.jwtVerify(token, secretKey);

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // 检查黑名单
      if (payload.jti && this.isBlacklisted(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      return payload as unknown as JWTPayload;
    },

    async decodeToken(token: string): Promise<JWTPayload | null> {
      try {
        const result = await jose.jwtDecrypt(token, secretKey, {
          clockTolerance: 30, // 允许 30 秒时钟偏差
        });
        return result.payload as unknown as JWTPayload;
      } catch {
        return null;
      }
    },

    addToBlacklist(tokenId: string, expiresAt: Date): void {
      blacklist.set(tokenId, expiresAt);
    },

    isBlacklisted(tokenId: string): boolean {
      const expiresAt = blacklist.get(tokenId);
      if (!expiresAt) return false;
      if (expiresAt < new Date()) {
        blacklist.delete(tokenId);
        return false;
      }
      return true;
    },
  };
}
