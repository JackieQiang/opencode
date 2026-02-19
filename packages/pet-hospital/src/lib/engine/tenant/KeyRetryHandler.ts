// ==================== 类型定义 ====================

/**
 * 重试策略
 */
export type RetryStrategy = 'immediate' | 'linear' | 'exponential';

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;              // 最大重试次数 (默认 3)
  initialDelayMs: number;           // 初始延迟 (默认 1000ms)
  maxDelayMs: number;              // 最大延迟 (默认 30000ms)
  backoffMultiplier: number;       // 退避倍数 (默认 2)
  retryableErrors: string[];       // 可重试的错误类型
  strategy: RetryStrategy;         // 重试策略
}

/**
 * 故障转移配置
 */
export interface FailoverConfig {
  enabled: boolean;                 // 是否启用故障转移
  maxFailoverAttempts: number;     // 最大故障转移次数
  failoverDelayMs: number;          // 故障转移延迟
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalLatency: number;
  failoverAttempts: number;
}

/**
 * 故障转移链项
 */
export interface FailoverChainItem {
  poolType: 'dedicated' | 'shared';
  provider?: string;
  model?: string;
}

/**
 * 可重试错误
 */
export const RETRYABLE_ERRORS = [
  'rate_limit',
  'timeout',
  'server_error',
  'service_unavailable',
  'network_error',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ENETUNREACH',
];

// ==================== 重试处理器 ====================

/**
 * Key 重试处理器
 */
export class KeyRetryHandler {
  private retryConfig: RetryConfig;
  private failoverConfig: FailoverConfig;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    failoverConfig?: Partial<FailoverConfig>
  ) {
    this.retryConfig = {
      maxRetries: retryConfig?.maxRetries ?? 3,
      initialDelayMs: retryConfig?.initialDelayMs ?? 1000,
      maxDelayMs: retryConfig?.maxDelayMs ?? 30000,
      backoffMultiplier: retryConfig?.backoffMultiplier ?? 2,
      retryableErrors: retryConfig?.retryableErrors ?? RETRYABLE_ERRORS,
      strategy: retryConfig?.strategy ?? 'exponential',
    };

    this.failoverConfig = {
      enabled: failoverConfig?.enabled ?? true,
      maxFailoverAttempts: failoverConfig?.maxFailoverAttempts ?? 3,
      failoverDelayMs: failoverConfig?.failoverDelayMs ?? 500,
    };
  }

  /**
   * 检查错误是否可重试
   */
  isRetryable(error: string | Error): boolean {
    const errorStr = error instanceof Error ? error.message : error;
    return this.retryConfig.retryableErrors.some(e =>
      errorStr.toLowerCase().includes(e.toLowerCase())
    );
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.retryConfig.strategy) {
      case 'immediate':
        delay = 0;
        break;
      case 'linear':
        delay = this.retryConfig.initialDelayMs * attempt;
        break;
      case 'exponential':
      default:
        delay = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelayMs
        );
        break;
    }

    // 添加随机抖动 (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }

  /**
   * 执行带重试的操作
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts <= this.retryConfig.maxRetries) {
      attempts++;

      try {
        const data = await operation();
        return {
          success: true,
          data,
          attempts,
          totalLatency: Date.now() - startTime,
          failoverAttempts: 0,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否还有重试机会
        if (attempts > this.retryConfig.maxRetries || !this.isRetryable(lastError)) {
          return {
            success: false,
            error: lastError.message,
            attempts,
            totalLatency: Date.now() - startTime,
            failoverAttempts: 0,
          };
        }

        // 调用重试回调
        if (onRetry) {
          onRetry(attempts, lastError);
        }

        // 等待后重试
        const delay = this.calculateDelay(attempts);
        if (delay > 0) {
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      totalLatency: Date.now() - startTime,
      failoverAttempts: 0,
    };
  }

  /**
   * 执行带故障转移的操作
   */
  async executeWithFailover<T>(
    failoverChain: FailoverChainItem[],
    operation: (item: FailoverChainItem) => Promise<T>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let failoverAttempts = 0;
    let lastError: Error | undefined;

    for (const item of failoverChain) {
      if (!this.failoverConfig.enabled || failoverAttempts >= this.failoverConfig.maxFailoverAttempts) {
        break;
      }

      failoverAttempts++;

      try {
        const data = await operation(item);
        return {
          success: true,
          data,
          attempts: 1,
          totalLatency: Date.now() - startTime,
          failoverAttempts: failoverAttempts - 1,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 延迟后尝试下一个
        if (failoverAttempts < failoverChain.length) {
          await this.sleep(this.failoverConfig.failoverDelayMs);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'All failover attempts exhausted',
      attempts: failoverAttempts,
      totalLatency: Date.now() - startTime,
      failoverAttempts,
    };
  }

  /**
   * 执行带重试和故障转移的操作
   */
  async execute<T>(
    failoverChain: FailoverChainItem[],
    operation: (item: FailoverChainItem) => Promise<T>
  ): Promise<RetryResult<T>> {
    // 先尝试故障转移
    const failoverResult = await this.executeWithFailover(failoverChain, operation);

    if (failoverResult.success) {
      return failoverResult;
    }

    // 如果故障转移失败，尝试重试整个流程
    return this.executeWithRetry(async () => {
      const result = await this.executeWithFailover(failoverChain, operation);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data!;
    });
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取重试配置
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * 获取故障转移配置
   */
  getFailoverConfig(): FailoverConfig {
    return { ...this.failoverConfig };
  }

  /**
   * 更新重试配置
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * 更新故障转移配置
   */
  updateFailoverConfig(config: Partial<FailoverConfig>): void {
    this.failoverConfig = { ...this.failoverConfig, ...config };
  }
}

// ==================== 工厂函数 ====================

export function createRetryHandler(
  retryConfig?: Partial<RetryConfig>,
  failoverConfig?: Partial<FailoverConfig>
): KeyRetryHandler {
  return new KeyRetryHandler(retryConfig, failoverConfig);
}
