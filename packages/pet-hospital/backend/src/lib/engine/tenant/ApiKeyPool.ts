// ==================== 类型定义 ====================

import { ApiKeyConfig } from './TenantContext';

export interface KeyHealthStatus {
  key: string;
  isHealthy: boolean;
  lastChecked: Date;
  errorCount: number;
  avgLatency: number;
  successRate: number;
  lastError?: string;
}

export interface KeyMetrics {
  key: string;
  provider: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  failoverCount: number;
}

export interface PoolStats {
  totalKeys: number;
  healthyKeys: number;
  unhealthyKeys: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  failoverCount: number;
}

export interface CostConfig {
  provider: string;
  inputCostPerToken: number;
  outputCostPerToken: number;
}

export interface PoolConfig {
  keys: ApiKeyConfig[];
  healthCheckIntervalMs?: number;
  maxErrorCount?: number;
  failoverEnabled?: boolean;
}

export enum SelectionStrategy {
  WEIGHTED = 'weighted',
  COST_OPTIMIZED = 'cost_optimized',
  LATENCY_OPTIMIZED = 'latency_optimized',
  FAILOVER = 'failover',
}

// Provider 成本预设 (单位: $ per 1M tokens)
export const PROVIDER_COSTS: Record<string, CostConfig> = {
  openai: {
    provider: 'openai',
    inputCostPerToken: 0.01, // $0.01 per 1M
    outputCostPerToken: 0.03, // $0.03 per 1M
  },
  anthropic: {
    provider: 'anthropic',
    inputCostPerToken: 0.015,
    outputCostPerToken: 0.075,
  },
  deepseek: {
    provider: 'deepseek',
    inputCostPerToken: 0.01,
    outputCostPerToken: 0.03,
  },
};

// ==================== 内部使用记录 ====================

interface UsageRecord {
  minute: number;
  day: number;
}

interface RequestRecord {
  timestamp: number;
  success: boolean;
  latency: number;
  tokens: number;
  cost: number;
}

// ==================== API Key Pool 类 ====================

export class ApiKeyPool {
  private keys: ApiKeyConfig[];
  private usage: Map<string, UsageRecord> = new Map();
  private healthStatus: Map<string, KeyHealthStatus> = new Map();
  private metrics: Map<string, KeyMetrics> = new Map();
  private requestHistory: Map<string, RequestRecord[]> = new Map();

  // 配置
  private healthCheckIntervalMs: number;
  private maxErrorCount: number;
  private failoverEnabled: boolean;

  // 内部状态
  private lastHealthCheck: Date | null = null;

  constructor(config: PoolConfig) {
    this.keys = config.keys;
    this.healthCheckIntervalMs = config.healthCheckIntervalMs || 60000; // 默认 1 分钟
    this.maxErrorCount = config.maxErrorCount || 5; // 默认 5 次错误标记不健康
    this.failoverEnabled = config.failoverEnabled !== false; // 默认启用

    // 初始化健康状态和指标
    this.initializeStates();
  }

  private initializeStates(): void {
    for (const key of this.keys) {
      // 初始化健康状态
      this.healthStatus.set(key.key, {
        key: key.key,
        isHealthy: true,
        lastChecked: new Date(),
        errorCount: 0,
        avgLatency: 0,
        successRate: 100,
      });

      // 初始化指标
      this.metrics.set(key.key, {
        key: key.key,
        provider: key.provider,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgLatency: 0,
        successRate: 100,
        failoverCount: 0,
      });

      // 初始化请求历史
      this.requestHistory.set(key.key, []);
    }
  }

  // ==================== 核心功能: 选择 Key ====================

  selectKey(model: string, strategy: SelectionStrategy = SelectionStrategy.WEIGHTED): ApiKeyConfig {
    switch (strategy) {
      case SelectionStrategy.WEIGHTED:
        return this.selectByWeighted(model);
      case SelectionStrategy.COST_OPTIMIZED:
        return this.selectByCost(model);
      case SelectionStrategy.LATENCY_OPTIMIZED:
        return this.selectByLatency(model);
      case SelectionStrategy.FAILOVER:
        return this.selectWithFailover(model);
      default:
        return this.selectByWeighted(model);
    }
  }

  // 按权重选择
  private selectByWeighted(model: string): ApiKeyConfig {
    const available = this.getAvailableKeys(model);
    if (available.length === 0) {
      throw new Error(`No available API keys for model: ${model}`);
    }

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

  // 按成本选择
  private selectByCost(model: string): ApiKeyConfig {
    const available = this.getAvailableKeys(model);
    if (available.length === 0) {
      throw new Error(`No available API keys for model: ${model}`);
    }

    // 返回成本最低的 Key
    let cheapest: ApiKeyConfig | null = null;
    let minCost = Infinity;

    for (const key of available) {
      const cost = this.calculateCostForModel(key, model);
      if (cost < minCost) {
        minCost = cost;
        cheapest = key;
      }
    }

    return cheapest!;
  }

  // 按延迟选择
  private selectByLatency(model: string): ApiKeyConfig {
    const available = this.getAvailableKeys(model);
    if (available.length === 0) {
      throw new Error(`No available API keys for model: ${model}`);
    }

    // 返回平均延迟最低的 Key
    let fastest: ApiKeyConfig | null = null;
    let minLatency = Infinity;

    for (const key of available) {
      const status = this.healthStatus.get(key.key);
      const latency = status?.avgLatency ?? Infinity;
      if (latency < minLatency) {
        minLatency = latency;
        fastest = key;
      }
    }

    return fastest!;
  }

  // 带故障转移的选择
  private selectWithFailover(model: string): ApiKeyConfig {
    // 首先尝试选择最优的 Key
    try {
      return this.selectByWeighted(model);
    } catch {
      // 如果首选失败，尝试故障转移
      const fallback = this.getFallbackKey(model);
      if (fallback) {
        const metrics = this.metrics.get(fallback.key);
        if (metrics) {
          metrics.failoverCount++;
        }
        return fallback;
      }
      throw new Error(`No available API keys for model: ${model} (failover exhausted)`);
    }
  }

  // ==================== 健康检查 ====================

  async validateKey(key: ApiKeyConfig): Promise<boolean> {
    try {
      const status = this.healthStatus.get(key.key);
      if (status && status.errorCount >= this.maxErrorCount) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async checkAllKeysHealth(): Promise<Map<string, KeyHealthStatus>> {
    const results = new Map<string, KeyHealthStatus>();

    for (const key of this.keys) {
      const isHealthy = await this.validateKey(key);
      const currentStatus = this.healthStatus.get(key.key);

      const status: KeyHealthStatus = {
        key: key.key,
        isHealthy,
        lastChecked: new Date(),
        errorCount: currentStatus?.errorCount ?? 0,
        avgLatency: currentStatus?.avgLatency ?? 0,
        successRate: currentStatus?.successRate ?? 100,
      };

      this.healthStatus.set(key.key, status);
      results.set(key.key, status);
    }

    this.lastHealthCheck = new Date();
    return results;
  }

  markKeyUnhealthy(key: string, error?: Error): void {
    const status = this.healthStatus.get(key);
    if (status) {
      status.isHealthy = false;
      status.errorCount++;
      status.lastChecked = new Date();
      status.lastError = error?.message;
      status.successRate = this.calculateSuccessRate(key);
    }
  }

  markKeyHealthy(key: string): void {
    const status = this.healthStatus.get(key);
    if (status) {
      status.isHealthy = true;
      status.lastChecked = new Date();
      status.errorCount = 0;
    }
  }

  getKeyHealth(key: string): KeyHealthStatus | undefined {
    return this.healthStatus.get(key);
  }

  getAllHealthStatus(): KeyHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  // ==================== 故障转移 ====================

  private getFallbackKey(model: string): ApiKeyConfig | null {
    const available = this.getAvailableKeys(model);
    if (available.length <= 1) {
      return null;
    }

    const sorted = [...available].sort((a, b) => b.weight - a.weight);
    return sorted[1] || null;
  }

  // ==================== 成本计算 ====================

  calculateCost(key: ApiKeyConfig, inputTokens: number, outputTokens: number): number {
    const provider = key.provider;
    const costConfig = PROVIDER_COSTS[provider];

    if (!costConfig) {
      return (inputTokens * 0.01 + outputTokens * 0.03) / 1000000;
    }

    const inputCost = (inputTokens * costConfig.inputCostPerToken) / 1000000;
    const outputCost = (outputTokens * costConfig.outputCostPerToken) / 1000000;

    return inputCost + outputCost;
  }

  private calculateCostForModel(key: ApiKeyConfig, model: string): number {
    const estimatedInputTokens = 1000;
    const estimatedOutputTokens = 2000;
    return this.calculateCost(key, estimatedInputTokens, estimatedOutputTokens);
  }

  // ==================== 使用记录 ====================

  recordUsage(key: string, tokens: number, success: boolean, latency: number): void {
    const usage = this.usage.get(key) || { minute: 0, day: 0 };
    usage.minute += tokens;
    usage.day += tokens;
    this.usage.set(key, usage);

    const history = this.requestHistory.get(key) || [];
    history.push({
      timestamp: Date.now(),
      success,
      latency,
      tokens,
      cost: 0,
    });

    if (history.length > 100) {
      history.shift();
    }
    this.requestHistory.set(key, history);

    const metrics = this.metrics.get(key);
    if (metrics) {
      metrics.totalRequests++;
      metrics.totalTokens += tokens;
      metrics.successRate = this.calculateSuccessRate(key);

      const allLatencies = history.map(r => r.latency);
      metrics.avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    }

    if (!success) {
      const status = this.healthStatus.get(key);
      if (status) {
        status.errorCount++;
        if (status.errorCount >= this.maxErrorCount) {
          status.isHealthy = false;
        }
        status.successRate = this.calculateSuccessRate(key);
      }
    }
  }

  getUsage(key: string): UsageRecord | undefined {
    return this.usage.get(key);
  }

  // ==================== 指标统计 ====================

  getKeyMetrics(): KeyMetrics[] {
    return Array.from(this.metrics.values());
  }

  getKeyMetricsByKey(key: string): KeyMetrics | undefined {
    return this.metrics.get(key);
  }

  getPoolStats(): PoolStats {
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let failoverCount = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (const metrics of this.metrics.values()) {
      totalRequests += metrics.totalRequests;
      totalTokens += metrics.totalTokens;
      totalCost += metrics.totalCost;
      totalLatency += metrics.avgLatency;
      failoverCount += metrics.failoverCount;

      const health = this.healthStatus.get(metrics.key);
      if (health?.isHealthy) {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    }

    const count = this.metrics.size;
    return {
      totalKeys: count,
      healthyKeys: healthyCount,
      unhealthyKeys: unhealthyCount,
      totalRequests,
      totalTokens,
      totalCost,
      avgLatency: count > 0 ? totalLatency / count : 0,
      failoverCount,
    };
  }

  resetMetrics(): void {
    for (const key of this.keys) {
      this.metrics.set(key.key, {
        key: key.key,
        provider: key.provider,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgLatency: 0,
        successRate: 100,
        failoverCount: 0,
      });
      this.requestHistory.set(key.key, []);
    }
  }

  // ==================== 负载分布 ====================

  getKeyLoadDistribution(): Map<string, number> {
    const distribution = new Map<string, number>();
    const totalRequests = this.getPoolStats().totalRequests;

    if (totalRequests === 0) {
      const totalWeight = this.keys.reduce((sum, key) => sum + key.weight, 0);
      for (const key of this.keys) {
        distribution.set(key.key, key.weight / totalWeight);
      }
    } else {
      for (const metrics of this.metrics.values()) {
        distribution.set(metrics.key, metrics.totalRequests / totalRequests);
      }
    }

    return distribution;
  }

  // ==================== 内部辅助方法 ====================

  private getAvailableKeys(model: string): ApiKeyConfig[] {
    return this.keys.filter(key =>
      key.models.includes(model) &&
      this.isWithinLimit(key)
    );
  }

  private isWithinLimit(key: ApiKeyConfig): boolean {
    const usage = this.usage.get(key.key);
    const minuteUsed = usage?.minute ?? 0;
    const dayUsed = usage?.day ?? 0;
    return minuteUsed < key.limitPerMinute && dayUsed < key.limitPerDay;
  }

  private calculateSuccessRate(key: string): number {
    const history = this.requestHistory.get(key) || [];
    if (history.length === 0) {
      return 100;
    }

    const successCount = history.filter(r => r.success).length;
    return (successCount / history.length) * 100;
  }

  // ==================== 公共查询方法 ====================

  getKeys(): ApiKeyConfig[] {
    return [...this.keys];
  }

  getKeyCount(): number {
    return this.keys.length;
  }

  getHealthyKeyCount(): number {
    return Array.from(this.healthStatus.values()).filter(s => s.isHealthy).length;
  }

  getModels(): string[] {
    const models = new Set<string>();
    for (const key of this.keys) {
      for (const model of key.models) {
        models.add(model);
      }
    }
    return Array.from(models);
  }

  supportsModel(model: string): boolean {
    return this.getModels().includes(model);
  }
}

// ==================== 工厂函数 ====================

export function createApiKeyPool(config: PoolConfig): ApiKeyPool {
  return new ApiKeyPool(config);
}
