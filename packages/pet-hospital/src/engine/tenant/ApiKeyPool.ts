import { ApiKeyConfig } from './TenantContext';

interface UsageRecord {
  minute: number;
  day: number;
}

interface PoolConfig {
  keys: ApiKeyConfig[];
}

export class ApiKeyPool {
  private keys: ApiKeyConfig[];
  private usage: Map<string, UsageRecord> = new Map();

  constructor(config: PoolConfig) {
    this.keys = config.keys;
  }

  selectKey(model: string): ApiKeyConfig {
    const available = this.keys.filter(key =>
      key.models.includes(model) &&
      this.isWithinLimit(key)
    );

    if (available.length === 0) {
      throw new Error('No available API keys');
    }

    // 按权重分配流量
    const totalWeight = available.reduce((sum, key) => sum + key.weight, 0);
    let random = Math.random() * totalWeight;

    for (const key of available) {
      random -= key.weight;
      if (random <= 0) {
        return key;
      }
    }

    return available[0];
  }

  recordUsage(key: string, tokens: number): void {
    const usage = this.usage.get(key) || { minute: 0, day: 0 };
    usage.minute += tokens;
    usage.day += tokens;
    this.usage.set(key, usage);
  }

  getUsage(key: string): UsageRecord | undefined {
    return this.usage.get(key);
  }

  private isWithinLimit(key: ApiKeyConfig): boolean {
    const usage = this.usage.get(key);
    const minuteUsed = usage?.minute ?? 0;
    const dayUsed = usage?.day ?? 0;
    return minuteUsed < key.limitPerMinute && dayUsed < key.limitPerDay;
  }
}

export function createApiKeyPool(config: PoolConfig): ApiKeyPool {
  return new ApiKeyPool(config);
}
