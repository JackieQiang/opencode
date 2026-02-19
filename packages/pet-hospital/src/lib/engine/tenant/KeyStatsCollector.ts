// ==================== 类型定义 ====================

/**
 * 时间序列数据点
 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

/**
 * 时间粒度
 */
export type TimeGranularity = 'minute' | 'hour' | 'day';

/**
 * 使用量记录
 */
export interface UsageRecord {
  id: string;
  tenantId: string;
  keyId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

/**
 * 详细统计
 */
export interface DetailedStats {
  // 概览
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;

  // 流量
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;

  // 成本
  inputCost: number;
  outputCost: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;

  // 性能
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;

  // 故障
  failoverCount: number;
  retryCount: number;
  errorCountByType: Record<string, number>;

  // 时间
  firstRequestAt?: Date;
  lastRequestAt?: Date;
}

/**
 * Provider 成本配置
 */
export interface ProviderCostConfig {
  provider: string;
  inputCostPerToken: number;  // $/1M tokens
  outputCostPerToken: number;
}

/**
 * 成本预警配置
 */
export interface CostAlertConfig {
  tenantId: string;
  dailyBudget: number;
  monthlyBudget: number;
  alertThresholds: number[];  // 百分比 [50, 80, 90, 100]
}

/**
 * 成本预警
 */
export interface CostAlert {
  id: string;
  tenantId: string;
  type: 'daily' | 'monthly';
  threshold: number;
  currentUsage: number;
  budget: number;
  alertType: 'warning' | 'critical';
  triggeredAt: Date;
  acknowledged: boolean;
}

/**
 * 成本统计
 */
export interface CostStats {
  tenantId: string;
  dailyUsage: number;
  dailyBudget: number;
  dailyPercentage: number;
  monthlyUsage: number;
  monthlyBudget: number;
  monthlyPercentage: number;
  alerts: CostAlert[];
}

// ==================== 常量 ====================

// Provider 成本预设 ($/1M tokens)
export const PROVIDER_COSTS: Record<string, ProviderCostConfig> = {
  openai: {
    provider: 'openai',
    inputCostPerToken: 0.01,
    outputCostPerToken: 0.03,
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

// ==================== 统计收集器 ====================

/**
 * 使用量统计收集器
 */
export class UsageStatsCollector {
  private records: UsageRecord[] = [];
  private maxRecords: number = 10000;

  /**
   * 记录使用量
   */
  record(data: {
    tenantId: string;
    keyId: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latency: number;
    success: boolean;
    error?: string;
  }): void {
    const cost = this.calculateCost(data.provider, data.inputTokens, data.outputTokens);

    const record: UsageRecord = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      totalTokens: data.inputTokens + data.outputTokens,
      cost,
      timestamp: new Date(),
    };

    this.records.push(record);

    // 限制记录数量
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  /**
   * 计算成本
   */
  calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
    const costConfig = PROVIDER_COSTS[provider];
    if (!costConfig) {
      return (inputTokens * 0.01 + outputTokens * 0.03) / 1000000;
    }

    return (
      (inputTokens * costConfig.inputCostPerToken) +
      (outputTokens * costConfig.outputCostPerToken)
    ) / 1000000;
  }

  /**
   * 获取详细统计
   */
  getDetailedStats(tenantId?: string, startTime?: Date, endTime?: Date): DetailedStats {
    let filtered = this.records;

    if (tenantId) {
      filtered = filtered.filter(r => r.tenantId === tenantId);
    }
    if (startTime) {
      filtered = filtered.filter(r => r.timestamp >= startTime);
    }
    if (endTime) {
      filtered = filtered.filter(r => r.timestamp <= endTime);
    }

    if (filtered.length === 0) {
      return this.getEmptyStats();
    }

    const successRecords = filtered.filter(r => r.success);
    const failedRecords = filtered.filter(r => !r.success);

    // 按 Provider 分组成本
    const costByProvider: Record<string, number> = {};
    for (const r of filtered) {
      costByProvider[r.provider] = (costByProvider[r.provider] || 0) + r.cost;
    }

    // 按 Model 分组成本
    const costByModel: Record<string, number> = {};
    for (const r of filtered) {
      costByModel[r.model] = (costByModel[r.model] || 0) + r.cost;
    }

    // 按错误类型分组
    const errorCountByType: Record<string, number> = {};
    for (const r of failedRecords) {
      const errorType = r.error || 'unknown';
      errorCountByType[errorType] = (errorCountByType[errorType] || 0) + 1;
    }

    // 计算延迟百分位数
    const latencies = filtered.map(r => r.latency).sort((a, b) => a - b);
    const getPercentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    return {
      totalRequests: filtered.length,
      successRequests: successRecords.length,
      failedRequests: failedRecords.length,
      successRate: (successRecords.length / filtered.length) * 100,
      totalInputTokens: filtered.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: filtered.reduce((sum, r) => sum + r.outputTokens, 0),
      totalTokens: filtered.reduce((sum, r) => sum + r.totalTokens, 0),
      inputCost: filtered.reduce((sum, r) => sum + (r.inputTokens * (PROVIDER_COSTS[r.provider]?.inputCostPerToken || 0.01)) / 1000000, 0),
      outputCost: filtered.reduce((sum, r) => sum + (r.outputTokens * (PROVIDER_COSTS[r.provider]?.outputCostPerToken || 0.03)) / 1000000, 0),
      totalCost: filtered.reduce((sum, r) => sum + r.cost, 0),
      costByProvider,
      costByModel,
      avgLatency: filtered.reduce((sum, r) => sum + r.latency, 0) / filtered.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      p50Latency: getPercentile(latencies, 50),
      p95Latency: getPercentile(latencies, 95),
      p99Latency: getPercentile(latencies, 99),
      failoverCount: 0, // TODO: 需要从重试处理器获取
      retryCount: 0,    // TODO: 需要从重试处理器获取
      errorCountByType,
      firstRequestAt: filtered[0]?.timestamp,
      lastRequestAt: filtered[filtered.length - 1]?.timestamp,
    };
  }

  /**
   * 获取时间序列数据
   */
  getTimeSeriesData(
    tenantId: string,
    granularity: TimeGranularity,
    startTime: Date,
    endTime: Date
  ): TimeSeriesDataPoint[] {
    const filtered = this.records.filter(
      r => r.tenantId === tenantId && r.timestamp >= startTime && r.timestamp <= endTime
    );

    // 按时间粒度分组
    const groups = new Map<string, number>();

    for (const record of filtered) {
      const key = this.getTimeKey(record.timestamp, granularity);
      groups.set(key, (groups.get(key) || 0) + record.cost);
    }

    // 转换为时���序列数据点
    const points: TimeSeriesDataPoint[] = [];
    const current = new Date(startTime);

    while (current <= endTime) {
      const key = this.getTimeKey(current, granularity);
      points.push({
        timestamp: new Date(current),
        value: groups.get(key) || 0,
      });

      // 移动到下一个时间单位
      switch (granularity) {
        case 'minute':
          current.setMinutes(current.getMinutes() + 1);
          break;
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
      }
    }

    return points;
  }

  /**
   * 获取时间键
   */
  private getTimeKey(date: Date, granularity: TimeGranularity): string {
    switch (granularity) {
      case 'minute':
        return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      case 'hour':
        return date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      case 'day':
        return date.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  /**
   * 获取空统计
   */
  private getEmptyStats(): DetailedStats {
    return {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      successRate: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      costByProvider: {},
      costByModel: {},
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      failoverCount: 0,
      retryCount: 0,
      errorCountByType: {},
    };
  }

  /**
   * 清除记录
   */
  clear(tenantId?: string): void {
    if (tenantId) {
      this.records = this.records.filter(r => r.tenantId !== tenantId);
    } else {
      this.records = [];
    }
  }
}

// ==================== 成本预警器 ====================

/**
 * 成本预警器
 */
export class CostAlertManager {
  private configs: Map<string, CostAlertConfig> = new Map();
  private alerts: Map<string, CostAlert[]> = new Map();
  private dailyUsage: Map<string, number> = new Map();
  private monthlyUsage: Map<string, number> = new Map();

  /**
   * 设置预警配置
   */
  setAlertConfig(tenantId: string, config: CostAlertConfig): void {
    this.configs.set(tenantId, config);
    this.dailyUsage.set(tenantId, 0);
    this.monthlyUsage.set(tenantId, 0);
  }

  /**
   * 记录使用
   */
  recordUsage(tenantId: string, cost: number): void {
    const current = this.dailyUsage.get(tenantId) || 0;
    const monthly = this.monthlyUsage.get(tenantId) || 0;

    this.dailyUsage.set(tenantId, current + cost);
    this.monthlyUsage.set(tenantId, monthly + cost);

    // 检查是否触发预警
    this.checkAlerts(tenantId);
  }

  /**
   * 检查预警
   */
  private checkAlerts(tenantId: string): void {
    const config = this.configs.get(tenantId);
    if (!config) return;

    const dailyUsage = this.dailyUsage.get(tenantId) || 0;
    const monthlyUsage = this.monthlyUsage.get(tenantId) || 0;

    const dailyPercentage = (dailyUsage / config.dailyBudget) * 100;
    const monthlyPercentage = (monthlyUsage / config.monthlyBudget) * 100;

    const triggeredAlerts: CostAlert[] = [];

    // 检查日预算
    for (const threshold of config.alertThresholds) {
      if (dailyPercentage >= threshold) {
        const alert: CostAlert = {
          id: `alert-daily-${tenantId}-${threshold}-${Date.now()}`,
          tenantId,
          type: 'daily',
          threshold,
          currentUsage: dailyUsage,
          budget: config.dailyBudget,
          alertType: threshold >= 100 ? 'critical' : 'warning',
          triggeredAt: new Date(),
          acknowledged: false,
        };
        triggeredAlerts.push(alert);
      }
    }

    // 检查月预算
    for (const threshold of config.alertThresholds) {
      if (monthlyPercentage >= threshold) {
        const alert: CostAlert = {
          id: `alert-monthly-${tenantId}-${threshold}-${Date.now()}`,
          tenantId,
          type: 'monthly',
          threshold,
          currentUsage: monthlyUsage,
          budget: config.monthlyBudget,
          alertType: threshold >= 100 ? 'critical' : 'warning',
          triggeredAt: new Date(),
          acknowledged: false,
        };
        triggeredAlerts.push(alert);
      }
    }

    if (triggeredAlerts.length > 0) {
      const existing = this.alerts.get(tenantId) || [];
      this.alerts.set(tenantId, [...existing, ...triggeredAlerts]);
    }
  }

  /**
   * 获取成本统计
   */
  getCostStats(tenantId: string): CostStats | null {
    const config = this.configs.get(tenantId);
    if (!config) return null;

    const dailyUsage = this.dailyUsage.get(tenantId) || 0;
    const monthlyUsage = this.monthlyUsage.get(tenantId) || 0;
    const alerts = this.alerts.get(tenantId) || [];

    return {
      tenantId,
      dailyUsage,
      dailyBudget: config.dailyBudget,
      dailyPercentage: (dailyUsage / config.dailyBudget) * 100,
      monthlyUsage,
      monthlyBudget: config.monthlyBudget,
      monthlyPercentage: (monthlyUsage / config.monthlyBudget) * 100,
      alerts: alerts.filter(a => !a.acknowledged),
    };
  }

  /**
   * 确认预警
   */
  acknowledgeAlert(alertId: string): void {
    for (const [tenantId, alerts] of this.alerts.entries()) {
      const index = alerts.findIndex(a => a.id === alertId);
      if (index !== -1) {
        alerts[index].acknowledged = true;
        this.alerts.set(tenantId, alerts);
        break;
      }
    }
  }

  /**
   * 重置日使用量 (每天调用)
   */
  resetDailyUsage(tenantId?: string): void {
    if (tenantId) {
      this.dailyUsage.set(tenantId, 0);
    } else {
      this.dailyUsage.clear();
    }
  }

  /**
   * 重置月使用量 (每月调用)
   */
  resetMonthlyUsage(tenant?: string): void {
    if (tenant) {
      this.monthlyUsage.set(tenant, 0);
    } else {
      this.monthlyUsage.clear();
    }
  }
}

// ==================== 工厂函数 ====================

export function createUsageStatsCollector(maxRecords?: number): UsageStatsCollector {
  return new UsageStatsCollector();
}

export function createCostAlertManager(): CostAlertManager {
  return new CostAlertManager();
}
