import { describe, it, expect, beforeEach } from 'vitest';
import {
  TenantKeyPoolManager,
  createTenantKeyPoolManager,
  GlobalKeyPoolManager,
  createGlobalKeyPoolManager,
  type TenantKeyPoolConfig,
} from '../../../src/lib/engine/tenant/TenantKeyPoolManager';
import { SelectionStrategy } from '../../../src/lib/engine/tenant/ApiKeyPool';

describe('TenantKeyPoolManager', () => {
  let manager: TenantKeyPoolManager;

  const sharedKeys = [
    {
      provider: 'openai' as const,
      key: 'sk-shared-1',
      weight: 1,
      models: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'], // 添加支持 claude-3-opus
      limitPerMinute: 100,
      limitPerDay: 10000,
    },
  ];

  const dedicatedKeys = [
    {
      provider: 'anthropic' as const,
      key: 'sk-dedicated-1',
      weight: 2,
      models: ['claude-3-opus', 'claude-3-sonnet'],
      limitPerMinute: 50,
      limitPerDay: 5000,
    },
  ];

  beforeEach(() => {
    const config: TenantKeyPoolConfig = {
      tenantId: 'tenant-1',
      sharedKeys,
      dedicatedKeys,
      fallbackToShared: true,
    };
    manager = createTenantKeyPoolManager(config);
  });

  describe('selectKey', () => {
    it('should优先使用独有池的key', () => {
      // 独有池有 anthropic key，支持 claude 模型
      const key = manager.selectKey('claude-3-opus');
      expect(key).toBeDefined();
      expect(key.provider).toBe('anthropic');
      expect(key.key).toBe('sk-dedicated-1');
    });

    it('should在独有池无可用时fallback到共享池', () => {
      // 创建一个没有独有keys的manager
      const config: TenantKeyPoolConfig = {
        tenantId: 'tenant-2',
        sharedKeys,
        dedicatedKeys: [], // 空独有池
        fallbackToShared: true,
      };
      const mgr = createTenantKeyPoolManager(config);

      // 应该fallback到共享池
      const key = mgr.selectKey('gpt-4');
      expect(key).toBeDefined();
      expect(key.provider).toBe('openai');
    });

    it('should在fallbackToShared为false时抛出异常', () => {
      const config: TenantKeyPoolConfig = {
        tenantId: 'tenant-3',
        sharedKeys,
        dedicatedKeys: [],
        fallbackToShared: false,
      };
      const mgr = createTenantKeyPoolManager(config);

      expect(() => mgr.selectKey('gpt-4')).toThrow('No available API keys');
    });

    it('should选择不支持的模型时抛出异常', () => {
      expect(() => manager.selectKey('unknown-model')).toThrow();
    });
  });

  describe('supportsModel', () => {
    it('should支持来自独有池的模型', () => {
      expect(manager.supportsModel('claude-3-opus')).toBe(true);
    });

    it('should支持来自共享池的模型', () => {
      expect(manager.supportsModel('gpt-4')).toBe(true);
    });

    it('should返回false对于不支持的模型', () => {
      expect(manager.supportsModel('unknown-model')).toBe(false);
    });
  });

  describe('getSupportedModels', () => {
    it('should返回所有支持的模型', () => {
      const models = manager.getSupportedModels();
      expect(models).toContain('claude-3-opus');
      expect(models).toContain('gpt-4');
    });
  });

  describe('getStats', () => {
    it('should返回正确的租户统计', () => {
      const stats = manager.getStats();
      expect(stats.tenantId).toBe('tenant-1');
      expect(stats.sharedPool).toBeDefined();
      expect(stats.dedicatedPool).toBeDefined();
    });
  });

  describe('markKeyUnhealthy', () => {
    it('should标记key为不健康并触发故障转移', () => {
      // 标记独有key为不健康
      manager.markKeyUnhealthy('sk-dedicated-1');

      // 再次选择时应该fallback到共享池
      const key = manager.selectKey('claude-3-opus');
      expect(key.key).toBe('sk-shared-1');
    });
  });

  describe('recordUsage', () => {
    it('should正确记录使用量', () => {
      manager.recordUsage('sk-dedicated-1', 1000, true, 100);

      const stats = manager.getDedicatedPoolStats();
      expect(stats.totalTokens).toBe(1000);
    });
  });

  describe('updateDedicatedKeys', () => {
    it('should更新独有keys', () => {
      manager.updateDedicatedKeys([
        {
          provider: 'deepseek' as const,
          key: 'sk-new-dedicated',
          weight: 1,
          models: ['deepseek-chat'],
          limitPerMinute: 100,
          limitPerDay: 10000,
        },
      ]);

      expect(manager.supportsModel('deepseek-chat')).toBe(true);
    });
  });
});

describe('GlobalKeyPoolManager', () => {
  let globalManager: GlobalKeyPoolManager;

  const sharedKeys = [
    {
      provider: 'openai' as const,
      key: 'sk-global-1',
      weight: 1,
      models: ['gpt-4'],
      limitPerMinute: 1000,
      limitPerDay: 100000,
    },
  ];

  beforeEach(() => {
    globalManager = createGlobalKeyPoolManager();
    globalManager.setSharedPool(sharedKeys);
  });

  describe('createTenantPool', () => {
    it('should创建租户池并设置共享keys', () => {
      const pool = globalManager.createTenantPool('tenant-1', []);

      expect(pool).toBeDefined();
      expect(pool.supportsModel('gpt-4')).toBe(true);
    });
  });

  describe('getTenantPool', () => {
    it('should返回已创建的租户池', () => {
      globalManager.createTenantPool('tenant-1', []);
      const pool = globalManager.getTenantPool('tenant-1');

      expect(pool).toBeDefined();
    });

    it('should返回undefined对于不存在的租户', () => {
      const pool = globalManager.getTenantPool('non-existent');
      expect(pool).toBeUndefined();
    });
  });

  describe('deleteTenantPool', () => {
    it('should删除租户池', () => {
      globalManager.createTenantPool('tenant-1', []);
      globalManager.deleteTenantPool('tenant-1');

      const pool = globalManager.getTenantPool('tenant-1');
      expect(pool).toBeUndefined();
    });
  });

  describe('getAllTenantStats', () => {
    it('should返回所有租户的统计', () => {
      globalManager.createTenantPool('tenant-1', []);
      globalManager.createTenantPool('tenant-2', []);

      const stats = globalManager.getAllTenantStats();
      expect(stats).toHaveLength(2);
    });
  });
});
