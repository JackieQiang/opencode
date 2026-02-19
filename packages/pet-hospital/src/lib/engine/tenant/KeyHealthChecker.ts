// ==================== 类型定义 ====================

/**
 * Key 健康状态
 */
export interface KeyHealthStatus {
  keyId: string;
  key: string;
  isHealthy: boolean;
  lastCheck: Date;
  nextCheck: Date;
  errorCount: number;
  successCount: number;
  successRate: number;
  avgLatency: number;
  lastError?: string;
  consecutiveErrors: number;
  consecutiveSuccess: number;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  checkIntervalMs: number;       // 检查间隔 (默认 60000ms)
  timeoutMs: number;             // 请求超时 (默认 10000ms)
  maxErrors: number;             // 最大错误次数 (默认 5)
  maxConsecutiveErrors: number;  // 最大连续错误次数 (默认 3)
  minSuccessForRecovery: number; // 恢复所需最小成功次数 (默认 3)
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  keyId: string;
  isHealthy: boolean;
  latency: number;
  error?: string;
  timestamp: Date;
}

/**
 * Provider 验证器接口
 */
export interface ProviderValidator {
  provider: string;
  validate(key: string, timeoutMs?: number): Promise<boolean>;
}

// ==================== 健康检查器 ====================

/**
 * Key 健康检查器
 */
export class KeyHealthChecker {
  private healthStatus: Map<string, KeyHealthStatus> = new Map();
  private config: HealthCheckConfig;
  private validators: Map<string, ProviderValidator> = new Map();
  private checkTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<HealthCheckConfig>) {
    this.config = {
      checkIntervalMs: config?.checkIntervalMs || 60000,
      timeoutMs: config?.timeoutMs || 10000,
      maxErrors: config?.maxErrors || 5,
      maxConsecutiveErrors: config?.maxConsecutiveErrors || 3,
      minSuccessForRecovery: config?.minSuccessForRecovery || 3,
    };
  }

  /**
   * 注册 Provider 验证器
   */
  registerValidator(validator: ProviderValidator): void {
    this.validators.set(validator.provider, validator);
  }

  /**
   * 初始化 Key 健康状态
   */
  initializeKey(keyId: string, key: string): void {
    this.healthStatus.set(keyId, {
      keyId,
      key,
      isHealthy: true,
      lastCheck: new Date(),
      nextCheck: new Date(Date.now() + this.config.checkIntervalMs),
      errorCount: 0,
      successCount: 0,
      successRate: 100,
      avgLatency: 0,
      consecutiveErrors: 0,
      consecutiveSuccess: 0,
    });
  }

  /**
   * 记录请求结果
   */
  recordRequest(keyId: string, success: boolean, latency: number, error?: string): void {
    const status = this.healthStatus.get(keyId);
    if (!status) return;

    const now = Date.now();

    if (success) {
      status.successCount++;
      status.consecutiveSuccess++;
      status.consecutiveErrors = 0;

      // 连续成功后自动恢复
      if (!status.isHealthy && status.consecutiveSuccess >= this.config.minSuccessForRecovery) {
        status.isHealthy = true;
      }
    } else {
      status.errorCount++;
      status.consecutiveErrors++;
      status.consecutiveSuccess = 0;
      status.lastError = error;

      // 连续错误后标记不健康
      if (status.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        status.isHealthy = false;
      }
    }

    // 更新平均延迟
    status.avgLatency = (status.avgLatency * 0.9) + (latency * 0.1);

    // 更新成功率
    const total = status.successCount + status.errorCount;
    status.successRate = total > 0 ? (status.successCount / total) * 100 : 100;

    status.lastCheck = new Date(now);
    status.nextCheck = new Date(now + this.config.checkIntervalMs);
  }

  /**
   * 获取 Key 健康状态
   */
  getHealthStatus(keyId: string): KeyHealthStatus | undefined {
    return this.healthStatus.get(keyId);
  }

  /**
   * 获取所有健康状态
   */
  getAllHealthStatus(): KeyHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 执行健康检查
   */
  async checkKey(keyId: string): Promise<HealthCheckResult> {
    const status = this.healthStatus.get(keyId);
    if (!status) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const startTime = Date.now();
    const validator = this.validators.get(status.key.split('-')[0] || 'openai');

    try {
      let isHealthy = true;
      let error: string | undefined;

      if (validator) {
        isHealthy = await validator.validate(status.key, this.config.timeoutMs);
      } else {
        // 没有验证器时，检查连续错误数
        isHealthy = status.consecutiveErrors < this.config.maxConsecutiveErrors;
      }

      const latency = Date.now() - startTime;

      // 记录结果
      this.recordRequest(keyId, isHealthy, latency, error);

      return {
        keyId,
        isHealthy,
        latency,
        timestamp: new Date(),
      };
    } catch (err) {
      const latency = Date.now() - startTime;
      const error = err instanceof Error ? err.message : 'Unknown error';

      this.recordRequest(keyId, false, latency, error);

      return {
        keyId,
        isHealthy: false,
        latency,
        error,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量检查所有 Key
   */
  async checkAllKeys(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const keyId of this.healthStatus.keys()) {
      try {
        const result = await this.checkKey(keyId);
        results.push(result);
      } catch {
        // 忽略单个 Key 的检查错误
      }
    }

    return results;
  }

  /**
   * 启动定时健康检查
   */
  startPeriodicCheck(): void {
    // 清除已有的定时器
    this.stopPeriodicCheck();

    const interval = setInterval(() => {
      this.checkAllKeys().catch(console.error);
    }, this.config.checkIntervalMs);

    // 存储定时器引用
    this.checkTimers.set('periodic', interval);
  }

  /**
   * 停止定时健康检查
   */
  stopPeriodicCheck(): void {
    const timer = this.checkTimers.get('periodic');
    if (timer) {
      clearInterval(timer);
      this.checkTimers.delete('periodic');
    }
  }

  /**
   * 手动触发 Key 恢复
   */
  recoverKey(keyId: string): void {
    const status = this.healthStatus.get(keyId);
    if (status) {
      status.isHealthy = true;
      status.consecutiveErrors = 0;
      status.lastCheck = new Date();
      status.nextCheck = new Date(Date.now() + this.config.checkIntervalMs);
    }
  }

  /**
   * 手动标记 Key 不健康
   */
  markUnhealthy(keyId: string, reason?: string): void {
    const status = this.healthStatus.get(keyId);
    if (status) {
      status.isHealthy = false;
      status.consecutiveErrors++;
      status.lastError = reason || 'Manually marked unhealthy';
      status.lastCheck = new Date();
    }
  }

  /**
   * 获取健康统计
   */
  getHealthStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
    avgSuccessRate: number;
  } {
    const statuses = this.getAllHealthStatus();

    if (statuses.length === 0) {
      return { total: 0, healthy: 0, unhealthy: 0, avgSuccessRate: 0 };
    }

    const healthy = statuses.filter(s => s.isHealthy).length;
    const avgSuccessRate = statuses.reduce((sum, s) => sum + s.successRate, 0) / statuses.length;

    return {
      total: statuses.length,
      healthy,
      unhealthy: statuses.length - healthy,
      avgSuccessRate,
    };
  }
}

// ==================== 工厂函数 ====================

export function createHealthChecker(config?: Partial<HealthCheckConfig>): KeyHealthChecker {
  return new KeyHealthChecker(config);
}
