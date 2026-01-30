import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, createRateLimiter } from '../../../src/engine/tenant/RateLimiter';

describe('RateLimiter', () => {
  describe('check', () => {
    it('should allow request within limits', () => {
      const limiter = createRateLimiter({
        user: {
          requestsPerMinute: 10,
          requestsPerHour: 200,
          requestsPerDay: 1000,
          tokensPerDay: 50000,
          costPerDay: 5,
        },
        tenant: {
          requestsPerMinute: 1000,
          requestsPerHour: 10000,
          tokensPerHour: 100000,
          costPerHour: 50,
          costPerDay: 200,
        },
      });

      const result = limiter.check('user_001', 'tenant_001', 0.01);
      expect(result.allowed).toBe(true);
    });

    it('should block request when over limits', () => {
      const limiter = createRateLimiter({
        user: {
          requestsPerMinute: 1,
          requestsPerHour: 200,
          requestsPerDay: 1000,
          tokensPerDay: 50000,
          costPerDay: 5,
        },
        tenant: {
          requestsPerMinute: 1000,
          requestsPerHour: 10000,
          tokensPerHour: 100000,
          costPerHour: 50,
          costPerDay: 200,
        },
      });

      // First request should be allowed
      let result = limiter.check('user_001', 'tenant_001', 0);
      expect(result.allowed).toBe(true);

      // Second request should be blocked (over per-minute limit)
      result = limiter.check('user_001', 'tenant_001', 0);
      expect(result.allowed).toBe(false);
      expect(result.violations).toContain('user:minute');
    });
  });
});
