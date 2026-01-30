import { describe, it, expect, beforeEach } from 'vitest';
import { TenantContext, createTenantContext } from '../../../src/engine/tenant/TenantContext';

describe('TenantContext', () => {
  describe('createTenantContext', () => {
    it('should create context with valid tenant config', () => {
      const config = {
        tenantId: 'pet_hospital_001',
        ownerId: 'admin_001',
        plan: 'free' as const,
        apiKeys: [],
        limits: {
          dailyCost: 100,
          monthlyCost: 2000,
          requestsPerMinute: 1000,
        },
        permissions: ['triage:create', 'triage:view:own'],
      };

      const context = createTenantContext(config);

      expect(context.tenantId).toBe('pet_hospital_001');
      expect(context.ownerId).toBe('admin_001');
      expect(context.plan).toBe('free');
      expect(context.permissions).toContain('triage:create');
    });

    it('should throw error for invalid config', () => {
      expect(() => createTenantContext({
        tenantId: '',
        ownerId: 'admin_001',
        plan: 'free',
        apiKeys: [],
        limits: { dailyCost: 100, monthlyCost: 2000, requestsPerMinute: 1000 },
        permissions: [],
      })).toThrow('tenantId is required');
    });

    it('should check permission correctly', () => {
      const context = createTenantContext({
        tenantId: 'pet_hospital_001',
        ownerId: 'admin_001',
        plan: 'free',
        apiKeys: [],
        limits: { dailyCost: 100, monthlyCost: 2000, requestsPerMinute: 1000 },
        permissions: ['triage:create', 'triage:view:own'],
      });

      expect(context.hasPermission('triage:create')).toBe(true);
      expect(context.hasPermission('admin:settings')).toBe(false);
    });
  });
});
