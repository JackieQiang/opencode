/**
 * 认证 API 路由
 */

import { Hono } from 'hono';
import {
  createUserService,
  createPasswordService,
  createJWTService,
  createAuthService,
  createRoleService,
  createInMemoryUserRepository,
  getConfig,
} from '../../lib/auth';

export function createAuthRoutes() {
  const route = new Hono();

  // 初始化服务
  const userRepo = createInMemoryUserRepository();
  const passwordService = createPasswordService();
  const jwtService = createJWTService();
  const userService = createUserService(userRepo, passwordService);
  const roleService = createRoleService();
  const authService = createAuthService(userService, jwtService);

  // 注册
  route.post('/register', async (c) => {
    try {
      const body = await c.req.json();
      const { tenantId, username, email, phone, password } = body;

      if (!tenantId || !username || !password) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const result = await authService.register({
        tenantId,
        username,
        email,
        phone,
        password,
      });

      // 初始化租户角色
      await roleService.initializeTenantRoles(tenantId);

      return c.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 登录
  route.post('/login', async (c) => {
    try {
      const body = await c.req.json();
      const { username, password } = body;

      if (!username || !password) {
        return c.json({ error: 'Username and password required' }, 400);
      }

      const result = await authService.login({
        username,
        password,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });

      return c.json({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 401);
    }
  });

  // 刷新 Token
  route.post('/refresh', async (c) => {
    try {
      const body = await c.req.json();
      const { refreshToken } = body;

      if (!refreshToken) {
        return c.json({ error: 'Refresh token required' }, 400);
      }

      const result = await authService.refreshToken(refreshToken);

      return c.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 401);
    }
  });

  // 登出
  route.post('/logout', async (c) => {
    const authHeader = c.req.header('authorization');
    const token = authHeader?.replace('Bearer ', '');

    await authService.logout('', token);

    return c.json({ message: 'Logged out successfully' });
  });

  // 忘记密码
  route.post('/forgot-password', async (c) => {
    try {
      const body = await c.req.json();
      const { email } = body;

      if (!email) {
        return c.json({ error: 'Email required' }, 400);
      }

      await authService.forgotPassword(email);

      // 为了安全，不透露用户是否存在
      return c.json({ message: 'If the email exists, a reset link will be sent' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 500);
    }
  });

  // 重置密码
  route.post('/reset-password', async (c) => {
    try {
      const body = await c.req.json();
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        return c.json({ error: 'Token and new password required' }, 400);
      }

      await authService.resetPassword(token, newPassword);

      return c.json({ message: 'Password reset successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  return route;
}
