/**
 * 角色管理 API 路由
 */

import { Hono } from 'hono';
import {
  createRoleService,
} from '../../lib/auth';

export function createRoleRoutes() {
  const route = new Hono();

  // 初始化服务
  const roleService = createRoleService();

  // 获取角色列表
  route.get('/', async (c) => {
    const tenantId = c.req.query('tenantId');
    const isSystem = c.req.query('isSystem');
    const search = c.req.query('search');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await roleService.getAllRoles({
      tenantId: tenantId || undefined,
      isSystem: isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
      search,
      limit,
      offset,
    });

    return c.json(result);
  });

  // 获取所有权限定义
  route.get('/permissions', async (c) => {
    const permissions = roleService.getAllPermissions();
    return c.json(permissions);
  });

  // 获取系统角色
  route.get('/system', async (c) => {
    const roles = await roleService.getSystemRoles();
    return c.json(roles);
  });

  // 获取租户角色
  route.get('/tenant/:tenantId', async (c) => {
    const tenantId = c.req.param('tenantId');
    const roles = await roleService.getRolesByTenant(tenantId);
    return c.json(roles);
  });

  // 获取角色详情
  route.get('/:id', async (c) => {
    const roleId = c.req.param('id');

    const role = await roleService.getRoleById(roleId);
    if (!role) {
      return c.json({ error: 'Role not found' }, 404);
    }

    return c.json(role);
  });

  // 创建角色
  route.post('/', async (c) => {
    try {
      const body = await c.req.json();
      const { tenantId, name, displayName, description, permissions, mcpPermissions, skillPermissions, isDefault } = body;

      if (!tenantId || !name || !displayName) {
        return c.json({ error: 'Missing required fields' }, 400);
      }

      const role = await roleService.createRole({
        tenantId,
        name,
        displayName,
        description,
        permissions,
        mcpPermissions,
        skillPermissions,
        isDefault,
      });

      return c.json(role, 201);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 更新角色
  route.patch('/:id', async (c) => {
    try {
      const roleId = c.req.param('id');
      const body = await c.req.json();

      const role = await roleService.updateRole(roleId, body);

      return c.json(role);
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 删除角色
  route.delete('/:id', async (c) => {
    const roleId = c.req.param('id');

    try {
      const deleted = await roleService.deleteRole(roleId);
      if (!deleted) {
        return c.json({ error: 'Role not found' }, 404);
      }

      return c.json({ message: 'Role deleted successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 分配权限
  route.put('/:id/permissions', async (c) => {
    try {
      const roleId = c.req.param('id');
      const body = await c.req.json();
      const { permissions } = body;

      if (!Array.isArray(permissions)) {
        return c.json({ error: 'Permissions must be an array' }, 400);
      }

      await roleService.assignPermissions(roleId, permissions);

      return c.json({ message: 'Permissions updated successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 分配 MCP 权限
  route.put('/:id/mcp-permissions', async (c) => {
    try {
      const roleId = c.req.param('id');
      const body = await c.req.json();
      const { mcpPermissions } = body;

      if (!Array.isArray(mcpPermissions)) {
        return c.json({ error: 'MCP permissions must be an array' }, 400);
      }

      await roleService.assignMCPPermissions(roleId, mcpPermissions);

      return c.json({ message: 'MCP permissions updated successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 分配 Skill 权限
  route.put('/:id/skill-permissions', async (c) => {
    try {
      const roleId = c.req.param('id');
      const body = await c.req.json();
      const { skillPermissions } = body;

      if (!Array.isArray(skillPermissions)) {
        return c.json({ error: 'Skill permissions must be an array' }, 400);
      }

      await roleService.assignSkillPermissions(roleId, skillPermissions);

      return c.json({ message: 'Skill permissions updated successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  // 初始化租户角色
  route.post('/tenant/:tenantId/init', async (c) => {
    try {
      const tenantId = c.req.param('tenantId');

      await roleService.initializeTenantRoles(tenantId);

      return c.json({ message: 'Tenant roles initialized successfully' });
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  });

  return route;
}
