import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeyPool, createApiKeyPool } from '../../../src/engine/tenant/ApiKeyPool';

describe('ApiKeyPool', () => {
  describe('selectKey', () => {
    it('should return available key for supported model', () => {
      const pool = createApiKeyPool({
        keys: [
          {
            provider: 'openai',
            key: 'sk-test-1',
            weight: 2,
            models: ['gpt-4', 'gpt-3.5-turbo'],
            limitPerMinute: 100,
            limitPerDay: 10000,
          },
          {
            provider: 'deepseek',
            key: 'sk-test-2',
            weight: 3,
            models: ['deepseek-chat'],
            limitPerMinute: 200,
            limitPerDay: 20000,
          },
        ],
      });

      const key = pool.selectKey('gpt-4');
      expect(key).toBeDefined();
      expect(key?.provider).toBe('openai');
    });

    it('should throw error when no key available', () => {
      const pool = createApiKeyPool({
        keys: [
          {
            provider: 'openai',
            key: 'sk-test-1',
            weight: 1,
            models: ['gpt-4'],
            limitPerMinute: 0,
            limitPerDay: 0,
          },
        ],
      });

      expect(() => pool.selectKey('gpt-4')).toThrow('No available API keys');
    });
  });

  describe('recordUsage', () => {
    it('should record usage correctly', () => {
      const pool = createApiKeyPool({
        keys: [
          {
            provider: 'openai',
            key: 'sk-test-1',
            weight: 1,
            models: ['gpt-4'],
            limitPerMinute: 100,
            limitPerDay: 10000,
          },
        ],
      });

      pool.recordUsage('sk-test-1', 1000);

      const usage = pool.getUsage('sk-test-1');
      expect(usage?.minute).toBe(1000);
    });
  });
});
