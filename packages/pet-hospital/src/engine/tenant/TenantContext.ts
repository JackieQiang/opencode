export interface TenantConfig {
  tenantId: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  apiKeys: ApiKeyConfig[];
  limits: TenantLimits;
  permissions: string[];
}

export interface ApiKeyConfig {
  provider: 'openai' | 'anthropic' | 'deepseek';
  key: string;
  weight: number;
  models: string[];
  limitPerMinute: number;
  limitPerDay: number;
}

export interface TenantLimits {
  dailyCost: number;
  monthlyCost: number;
  requestsPerMinute: number;
}

export class TenantContext {
  readonly tenantId: string;
  readonly ownerId: string;
  readonly plan: 'free' | 'pro' | 'enterprise';
  readonly apiKeys: ApiKeyConfig[];
  readonly limits: TenantLimits;
  readonly permissions: Set<string>;

  constructor(config: TenantConfig) {
    if (!config.tenantId || config.tenantId.trim() === '') {
      throw new Error('tenantId is required');
    }
    if (!config.ownerId || config.ownerId.trim() === '') {
      throw new Error('ownerId is required');
    }

    this.tenantId = config.tenantId;
    this.ownerId = config.ownerId;
    this.plan = config.plan;
    this.apiKeys = config.apiKeys;
    this.limits = config.limits;
    this.permissions = new Set(config.permissions);
  }

  hasPermission(permission: string): boolean {
    return this.permissions.has(permission);
  }
}

export function createTenantContext(config: TenantConfig): TenantContext {
  return new TenantContext(config);
}
