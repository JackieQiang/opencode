/**
 * 权限装饰器 - 用于在方法上添加权限检查
 */

import { PermissionDeniedError } from './PermissionMiddleware';

/**
 * 请求上下文接口
 */
export interface RequestContext {
  user: {
    id: string;
    tenantId: string;
    roles: string[];
  };
  permissions?: string[];
  hasPermission: (permission: string) => boolean | Promise<boolean>;
  hasMCPAccess?: (toolName: string) => boolean | Promise<boolean>;
  hasSkillAccess?: (skillName: string) => boolean | Promise<boolean>;
}

/**
 * 权限检查装饰器工厂
 *
 * @param permission 权限名称，如 'user:create', 'hospital:read'
 */
export function requirePermission(permission: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 获取上下文（通常是最后一个参数）
      const context = args.find(arg => arg && typeof arg === 'object' && 'hasPermission' in arg) as RequestContext | undefined;

      if (!context) {
        throw new Error('Request context is required for permission check');
      }

      // 检查权限
      const hasPermission = await context.hasPermission(permission);
      if (!hasPermission) {
        throw new PermissionDeniedError(`Missing permission: ${permission}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * MCP 工具权限装饰器
 *
 * @param toolName MCP 工具名称
 */
export function requireMCPTool(toolName: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args.find(arg => arg && typeof arg === 'object' && 'hasMCPAccess' in arg) as RequestContext | undefined;

      if (!context || !context.hasMCPAccess) {
        throw new Error('Request context with MCP access check is required');
      }

      const hasAccess = await context.hasMCPTool(toolName);
      if (!hasAccess) {
        throw new PermissionDeniedError(`No access to MCP tool: ${toolName}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Skill 权限装饰器
 *
 * @param skillName Skill 名称
 */
export function requireSkill(skillName: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args.find(arg => arg && typeof arg === 'object' && 'hasSkillAccess' in arg) as RequestContext | undefined;

      if (!context || !context.hasSkillAccess) {
        throw new Error('Request context with Skill access check is required');
      }

      const hasAccess = await context.hasSkillAccess(skillName);
      if (!hasAccess) {
        throw new PermissionDeniedError(`No access to skill: ${skillName}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 角色检查装饰器
 *
 * @param roles 允许的角色列表
 */
export function requireRoles(...roles: string[]) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args.find(arg => arg && typeof arg === 'object' && 'user' in arg) as RequestContext | undefined;

      if (!context || !context.user) {
        throw new Error('Request context with user is required');
      }

      const userRoles = context.user.roles || [];
      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        throw new PermissionDeniedError(`Required roles: ${roles.join(', ')}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 创建权限检查中间件的辅助函数
 */
export function createPermissionChecker(
  roleService?: {
    hasPermission: (roleId: string, permission: string) => Promise<boolean>;
    hasMCPAccess: (roleId: string, toolName: string) => Promise<boolean>;
    hasSkillAccess: (roleId: string, skillName: string) => Promise<boolean>;
  }
) {
  return {
    /**
     * 检查用户是否有权限
     */
    async checkPermission(userRoles: string[], permission: string): Promise<boolean> {
      if (!roleService) {
        // 如果没有 roleService，简单检查
        return true;
      }

      for (const roleId of userRoles) {
        const hasPermission = await roleService.hasPermission(roleId, permission);
        if (hasPermission) return true;
      }
      return false;
    },

    /**
     * 检查用户是否有 MCP 工具访问权限
     */
    async checkMCPAccess(userRoles: string[], toolName: string): Promise<boolean> {
      if (!roleService) return true;

      for (const roleId of userRoles) {
        const hasAccess = await roleService.hasMCPAccess(roleId, toolName);
        if (hasAccess) return true;
      }
      return false;
    },

    /**
     * 检查用户是否有 Skill 访问权限
     */
    async checkSkillAccess(userRoles: string[], skillName: string): Promise<boolean> {
      if (!roleService) return true;

      for (const roleId of userRoles) {
        const hasAccess = await roleService.hasSkillAccess(roleId, skillName);
        if (hasAccess) return true;
      }
      return false;
    },

    /**
     * 创建请求上下文
     */
    createContext(user: { id: string; tenantId: string; roles: string[] }) {
      return {
        user,
        hasPermission: (permission: string) => this.checkPermission(user.roles, permission),
        hasMCPTool: (toolName: string) => this.checkMCPAccess(user.roles, toolName),
        hasSkillAccess: (skillName: string) => this.checkSkillAccess(user.roles, skillName),
      } as RequestContext;
    },
  };
}
