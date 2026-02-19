import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditLogger,
  createAuditLogger,
  type AuditAction,
} from '../../../src/lib/engine/tenant/AuditLogger';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = createAuditLogger();
  });

  describe('log', () => {
    it('should create audit log entry', () => {
      const log = auditLogger.log({
        tenantId: 'tenant-1',
        userId: 'user-1',
        action: 'key_added',
        resource: 'api_key',
        resourceId: 'key-1',
      });

      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeDefined();
      expect(log.tenantId).toBe('tenant-1');
      expect(log.action).toBe('key_added');
    });
  });

  describe('logKeyUsed', () => {
    it('should log key usage', () => {
      const log = auditLogger.logKeyUsed({
        tenantId: 'tenant-1',
        userId: 'user-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        tokens: 1000,
        cost: 0.01,
        latency: 500,
        success: true,
      });

      expect(log.action).toBe('key_used');
      expect(log.keyId).toBe('key-1');
      expect(log.tokens).toBe(1000);
      expect(log.success).toBe(true);
    });

    it('should log failed key usage', () => {
      const log = auditLogger.logKeyUsed({
        tenantId: 'tenant-1',
        keyId: 'key-1',
        provider: 'openai',
        model: 'gpt-4',
        tokens: 0,
        cost: 0,
        latency: 100,
        success: false,
        error: 'rate_limit',
      });

      expect(log.success).toBe(false);
      expect(log.error).toBe('rate_limit');
    });
  });

  describe('logKeyAdded', () => {
    it('should log key addition', () => {
      const log = auditLogger.logKeyAdded({
        tenantId: 'tenant-1',
        userId: 'user-1',
        keyId: 'key-1',
        provider: 'openai',
      });

      expect(log.action).toBe('key_added');
      expect(log.resourceId).toBe('key-1');
    });
  });

  describe('logKeyRemoved', () => {
    it('should log key removal', () => {
      const log = auditLogger.logKeyRemoved({
        tenantId: 'tenant-1',
        userId: 'user-1',
        keyId: 'key-1',
        reason: 'Expired',
      });

      expect(log.action).toBe('key_removed');
      expect(log.metadata?.reason).toBe('Expired');
    });
  });

  describe('logKeyRotated', () => {
    it('should log key rotation', () => {
      const log = auditLogger.logKeyRotated({
        tenantId: 'tenant-1',
        userId: 'user-1',
        keyId: 'key-new',
        oldKeyId: 'key-old',
      });

      expect(log.action).toBe('key_rotated');
      expect(log.changes?.oldKeyId).toBeDefined();
    });
  });

  describe('query', () => {
    it('should query logs by tenant', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyAdded({ tenantId: 'tenant-2', keyId: 'key-2', provider: 'openai' });

      const logs = auditLogger.query({ tenantId: 'tenant-1' });
      expect(logs).toHaveLength(1);
      expect(logs[0].tenantId).toBe('tenant-1');
    });

    it('should query logs by action', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyRemoved({ tenantId: 'tenant-1', keyId: 'key-2' });

      const logs = auditLogger.query({ action: 'key_added' as AuditAction });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('key_added');
    });

    it('should support pagination', () => {
      for (let i = 0; i < 10; i++) {
        auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: `key-${i}`, provider: 'openai' });
      }

      const logs = auditLogger.query({ tenantId: 'tenant-1', limit: 5, offset: 0 });
      expect(logs).toHaveLength(5);
    });

    it('should filter by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });

      const logs = auditLogger.query({
        tenantId: 'tenant-1',
        startTime: oneHourAgo,
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyRemoved({ tenantId: 'tenant-1', keyId: 'key-2' });
      auditLogger.logKeyAdded({ tenantId: 'tenant-2', keyId: 'key-3', provider: 'anthropic' });

      const stats = auditLogger.getStats();

      expect(stats.totalCount).toBe(3);
      expect(stats.actionCounts['key_added']).toBe(2);
      expect(stats.actionCounts['key_removed']).toBe(1);
      expect(stats.tenantCounts['tenant-1']).toBe(2);
      expect(stats.tenantCounts['tenant-2']).toBe(1);
    });
  });

  describe('export', () => {
    it('should export as JSON', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });

      const json = auditLogger.export({ tenantId: 'tenant-1', format: 'json' });
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should export as CSV', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });

      const csv = auditLogger.export({ tenantId: 'tenant-1', format: 'csv' });

      expect(csv).toContain('id,timestamp,tenantId');
      expect(csv).toContain('key-1');
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.clear();

      expect(auditLogger.count()).toBe(0);
    });

    it('should clear by tenant', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyAdded({ tenantId: 'tenant-2', keyId: 'key-2', provider: 'openai' });

      auditLogger.clear('tenant-1');

      expect(auditLogger.count('tenant-1')).toBe(0);
      expect(auditLogger.count('tenant-2')).toBe(1);
    });
  });

  describe('count', () => {
    it('should return total count', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-2', provider: 'openai' });

      expect(auditLogger.count()).toBe(2);
    });

    it('should return count by tenant', () => {
      auditLogger.logKeyAdded({ tenantId: 'tenant-1', keyId: 'key-1', provider: 'openai' });
      auditLogger.logKeyAdded({ tenantId: 'tenant-2', keyId: 'key-2', provider: 'openai' });

      expect(auditLogger.count('tenant-1')).toBe(1);
    });
  });
});
