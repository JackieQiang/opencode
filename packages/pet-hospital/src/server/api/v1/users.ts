/**
 * 用户管理 API 路由
 */

import { Hono } from 'hono';
import {
  createUserService,
  createPasswordService,
  createInMemoryUserRepository,
} from '../../lib/auth';

export function createUserRoutes() {
  const route = new Hono();

  // 初始化服务
  const userRepo = createInMemoryUserRepository();
  const passwordService = createPasswordService();
  const userService = createUserService(userRepo, passwordService);

  // 获取当前用户信息
  route.get('/me', async (c) => {
    // TODO: 从 JWT token 获取用户 ID
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  });

  // 获取用户列表
  route.get('/', async (c) => {
    const tenantId = c.req.query('tenantId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search');

    const result = await userService.getUsersByTenant(tenantId!, {
      limit,
      offset,
      search,
    });

    return c.json(result);
  });

  // 获取用户详情
  route.get('/:id', async (c) => {
    const userId = c.req.param('id');

    const user = await userService.getUserById(userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  });

  // 创建用户
  route.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { tenantId, username, email, phone, password, roles, displayName, department } = body;

      if (!tenantId || !username || !password) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const user = await userService.createUser({
        tenantId,
        username,
        email,
        phone,
        password,
        roles,
        displayName,
        department,
      });

      return c.json(user, 201);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 更新用户
  route.patch('/:id', async (c) => {
    try {
      const userId = c.req.param('id');
      const body = await c.req.json();

      const user = await userService.updateUser(userId, body);

      return c.json(user);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 删除用户
  route.delete('/:id', async (c) => {
    const userId = c.req.param('id');

    const deleted = await userService.deleteUser(userId);
    if (!deleted) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully' });
  });

  // 分配角色
  route.put('/:id/roles', async (c) => {
    try {
      const userId = c.req.param('id');
      const body = await c.req.json();
      const { roles } = body;

      if (!Array.isArray(roles)) {
        return c.json({ error: 'Roles must be an array' }, 400);
      }

      await userService.replaceRoles(userId, roles);

      return c.json({ message: 'Roles updated successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 修改用户状态
  route.patch('/:id/status', async (c) => {
    try {
      const userId = c.req.param('id');
      const body = await c.req.json();
      const { status } = body;

      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return c.json({ error: 'Invalid status' }, 400);
      }

      if (status === 'active') {
        await userService.activateUser(userId);
      } else if (status === 'inactive') {
        await userService.deactivateUser(userId);
      } else {
        await userService.suspendUser(userId);
      }

      return c.json({ message: 'Status updated successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 修改密码
  route.post('/change-password', async (c) => {
    try {
      const body = await c.req.json();
      const { userId, oldPassword, newPassword } = body;

      if (!userId || !oldPassword || !newPassword) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const success = await userService.changePassword(userId, oldPassword, newPassword);
      if (!success) {
        return c.json({ error: 'Invalid old password' }, 400);
      }

      return c.json({ message: 'Password changed successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 获取登录历史
  route.get('/:id/login-history', async (c) => {
    const userId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '10');

    const history = await userService.getLoginHistory(userId, limit);

    return c.json(history);
  });

  return route;
}
