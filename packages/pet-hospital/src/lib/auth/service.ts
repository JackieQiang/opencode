import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// JWT 配置
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key'
);

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Token 类型
export interface TokenPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  type: 'access' | 'refresh';
}

/**
 * Auth Service
 *
 * 提供 JWT Token 生成和验证功能
 *
 * 待实现：
 * - RS256 非对称签名
 * - Token 撤销机制（黑名单）
 * - 多设备管理
 */
export class AuthService {
  /**
   * 生成访问令牌
   */
  static async generateAccessToken(payload: {
    userId: string;
    tenantId: string;
    roles: string[];
  }): Promise<string> {
    return new SignJWT({ ...payload, type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * 生成刷新令牌
   */
  static async generateRefreshToken(payload: {
    userId: string;
    tenantId: string;
    roles: string[];
  }): Promise<string> {
    return new SignJWT({ ...payload, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * 验证 Token
   */
  static async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * 验证访问令牌
   */
  static async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    const payload = await this.verifyToken(token);
    if (!payload || payload.type !== 'access') {
      return null;
    }
    return payload;
  }

  /**
   * 验证刷新令牌
   */
  static async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    const payload = await this.verifyToken(token);
    if (!payload || payload.type !== 'refresh') {
      return null;
    }
    return payload;
  }

  /**
   * Token 撤销（加入黑名单）
   * TODO: 实现 Redis/数据库存储黑名单
   */
  static async revokeToken(token: string): Promise<void> {
    // TODO: 将 token 加入黑名单
    console.log('Token revoked:', token.substring(0, 20) + '...');
  }

  /**
   * 检查 Token 是否在黑名单中
   * TODO: 实现黑名单检查
   */
  static async isTokenRevoked(token: string): Promise<boolean> {
    // TODO: 检查 token 是否在黑名单中
    return false;
  }
}
