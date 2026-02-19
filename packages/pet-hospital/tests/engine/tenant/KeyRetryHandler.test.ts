import { describe, it, expect, beforeEach } from 'vitest';
import {
  KeyRetryHandler,
  createRetryHandler,
  type RetryConfig,
  type FailoverChainItem,
} from '../../../src/lib/engine/tenant/KeyRetryHandler';

describe('KeyRetryHandler', () => {
  let retryHandler: KeyRetryHandler;

  beforeEach(() => {
    retryHandler = createRetryHandler({
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      strategy: 'exponential',
    });
  });

  describe('isRetryable', () => {
    it('should return true for rate_limit error', () => {
      expect(retryHandler.isRetryable('rate_limit')).toBe(true);
    });

    it('should return true for timeout error', () => {
      expect(retryHandler.isRetryable('timeout')).toBe(true);
    });

    it('should return true for server_error', () => {
      expect(retryHandler.isRetryable('server_error')).toBe(true);
    });

    it('should return false for non-retryable error', () => {
      expect(retryHandler.isRetryable('invalid_api_key')).toBe(false);
    });

    it('should return true for error message containing retryable keyword', () => {
      expect(retryHandler.isRetryable('rate_limit exceeded')).toBe(true);
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first try', async () => {
      const result = await retryHandler.executeWithRetry(async () => {
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await retryHandler.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('rate_limit');
        }
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      const result = await retryHandler.executeWithRetry(async () => {
        throw new Error('rate_limit');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('rate_limit');
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
    });

    it('should not retry non-retryable errors', async () => {
      const result = await retryHandler.executeWithRetry(async () => {
        throw new Error('invalid_api_key');
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('executeWithFailover', () => {
    it('should succeed with first item', async () => {
      const chain: FailoverChainItem[] = [
        { poolType: 'dedicated', provider: 'openai' },
        { poolType: 'shared', provider: 'openai' },
      ];

      const result = await retryHandler.executeWithFailover(chain, async (item) => {
        return `used ${item.poolType}`;
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('used dedicated');
      expect(result.failoverAttempts).toBe(0);
    });

    it('should failover to next item on failure', async () => {
      let attemptCount = 0;
      const chain: FailoverChainItem[] = [
        { poolType: 'dedicated', provider: 'openai' },
        { poolType: 'shared', provider: 'openai' },
      ];

      const result = await retryHandler.executeWithFailover(chain, async (item) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('rate_limit');
        }
        return `used ${item.poolType}`;
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('used shared');
      expect(result.failoverAttempts).toBe(1);
    });

    it('should fail when all items fail', async () => {
      const chain: FailoverChainItem[] = [
        { poolType: 'dedicated', provider: 'openai' },
        { poolType: 'shared', provider: 'openai' },
      ];

      const result = await retryHandler.executeWithFailover(chain, async () => {
        throw new Error('rate_limit');
      });

      expect(result.success).toBe(false);
      expect(result.failoverAttempts).toBe(2);
    });
  });

  describe('execute (with retry + failover)', () => {
    it('should succeed with retry and failover', async () => {
      let attemptCount = 0;
      const chain: FailoverChainItem[] = [
        { poolType: 'dedicated', provider: 'openai' },
        { poolType: 'shared', provider: 'openai' },
      ];

      const result = await retryHandler.execute(chain, async (item) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('rate_limit');
        }
        return `success with ${item.poolType}`;
      });

      expect(result.success).toBe(true);
    });
  });

  describe('config updates', () => {
    it('should allow config updates', () => {
      const config = retryHandler.getRetryConfig();
      expect(config.maxRetries).toBe(3);

      retryHandler.updateRetryConfig({ maxRetries: 5 });
      const updatedConfig = retryHandler.getRetryConfig();
      expect(updatedConfig.maxRetries).toBe(5);
    });
  });
});
