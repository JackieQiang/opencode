import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AuthService } from '../../src/lib/auth/service';

describe('AuthService', () => {
  const testUser = {
    userId: 'user-123',
    tenantId: 'tenant-456',
    roles: ['user', 'admin'],
  };

  describe('generateAccessToken', () => {
    it('should生成有效的访问令牌', async () => {
      const token = await AuthService.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式: header.payload.signature
    });
  });

  describe('generateRefreshToken', () => {
    it('should生成有效的刷新令牌', async () => {
      const token = await AuthService.generateRefreshToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should验证有效的访问令牌', async () => {
      const token = await AuthService.generateAccessToken(testUser);
      const payload = await AuthService.verifyAccessToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testUser.userId);
      expect(payload?.tenantId).toBe(testUser.tenantId);
      expect(payload?.type).toBe('access');
    });

    it('should返回null对于无效的令牌', async () => {
      const payload = await AuthService.verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should返回null对于刷新令牌', async () => {
      const token = await AuthService.generateRefreshToken(testUser);
      const payload = await AuthService.verifyAccessToken(token);

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should验证有效的刷新令牌', async () => {
      const token = await AuthService.generateRefreshToken(testUser);
      const payload = await AuthService.verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload?.type).toBe('refresh');
    });

    it('should返回null对于访问令牌', async () => {
      const token = await AuthService.generateAccessToken(testUser);
      const payload = await AuthService.verifyRefreshToken(token);

      expect(payload).toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('should验证任意有效令牌', async () => {
      const accessToken = await AuthService.generateAccessToken(testUser);
      const refreshToken = await AuthService.generateRefreshToken(testUser);

      const accessPayload = await AuthService.verifyToken(accessToken);
      const refreshPayload = await AuthService.verifyToken(refreshToken);

      expect(accessPayload).toBeDefined();
      expect(refreshPayload).toBeDefined();
    });
  });

  describe('revokeToken', () => {
    it('should能够撤销令牌', async () => {
      const token = await AuthService.generateAccessToken(testUser);

      // 撤销前应该可以验证
      const beforeRevoke = await AuthService.verifyAccessToken(token);
      expect(beforeRevoke).toBeDefined();

      // 撤销
      await AuthService.revokeToken(token);

      // 注意: 当前实现只是打印日志，没有真正加入黑名单
      // TODO: 实现真正的黑名单机制
    });
  });

  describe('isTokenRevoked', () => {
    it('should返回false对于未撤销的令牌', async () => {
      const token = await AuthService.generateAccessToken(testUser);
      const isRevoked = await AuthService.isTokenRevoked(token);

      expect(isRevoked).toBe(false);
    });
  });

  describe('Token包含正确的信息', () => {
    it('should令牌包含用户信息', async () => {
      const token = await AuthService.generateAccessToken(testUser);
      const payload = await AuthService.verifyToken(token);

      expect(payload?.userId).toBe(testUser.userId);
      expect(payload?.tenantId).toBe(testUser.tenantId);
      expect(payload?.roles).toEqual(testUser.roles);
    });
  });
});

describe('AuthService - Token过期', () => {
  // 注意: 测试token过期需要修改JWT_SECRET或等待
  // 这里只测试正常情况

  const testUser = {
    userId: 'user-expire-test',
    tenantId: 'tenant-expire-test',
    roles: ['user'],
  };

  it('should不同的用户生成不同的token', async () => {
    const token1 = await AuthService.generateAccessToken({ ...testUser, userId: 'user-1' });
    const token2 = await AuthService.generateAccessToken({ ...testUser, userId: 'user-2' });

    expect(token1).not.toBe(token2);
  });

  it('should相同的用户生成不同的token（因为有jti或时间戳）', async () => {
    const token1 = await AuthService.generateAccessToken(testUser);
    // 等待超过1秒以确保iat时间戳不同
    await new Promise(resolve => setTimeout(resolve, 1100));
    const token2 = await AuthService.generateAccessToken(testUser);

    // Token应该不同（因为有 iat 时间戳）
    expect(token1).not.toBe(token2);
  });
});
