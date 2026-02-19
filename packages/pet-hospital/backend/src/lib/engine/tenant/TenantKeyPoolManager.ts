import { ApiKeyPool, PoolStats, SelectionStrategy } from './ApiKeyPool';
import { ApiKeyConfig } from './TenantContext';

/**
 * 租户 Key 池配置
 */
export interface TenantKeyPoolConfig {
  tenantId: string;
  sharedKeys: ApiKeyConfig[];     // 共享 Key 池（系统级）
  dedicatedKeys: ApiKeyConfig[];  // 独有 Key 池（租户专属）
  fallbackToShared: boolean;      // 独有池耗尽时是否使用共享池
}

/**
 * 租户 Key 池统计
 */
export interface TenantKeyPoolStats {
  tenantId: string;
  sharedPool: PoolStats;
  dedicatedPool: PoolStats;
  totalCost: number;
  failoverCount: number;
}

/**
 * 租户 Key 池管理器
 *
 * 功能：
 * - 支持共享 Key 池（系统级）和独有 Key 池（租户专属）
 * - 优先级：独有池 > 共享池
 * - 自动故障转移链
 * - 按租户隔离使用量统计
 */
export class TenantKeyPoolManager {
  private tenantId: string;
  private sharedPool: ApiKeyPool;
  private dedicatedPool: ApiKeyPool;
  private fallbackToShared: boolean;

  constructor(config: TenantKeyPoolConfig) {
    this.tenantId = config.tenantId;
    this.fallbackToShared = config.fallbackToShared !== false;

    // 初始化共享 Key 池
    this.sharedPool = new ApiKeyPool({
      keys: config.sharedKeys.map(k => ({ ...k, isShared: true })),
      failoverEnabled: true,
    });

    // 初始化独有 Key 池
    this.dedicatedPool = new ApiKeyPool({
      keys: config.dedicatedKeys.map(k => ({ ...k, isShared: false })),
      failoverEnabled: true,
    });
  }

  /**
   * 选择 API Key
   *
   * 优先级：
   * 1. 优先使用独有 Key 池
   * 2. 独有池无可用时，使用共享池
   * 3. 都不可用时抛出异常
   */
  selectKey(model: string, strategy: SelectionStrategy = SelectionStrategy.WEIGHTED): ApiKeyConfig {
    // 1. 首先尝试从独有池获取
    try {
      return this.dedicatedPool.selectKey(model, strategy);
    } catch {
      // 独有池不可用
    }

    // 2. 如果配置允许，使用共享池
    if (this.fallbackToShared) {
      try {
        return this.sharedPool.selectKey(model, strategy);
      } catch {
        // 共享池也不可用
      }
    }

    throw new Error(`No available API keys for model: ${model} (tenant: ${this.tenantId})`);
  }

  /**
   * 标记 Key 为不健康（触发故障转移）
   */
  markKeyUnhealthy(key: string): void {
    // 尝试在独有池中标记
    try {
      this.dedicatedPool.markKeyUnhealthy(key);
    } catch {
      // 不在独有池中
    }

    // 尝试在共享池中标记
    try {
      this.sharedPool.markKeyUnhealthy(key);
    } catch {
      // 不在共享池中
    }
  }

  /**
   * 标记 Key 为健康
   */
  markKeyHealthy(key: string): void {
    this.dedicatedPool.markKeyHealthy(key);
    this.sharedPool.markKeyHealthy(key);
  }

  /**
   * 记录使用量
   */
  recordUsage(key: string, tokens: number, success: boolean, latency: number): void {
    // 判断 Key 属于哪个池
    const isShared = this.isSharedKey(key);

    if (isShared) {
      this.sharedPool.recordUsage(key, tokens, success, latency);
    } else {
      this.dedicatedPool.recordUsage(key, tokens, success, latency);
    }
  }

  /**
   * 判断是否为共享 Key
   */
  private isSharedKey(key: string): boolean {
    const dedicatedKeys = this.dedicatedPool.getKeys();
    return !dedicatedKeys.some(k => k.key === key);
  }

  /**
   * 获取租户统计信息
   */
  getStats(): TenantKeyPoolStats {
    const sharedStats = this.sharedPool.getPoolStats();
    const dedicatedStats = this.dedicatedPool.getPoolStats();

    return {
      tenantId: this.tenantId,
      sharedPool: sharedStats,
      dedicatedPool: dedicatedStats,
      totalCost: sharedStats.totalCost + dedicatedStats.totalCost,
      failoverCount: sharedStats.failoverCount + dedicatedStats.failoverCount,
    };
  }

  /**
   * 获取共享池统计
   */
  getSharedPoolStats(): PoolStats {
    return this.sharedPool.getPoolStats();
  }

  /**
   * 获取独有池统计
   */
  getDedicatedPoolStats(): PoolStats {
    return this.dedicatedPool.getPoolStats();
  }

  /**
   * 检查模型是否支持
   */
  supportsModel(model: string): boolean {
    return this.dedicatedPool.supportsModel(model) || this.sharedPool.supportsModel(model);
  }

  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): string[] {
    const dedicatedModels = this.dedicatedPool.getModels();
    const sharedModels = this.sharedPool.getModels();
    return [...new Set([...dedicatedModels, ...sharedModels])];
  }

  /**
   * 更新独有 Keys
   */
  updateDedicatedKeys(keys: ApiKeyConfig[]): void {
    this.dedicatedPool = new ApiKeyPool({
      keys: keys.map(k => ({ ...k, isShared: false })),
      failoverEnabled: true,
    });
  }

  /**
   * 更新共享 Keys
   */
  updateSharedKeys(keys: ApiKeyConfig[]): void {
    this.sharedPool = new ApiKeyPool({
      keys: keys.map(k => ({ ...k, isShared: true })),
      failoverEnabled: true,
    });
  }

  /**
   * 获取租户 ID
   */
  getTenantId(): string {
    return this.tenantId;
  }
}

/**
 * 全局 Key 池管理器
 *
 * 管理所有租户的 Key 池
 */
export class GlobalKeyPoolManager {
  private tenantPools: Map<string, TenantKeyPoolManager> = new Map();
  private sharedPoolConfig: ApiKeyConfig[] = [];

  /**
   * 设置全局共享 Key 池
   */
  setSharedPool(keys: ApiKeyConfig[]): void {
    this.sharedPoolConfig = keys;

    // 更新所有租户的共享池
    for (const pool of this.tenantPools.values()) {
      pool.updateSharedKeys(keys);
    }
  }

  /**
   * 创建租户 Key 池
   */
  createTenantPool(tenantId: string, dedicatedKeys: ApiKeyConfig[]): TenantKeyPoolManager {
    const pool = new TenantKeyPoolManager({
      tenantId,
      sharedKeys: this.sharedPoolConfig,
      dedicatedKeys,
      fallbackToShared: true,
    });

    this.tenantPools.set(tenantId, pool);
    return pool;
  }

  /**
   * 获取租户 Key 池
   */
  getTenantPool(tenantId: string): TenantKeyPoolManager | undefined {
    return this.tenantPools.get(tenantId);
  }

  /**
   * 删除租户 Key 池
   */
  deleteTenantPool(tenantId: string): void {
    this.tenantPools.delete(tenantId);
  }

  /**
   * 获取所有租户统计
   */
  getAllTenantStats(): TenantKeyPoolStats[] {
    const stats: TenantKeyPoolStats[] = [];
    for (const pool of this.tenantPools.values()) {
      stats.push(pool.getStats());
    }
    return stats;
  }
}

// ==================== 工厂函数 ====================

export function createTenantKeyPoolManager(config: TenantKeyPoolConfig): TenantKeyPoolManager {
  return new TenantKeyPoolManager(config);
}

export function createGlobalKeyPoolManager(): GlobalKeyPoolManager {
  return new GlobalKeyPoolManager();
}
