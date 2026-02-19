/**
 * 权限中间件 - 负责 MCP/Skill 的权限检查
 */

import { Role } from './Role';
import { User } from './User';

// MCP 工具权限定义
export interface MCPToolPermission {
  toolName: string;
  displayName: string;
  description: string;
  category: 'hospital' | 'appointment' | 'pet' | 'system';
  requiredPermissions: string[];  // 需要的基础权限
}

// Skill 权限定义
export interface SkillPermission {
  skillName: string;
  displayName: string;
  description: string;
  category: 'consultation' | 'analysis' | 'system';
  requiredPermissions: string[];
}

// MCP 工具权限注册
export const MCP_TOOL_PERMISSIONS: MCPToolPermission[] = [
  {
    toolName: 'getHospitals',
    displayName: '查询医院',
    description: '根据城市和专科查询宠物医院',
    category: 'hospital',
    requiredPermissions: ['hospital:read'],
  },
  {
    toolName: 'createAppointment',
    displayName: '创建预约',
    description: '创建宠物就诊预约',
    category: 'appointment',
    requiredPermissions: ['appointment:create'],
  },
  {
    toolName: 'getPetInfo',
    displayName: '获取宠物信息',
    description: '获取宠物详细信息',
    category: 'pet',
    requiredPermissions: ['pet:read'],
  },
];

// Skill 权限注册
export const SKILL_PERMISSIONS: SkillPermission[] = [
  {
    skillName: 'triage-consultation',
    displayName: '分诊咨询',
    description: 'AI 辅助分诊咨询',
    category: 'consultation',
    requiredPermissions: ['hospital:read', 'pet:read'],
  },
];

// 权限不足错误
export class PermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

// 权限检查中间件
export class PermissionMiddleware {
  private mcpToolMap = new Map(MCP_TOOL_PERMISSIONS.map(t => [t.toolName, t]));
  private skillMap = new Map(SKILL_PERMISSIONS.map(s => [s.skillName, s]));

  /**
   * 检查用户是否可以执行 MCP 工具
   */
  canExecuteMCP(user: User, roles: Role[], toolName: string): boolean {
    // 1. 检查角色是否有通配符权限
    for (const role of roles) {
      if (role.mcpPermissions?.includes('*')) {
        return true;
      }
    }

    // 2. 检查具体工具权限
    const hasToolAccess = roles.some(role =>
      role.mcpPermissions?.includes(toolName)
    );

    if (!hasToolAccess) {
      return false;
    }

    // 3. 检查基础权限
    const toolPerm = this.mcpToolMap.get(toolName);
    if (!toolPerm) {
      // 工具未注册，默认允许
      return true;
    }

    return this.hasAnyPermission(user, roles, toolPerm.requiredPermissions);
  }

  /**
   * 检查用户是否可以执行 Skill
   */
  canExecuteSkill(user: User, roles: Role[], skillName: string): boolean {
    // 1. 检查通配符
    for (const role of roles) {
      if (role.skillPermissions?.includes('*')) {
        return true;
      }
    }

    // 2. 检查具体技能权限
    const hasSkillAccess = roles.some(role =>
      role.skillPermissions?.includes(skillName)
    );

    if (!hasSkillAccess) {
      return false;
    }

    // 3. 检查基础权限
    const skillPerm = this.skillMap.get(skillName);
    if (!skillPerm) {
      return true;
    }

    return this.hasAnyPermission(user, roles, skillPerm.requiredPermissions);
  }

  /**
   * 检查用户是否有任意一个权限
   */
  private hasAnyPermission(user: User, roles: Role[], permissions: string[]): boolean {
    // 收集用户所有角色的权限
    const userPerms = new Set<string>();

    for (const role of roles) {
      // 通配符权限
      if (role.permissions.includes('*:*') || role.permissions.includes('*')) {
        return true;
      }

      role.permissions.forEach(p => userPerms.add(p));
    }

    // 检查是否满足任意一个权限
    for (const perm of permissions) {
      if (this.matchPermission(perm, userPerms)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 权限匹配（支持通配符）
   */
  private matchPermission(permission: string, userPerms: Set<string>): boolean {
    const [resource, action] = permission.split(':');

    for (const perm of userPerms) {
      const [pResource, pAction] = perm.split(':');

      // 完全匹配
      if (perm === permission) {
        return true;
      }

      // 通配符匹配
      if (pResource === resource && pAction === '*') {
        return true;
      }
      if (pResource === '*' && pAction === '*') {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取用户可用的 MCP 工具列表
   */
  getAvailableMCPTools(user: User, roles: Role[]): string[] {
    const tools: string[] = [];

    // 如果有通配符，返回所有工具
    for (const role of roles) {
      if (role.mcpPermissions?.includes('*')) {
        return MCP_TOOL_PERMISSIONS.map(t => t.toolName);
      }
    }

    // 收集所有授权的工具
    for (const role of roles) {
      if (role.mcpPermissions) {
        for (const toolName of role.mcpPermissions) {
          // 检查是否满足基础权限
          if (this.canExecuteMCP(user, roles, toolName)) {
            if (!tools.includes(toolName)) {
              tools.push(toolName);
            }
          }
        }
      }
    }

    return tools;
  }

  /**
   * 获取用户可用的 Skills 列表
   */
  getAvailableSkills(user: User, roles: Role[]): string[] {
    const skills: string[] = [];

    // 通配符
    for (const role of roles) {
      if (role.skillPermissions?.includes('*')) {
        return SKILL_PERMISSIONS.map(s => s.skillName);
      }
    }

    for (const role of roles) {
      if (role.skillPermissions) {
        for (const skillName of role.skillPermissions) {
          if (this.canExecuteSkill(user, roles, skillName)) {
            if (!skills.includes(skillName)) {
              skills.push(skillName);
            }
          }
        }
      }
    }

    return skills;
  }

  /**
   * 获取工具的详细信息
   */
  getMCPToolInfo(toolName: string): MCPToolPermission | undefined {
    return this.mcpToolMap.get(toolName);
  }

  /**
   * 获取技能详细信息
   */
  getSkillInfo(skillName: string): SkillPermission | undefined {
    return this.skillMap.get(skillName);
  }

  /**
   * 获取所有 MCP 工具权限定义
   */
  getAllMCPToolPermissions(): MCPToolPermission[] {
    return MCP_TOOL_PERMISSIONS;
  }

  /**
   * 获取所有 Skill 权限定义
   */
  getAllSkillPermissions(): SkillPermission[] {
    return SKILL_PERMISSIONS;
  }
}

/**
 * 创建权限中间件实例
 */
export function createPermissionMiddleware(): PermissionMiddleware {
  return new PermissionMiddleware();
}
