/**
 * 角色服务 - 负责角色管理的业务逻辑
 */

import {
  Role,
  Permission,
  CreateRoleParams,
  UpdateRoleParams,
  RoleQueryOptions,
  PERMISSIONS,
  PERMISSION_MAP,
  SYSTEM_ROLES,
  createTenantRoles,
} from './Role';
import { User } from './User';

// 角色仓库接口
export interface RoleRepository {
  create(role: Role): Promise<Role>;
  getById(id: string): Promise<Role | null>;
  getByName(name: string, tenantId?: string): Promise<Role | null>;
  query(options: RoleQueryOptions): Promise<{ roles: Role[]; total: number }>;
  update(id: string, updates: Partial<Role>): Promise<Role | null>;
  delete(id: string): Promise<boolean>;
  initializeForTenant(tenantId: string): Promise<void>;
}

// 内存实现的角色仓库
export function createRoleRepository(): RoleRepository {
  const roles = new Map<string, Role>();

  // 初始化系统角色
  SYSTEM_ROLES.forEach(role => {
    roles.set(role.id, role);
  });

  return {
    async create(role: Role): Promise<Role> {
      roles.set(role.id, role);
      return role;
    },

    async getById(id: string): Promise<Role | null> {
      return roles.get(id) || null;
    },

    async getByName(name: string, tenantId?: string): Promise<Role | null> {
      for (const role of roles.values()) {
        if (role.name === name) {
          if (tenantId === undefined || role.tenantId === tenantId || role.tenantId === null) {
            return role;
          }
        }
      }
      return null;
    },

    async query(options: RoleQueryOptions): Promise<{ roles: Role[]; total: number }> {
      let result = Array.from(roles.values());

      if (options.tenantId !== undefined) {
        result = result.filter(r => r.tenantId === options.tenantId);
      }

      if (options.isSystem !== undefined) {
        result = result.filter(r => r.isSystem === options.isSystem);
      }

      if (options.isDefault !== undefined) {
        result = result.filter(r => r.isDefault === options.isDefault);
      }

      if (options.search) {
        const search = options.search.toLowerCase();
        result = result.filter(r =>
          r.name.toLowerCase().includes(search) ||
          r.displayName.toLowerCase().includes(search) ||
          r.description?.toLowerCase().includes(search)
        );
      }

      const total = result.length;
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      result = result.slice(offset, offset + limit);

      return { roles: result, total };
    },

    async update(id: string, updates: Partial<Role>): Promise<Role | null> {
      const role = roles.get(id);
      if (!role) return null;

      const updated: Role = {
        ...role,
        ...updates,
        updatedAt: new Date(),
      };

      roles.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const role = roles.get(id);
      if (!role) return false;
      if (role.isSystem) {
        throw new Error('Cannot delete system role');
      }
      return roles.delete(id);
    },

    async initializeForTenant(tenantId: string): Promise<void> {
      const tenantRoles = createTenantRoles(tenantId);
      for (const role of tenantRoles) {
        roles.set(role.id, role);
      }
    },
  };
}

// 角色服务接口
export interface RoleService {
  // 角色 CRUD
  createRole(params: CreateRoleParams): Promise<Role>;
  getRoleById(id: string): Promise<Role | null>;
  getRoleByName(name: string, tenantId?: string): Promise<Role | null>;
  getRolesByTenant(tenantId: string): Promise<Role[]>;
  getSystemRoles(): Promise<Role[]>;
  getAllRoles(options?: RoleQueryOptions): Promise<{ roles: Role[]; total: number }>;
  updateRole(id: string, updates: UpdateRoleParams): Promise<Role>;
  deleteRole(id: string): Promise<boolean>;

  // 权限管理
  assignPermissions(roleId: string, permissions: string[]): Promise<void>;
  removePermissions(roleId: string, permissions: string[]): Promise<void>;

  // MCP/Skill 权限
  assignMCPPermissions(roleId: string, mcpTools: string[]): Promise<void>;
  assignSkillPermissions(roleId: string, skills: string[]): Promise<void>;

  // 用户角色
  getUsersInRole(roleId: string): Promise<User[]>;
  getRolesForUser(userId: string): Promise<Role[]>;

  // 权限检查
  hasPermission(roleId: string, permission: string): Promise<boolean>;
  hasMCPAccess(roleId: string, toolName: string): Promise<boolean>;
  hasSkillAccess(roleId: string, skillName: string): Promise<boolean>;

  // 权限计算（合并用户所有角色的权限）
  calculateEffectivePermissions(user: User): Promise<string[]>;
  calculateEffectiveMCPPermissions(user: User): Promise<string[]>;
  calculateEffectiveSkillPermissions(user: User): Promise<string[]>;

  // 初始化租户角色
  initializeTenantRoles(tenantId: string): Promise<void>;

  // 获取所有权限定义
  getAllPermissions(): Permission[];
}

// 角色服务实现
export function createRoleService(
  repository?: RoleRepository
): RoleService {
  const repo = repository || createRoleRepository();

  // 辅助函数：检查通配符权限
  function matchesWildcard(permission: string, pattern: string): boolean {
    if (pattern === '*:*') return true;
    if (pattern === '*') return true;

    const [pResource, pAction] = pattern.split(':');
    const [permResource, permAction] = permission.split(':');

    if (pResource === permResource && pAction === '*') return true;
    if (pResource === '*' && pAction === '*') return true;

    return permission === pattern;
  }

  return {
    async createRole(params: CreateRoleParams): Promise<Role> {
      // 检查角色名是否已存在
      const existing = await repo.getByName(params.name, params.tenantId);
      if (existing) {
        throw new Error(`Role already exists: ${params.name}`);
      }

      const role: Role = {
        id: params.tenantId ? `${params.tenantId}_${params.name}` : params.name,
        tenantId: params.tenantId,
        name: params.name,
        displayName: params.displayName,
        description: params.description,
        permissions: params.permissions || [],
        mcpPermissions: params.mcpPermissions || [],
        skillPermissions: params.skillPermissions || [],
        extends: params.extends || [],
        isSystem: false,
        isDefault: params.isDefault || false,
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return repo.create(role);
    },

    async getRoleById(id: string): Promise<Role | null> {
      return repo.getById(id);
    },

    async getRoleByName(name: string, tenantId?: string): Promise<Role | null> {
      return repo.getByName(name, tenantId);
    },

    async getRolesByTenant(tenantId: string): Promise<Role[]> {
      const result = await repo.query({ tenantId });
      return result.roles;
    },

    async getSystemRoles(): Promise<Role[]> {
      const result = await repo.query({ tenantId: null, isSystem: true });
      return result.roles;
    },

    async getAllRoles(options?: RoleQueryOptions): Promise<{ roles: Role[]; total: number }> {
      return repo.query(options || {});
    },

    async updateRole(id: string, updates: UpdateRoleParams): Promise<Role> {
      const role = await repo.update(id, updates);
      if (!role) {
        throw new Error(`Role not found: ${id}`);
      }
      return role;
    },

    async deleteRole(id: string): Promise<boolean> {
      const role = await repo.getById(id);
      if (!role) {
        throw new Error(`Role not found: ${id}`);
      }
      if (role.isSystem) {
        throw new Error('Cannot delete system role');
      }
      return repo.delete(id);
    },

    async assignPermissions(roleId: string, permissions: string[]): Promise<void> {
      const role = await repo.getById(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      const currentPerms = new Set(role.permissions);
      permissions.forEach(p => currentPerms.add(p));

      await repo.update(roleId, { permissions: Array.from(currentPerms) });
    },

    async removePermissions(roleId: string, permissions: string[]): Promise<void> {
      const role = await repo.getById(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      const currentPerms = new Set(role.permissions);
      permissions.forEach(p => currentPerms.delete(p));

      await repo.update(roleId, { permissions: Array.from(currentPerms) });
    },

    async assignMCPPermissions(roleId: string, mcpTools: string[]): Promise<void> {
      const role = await repo.getById(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      await repo.update(roleId, { mcpPermissions: mcpTools });
    },

    async assignSkillPermissions(roleId: string, skills: string[]): Promise<void> {
      const role = await repo.getById(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      await repo.update(roleId, { skillPermissions: skills });
    },

    async getUsersInRole(roleId: string): Promise<User[]> {
      // TODO: 需要用户仓库来实现
      return [];
    },

    async getRolesForUser(userId: string): Promise<Role[]> {
      // TODO: 需要从用户服务获取用户角色
      return [];
    },

    async hasPermission(roleId: string, permission: string): Promise<boolean> {
      const role = await repo.getById(roleId);
      if (!role) return false;

      // 检查通配符权限
      if (role.permissions.some(p => matchesWildcard(permission, p))) {
        return true;
      }

      return role.permissions.includes(permission);
    },

    async hasMCPAccess(roleId: string, toolName: string): Promise<boolean> {
      const role = await repo.getById(roleId);
      if (!role) return false;

      // 通配符权限
      if (role.mcpPermissions?.includes('*')) return true;

      return role.mcpPermissions?.includes(toolName) || false;
    },

    async hasSkillAccess(roleId: string, skillName: string): Promise<boolean> {
      const role = await repo.getById(roleId);
      if (!role) return false;

      // 通配符权限
      if (role.skillPermissions?.includes('*')) return true;

      return role.skillPermissions?.includes(skillName) || false;
    },

    async calculateEffectivePermissions(user: User): Promise<string[]> {
      const permSet = new Set<string>();

      for (const roleId of user.roles) {
        const role = await repo.getById(roleId);
        if (!role) continue;

        // 添加直接权限
        role.permissions.forEach(p => permSet.add(p));

        // 处理继承
        if (role.extends) {
          for (const extendsId of role.extends) {
            const parentRole = await repo.getById(extendsId);
            if (parentRole) {
              parentRole.permissions.forEach(p => permSet.add(p));
            }
          }
        }
      }

      return Array.from(permSet);
    },

    async calculateEffectiveMCPPermissions(user: User): Promise<string[]> {
      const permSet = new Set<string>();

      for (const roleId of user.roles) {
        const role = await repo.getById(roleId);
        if (!role) continue;

        // 通配符
        if (role.mcpPermissions?.includes('*')) {
          return ['*'];
        }

        role.mcpPermissions?.forEach(p => permSet.add(p));
      }

      return Array.from(permSet);
    },

    async calculateEffectiveSkillPermissions(user: User): Promise<string[]> {
      const permSet = new Set<string>();

      for (const roleId of user.roles) {
        const role = await repo.getById(roleId);
        if (!role) continue;

        if (role.skillPermissions?.includes('*')) {
          return ['*'];
        }

        role.skillPermissions?.forEach(p => permSet.add(p));
      }

      return Array.from(permSet);
    },

    async initializeTenantRoles(tenantId: string): Promise<void> {
      await repo.initializeForTenant(tenantId);
    },

    getAllPermissions(): Permission[] {
      return PERMISSIONS;
    },
  };
}
