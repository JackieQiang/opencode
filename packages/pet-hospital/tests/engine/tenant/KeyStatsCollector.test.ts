import { describe, it, expect, beforeEach } from 'vitest';
import {
  UsageStatsCollector,
  CostAlertManager,
  createUsageStatsCollector,
  createCostAlertManager,
  PROVIDER_COSTS,
} from '../../../src/lib/engine/tenant/KeyStatsCollector';

describe('UsageStatsCollector', () => {
  let collector: UsageStatsCollector;

  beforeEach(() => {
    collector = createUsageStatsCollector();
  });

  describe('record', () => {
    it('should record usage correctly', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 1000,
        outputTokens: 2000,
        latency: 500,
        success: true,
      });

      const stats = collector.getDetailedStats('tenant-1');
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRequests).toBe(1);
      expect(stats.totalTokens).toBe(3000);
    });

    it('should calculate cost correctly', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 1000000, // 1M tokens
        outputTokens: 1000000,
        latency: 500,
        success: true,
      });

      const stats = collector.getDetailedStats('tenant-1');
      // 1M input @ $0.01/1M + 1M output @ $0.03/1M = $0.04
      expect(stats.totalCost).toBeCloseTo(0.04, 2);
    });

    it('should track failed requests', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 0,
        latency: 100,
        success: false,
        error: 'rate_limit',
      });

      const stats = collector.getDetailedStats('tenant-1');
      expect(stats.totalRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('getDetailedStats', () => {
    it('should aggregate multiple requests', () => {
      // Record multiple requests
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 200,
        latency: 500,
        success: true,
      });

      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-2',
        provider: 'anthropic',
        model: 'claude-3',
        inputTokens: 300,
        outputTokens: 400,
        latency: 600,
        success: true,
      });

      const stats = collector.getDetailedStats('tenant-1');

      expect(stats.totalRequests).toBe(2);
      expect(stats.successRate).toBe(100);
      expect(stats.totalTokens).toBe(1000);
      expect(stats.costByProvider.openai).toBeDefined();
      expect(stats.costByProvider.anthropic).toBeDefined();
    });

    it('should filter by tenant', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 0,
        latency: 100,
        success: true,
      });

      collector.record({
        tenantId: 'tenant-2',
        keyId: 'key-2',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 200,
        outputTokens: 0,
        latency: 100,
        success: true,
      });

      const stats1 = collector.getDetailedStats('tenant-1');
      const stats2 = collector.getDetailedStats('tenant-2');

      expect(stats1.totalRequests).toBe(1);
      expect(stats2.totalRequests).toBe(1);
    });

    it('should calculate latency percentiles', () => {
      // Record requests with different latencies
      for (let i = 0; i < 100; i++) {
        collector.record({
          tenantId: 'tenant-1',
          keyId: 'key-1',
          provider: 'openai',
          model: 'gpt-4',
          inputTokens: 100,
          outputTokens: 0,
          latency: i + 1, // 1-100ms
          success: true,
        });
      }

      const stats = collector.getDetailedStats('tenant-1');

      expect(stats.minLatency).toBe(1);
      expect(stats.maxLatency).toBe(100);
      expect(stats.p50Latency).toBeCloseTo(50, 0);
      expect(stats.p95Latency).toBeCloseTo(95, 0);
      expect(stats.p99Latency).toBeCloseTo(99, 0);
    });
  });

  describe('clear', () => {
    it('should clear all records', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 0,
        latency: 100,
        success: true,
      });

      collector.clear();

      const stats = collector.getDetailedStats();
      expect(stats.totalRequests).toBe(0);
    });

    it('should clear by tenant', () => {
      collector.record({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 0,
        latency: 100,
        success: true,
      });

      collector.record({
        tenantId: 'tenant-2',
        keyId: 'key-2',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 200,
        outputTokens: 0,
        latency: 100,
        success: true,
      });

      collector.clear('tenant-1');

      expect(collector.getDetailedStats('tenant-1').totalRequests).toBe(0);
      expect(collector.getDetailedStats('tenant-2').totalRequests).toBe(1);
    });
  });
});

describe('CostAlertManager', () => {
  let alertManager: CostAlertManager;

  beforeEach(() => {
    alertManager = createCostAlertManager();
    alertManager.setAlertConfig('tenant-1', {
      tenantId: 'tenant-1',
      dailyBudget: 100,
      monthlyBudget: 2000,
      alertThresholds: [50, 80, 90, 100],
    });
  });

  describe('recordUsage', () => {
    it('should track daily usage', () => {
      alertManager.recordUsage('tenant-1', 10);
      alertManager.recordUsage('tenant-1', 20);

      const stats = alertManager.getCostStats('tenant-1');
      expect(stats?.dailyUsage).toBe(30);
    });

    it('should track monthly usage', () => {
      alertManager.recordUsage('tenant-1', 100);
      alertManager.recordUsage('tenant-1', 200);

      const stats = alertManager.getCostStats('tenant-1');
      expect(stats?.monthlyUsage).toBe(300);
    });
  });

  describe('alerts', () => {
    it('should trigger alert at 80% threshold', () => {
      alertManager.recordUsage('tenant-1', 80); // 80% of 100

      const stats = alertManager.getCostStats('tenant-1');
      // 会触发 50% 和 80% 两个预警（因为 80 >= 50 和 80 >= 80）
      expect(stats?.alerts.length).toBe(2);
      const thresholds = stats?.alerts.map(a => a.threshold);
      expect(thresholds).toContain(50);
      expect(thresholds).toContain(80);
    });

    it('should trigger critical alert at 100%', () => {
      alertManager.recordUsage('tenant-1', 100);

      const stats = alertManager.getCostStats('tenant-1');
      const criticalAlert = stats?.alerts.find(a => a.alertType === 'critical');
      expect(criticalAlert).toBeDefined();
    });

    it('should acknowledge alert', () => {
      alertManager.recordUsage('tenant-1', 80);

      const stats = alertManager.getCostStats('tenant-1');
      const alertId = stats?.alerts[0].id;

      if (alertId) {
        alertManager.acknowledgeAlert(alertId);

        const updatedStats = alertManager.getCostStats('tenant-1');
        // 确认一个预警后，还剩一个（50%的被确认，80%的还在）
        expect(updatedStats?.alerts.length).toBe(1);
      }
    });
  });

  describe('reset', () => {
    it('should reset daily usage', () => {
      alertManager.recordUsage('tenant-1', 50);
      alertManager.resetDailyUsage('tenant-1');

      const stats = alertManager.getCostStats('tenant-1');
      expect(stats?.dailyUsage).toBe(0);
    });

    it('should reset monthly usage', () => {
      alertManager.recordUsage('tenant-1', 1000);
      alertManager.resetMonthlyUsage('tenant-1');

      const stats = alertManager.getCostStats('tenant-1');
      expect(stats?.monthlyUsage).toBe(0);
    });
  });
});

describe('PROVIDER_COSTS', () => {
  it('should have correct costs for OpenAI', () => {
    expect(PROVIDER_COSTS.openai.inputCostPerToken).toBe(0.01);
    expect(PROVIDER_COSTS.openai.outputCostPerToken).toBe(0.03);
  });

  it('should have correct costs for Anthropic', () => {
    expect(PROVIDER_COSTS.anthropic.inputCostPerToken).toBe(0.015);
    expect(PROVIDER_COSTS.anthropic.outputCostPerToken).toBe(0.075);
  });

  it('should have correct costs for DeepSeek', () => {
    expect(PROVIDER_COSTS.deepseek.inputCostPerToken).toBe(0.01);
    expect(PROVIDER_COSTS.deepseek.outputCostPerToken).toBe(0.03);
  });
});
