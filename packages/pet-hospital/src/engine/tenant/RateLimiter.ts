interface RateLimitConfig {
  user: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    tokensPerDay: number;
    costPerDay: number;
  };
  tenant: {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerHour: number;
    costPerHour: number;
    costPerDay: number;
  };
}

interface RateLimitResult {
  allowed: boolean;
  violations?: string[];
  retryAfter?: number;
  errorMessage?: string;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private usage: Map<string, number> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(userId: string, tenantId: string, estimatedCost: number = 0): RateLimitResult {
    const violations: string[] = [];

    // Check user limits
    const userMinuteKey = `user:${userId}:minute`;
    const userMinuteUsage = this.usage.get(userMinuteKey) || 0;

    if (userMinuteUsage >= this.config.user.requestsPerMinute) {
      violations.push('user:minute');
    }

    // Check tenant limits
    const tenantMinuteKey = `tenant:${tenantId}:minute`;
    const tenantMinuteUsage = this.usage.get(tenantMinuteKey) || 0;

    if (tenantMinuteUsage >= this.config.tenant.requestsPerMinute) {
      violations.push('tenant:minute');
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        violations,
        retryAfter: 60,
        errorMessage: `请求过于频繁，请 ${violations.join(', ')} 后重试`,
      };
    }

    // Increment counters
    this.usage.set(userMinuteKey, userMinuteUsage + 1);
    this.usage.set(tenantMinuteKey, tenantMinuteUsage + 1);

    return { allowed: true };
  }
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}
