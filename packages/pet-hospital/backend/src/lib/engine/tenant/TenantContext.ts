// ==================== 租户配置 ====================

export interface TenantConfig {
  tenantId: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  apiKeys: ApiKeyConfig[];
  limits: TenantLimits;
  permissions: string[];
}

// ==================== API Key 配置 ====================

export interface ApiKeyConfig {
  id?: string;
  provider: 'openai' | 'anthropic' | 'deepseek';
  key: string;
  weight: number;
  models: string[];
  limitPerMinute: number;
  limitPerDay: number;
  isShared?: boolean; // 是否为共享 Key
}

// ==================== 租户限制 ====================

export interface TenantLimits {
  dailyCost: number;
  monthlyCost: number;
  requestsPerMinute: number;
  maxUsers: number;
  maxApiKeys: number;
}

// ==================== 用户实体 ====================

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// ==================== 角色实体 ====================

export interface Role {
  id: string;
  tenantId: string | null; // null = 全局角色
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}

// ==================== 请求上下文 ====================

export interface RequestContextConfig {
  tenant: {
    tenantId: string;
    ownerId: string;
    plan: 'free' | 'pro' | 'enterprise';
    limits: TenantLimits;
  };
  user: User;
  roles: Role[];
  permissions: string[];
  apiKeys: ApiKeyConfig[];
}

/**
 * 租户上下文
 *
 * 提供完整的请求上下文，包含：
 * - 租户信息
 * - 用户信息
 * - 角色和权限
 * - API Keys
 */
export class TenantContext {
  readonly tenant: {
    tenantId: string;
    ownerId: string;
    plan: 'free' | 'pro' | 'enterprise';
    limits: TenantLimits;
  };
  readonly user: User;
  readonly roles: Role[];
  readonly permissions: Set<string>;
  readonly apiKeys: ApiKeyConfig[];

  constructor(config: RequestContextConfig) {
    if (!config.tenant.tenantId || config.tenant.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }
    if (!config.user) {
      throw new Error('user is required');
    }

    this.tenant = {
      tenantId: config.tenant.tenantId,
      ownerId: config.tenant.ownerId,
      plan: config.tenant.plan,
      limits: config.tenant.limits,
    };
    this.user = config.user;
    this.roles = config.roles;
    this.permissions = new Set(config.permissions);
    this.apiKeys = config.apiKeys;
  }

  /**
   * 检查权限
   * 支持精确匹配和通配符
   *
   * 示例：
   * - hasPermission('chat:create')
   * - hasPermission('plugin:execute')
   * - hasPermission('admin:*') 匹配所有 admin 权限
   */
  hasPermission(permission: string): boolean {
    // 精确匹配
    if (this.permissions.has(permission)) {
      return true;
    }

    // 通配符匹配
    const [resource, action] = permission.split(':');
    for (const perm of this.permissions) {
      const [pResource, pAction] = perm.split(':');
      if (pResource === resource && pAction === '*') {
        return true;
      }
      if (perm === '*:*' || perm === `${resource}:*`) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查是否为租户管理员
   */
  isTenantAdmin(): boolean {
    return this.roles.some(r => r.name === 'tenant_admin') ||
           this.roles.some(r => r.name === 'admin');
  }

  /**
   * 检查是否为系统管理员
   */
  isSystemAdmin(): boolean {
    return this.roles.some(r => r.name === 'super_admin' || r.name === 'system_admin');
  }

  /**
   * 获取用户可用的 API Keys（独有 Key）
   */
  getDedicatedKeys(): ApiKeyConfig[] {
    return this.apiKeys.filter(k => !k.isShared);
  }

  /**
   * 获取共享 Keys
   */
  getSharedKeys(): ApiKeyConfig[] {
    return this.apiKeys.filter(k => k.isShared);
  }
}

/**
 * 创建租户上下文工厂
 */
export function createTenantContext(config: RequestContextConfig): TenantContext {
  return new TenantContext(config);
}
