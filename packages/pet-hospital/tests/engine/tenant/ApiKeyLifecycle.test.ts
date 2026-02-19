import { describe, it, expect, beforeEach } from 'vitest';
import {
  KeyEncryptionService,
  ApiKeyRepository,
  createEncryptionService,
  createApiKeyRepository,
  type ApiKeyCreateConfig,
} from '../../../src/lib/engine/tenant/ApiKeyLifecycle';

describe('KeyEncryptionService', () => {
  let encryptionService: KeyEncryptionService;

  beforeEach(() => {
    encryptionService = createEncryptionService();
  });

  describe('encrypt', () => {
    it('should encrypt API key', () => {
      const plainKey = 'sk-test-1234567890';
      const encrypted = encryptionService.encrypt(plainKey);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainKey);
      expect(encrypted).toBe(Buffer.from(plainKey).toString('base64'));
    });

    it('should return different output for different inputs', () => {
      const key1 = 'sk-test-111';
      const key2 = 'sk-test-222';

      const encrypted1 = encryptionService.encrypt(key1);
      const encrypted2 = encryptionService.encrypt(key2);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted key', () => {
      const plainKey = 'sk-test-1234567890';
      const encrypted = encryptionService.encrypt(plainKey);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plainKey);
    });
  });

  describe('getFingerprint', () => {
    it('should generate correct fingerprint', () => {
      const fingerprint = encryptionService.getFingerprint('sk-test-1234567890');
      expect(fingerprint).toBe('sk-t***7890');
    });

    it('should handle short keys', () => {
      const fingerprint = encryptionService.getFingerprint('sk');
      expect(fingerprint).toBe('****');
    });
  });
});

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  let encryptionService: KeyEncryptionService;

  beforeEach(() => {
    repository = createApiKeyRepository();
    encryptionService = createEncryptionService();
  });

  describe('create', () => {
    it('should create API key', async () => {
      const config: ApiKeyCreateConfig = {
        key: 'sk-test-1234567890',
        provider: 'openai',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        isShared: false,
        tenantId: 'tenant-1',
        name: 'Test Key',
      };

      const apiKey = await repository.create(config, encryptionService);

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.provider).toBe('openai');
      expect(apiKey.models).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      expect(apiKey.status).toBe('active');
      expect(apiKey.isShared).toBe(false);
      expect(apiKey.tenantId).toBe('tenant-1');
    });

    it('should encrypt key when storing', async () => {
      const config: ApiKeyCreateConfig = {
        key: 'sk-secret-key',
        provider: 'anthropic',
        models: ['claude-3'],
      };

      const apiKey = await repository.create(config, encryptionService);

      // Key should be encrypted (base64 encoded)
      expect(apiKey.key).not.toBe('sk-secret-key');
    });
  });

  describe('getById', () => {
    it('should return key by id', async () => {
      const config: ApiKeyCreateConfig = {
        key: 'sk-test',
        provider: 'openai',
        models: ['gpt-4'],
      };

      const created = await repository.create(config, encryptionService);
      const found = await repository.getById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.getById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getByTenantId', () => {
    it('should return keys for tenant', async () => {
      await repository.create(
        { key: 'sk-1', provider: 'openai', models: ['gpt-4'], tenantId: 'tenant-1', isShared: false },
        encryptionService
      );
      await repository.create(
        { key: 'sk-2', provider: 'openai', models: ['gpt-4'], tenantId: 'tenant-1', isShared: false },
        encryptionService
      );
      await repository.create(
        { key: 'sk-3', provider: 'openai', models: ['gpt-4'], tenantId: 'tenant-2', isShared: false },
        encryptionService
      );

      const keys = await repository.getByTenantId('tenant-1');
      expect(keys).toHaveLength(2);
    });
  });

  describe('updateStatus', () => {
    it('should update key status', async () => {
      const created = await repository.create(
        { key: 'sk-test', provider: 'openai', models: ['gpt-4'] },
        encryptionService
      );

      const updated = await repository.updateStatus(created.id, 'revoked');
      expect(updated?.status).toBe('revoked');
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      const created = await repository.create(
        { key: 'sk-test', provider: 'openai', models: ['gpt-4'] },
        encryptionService
      );

      const deleted = await repository.delete(created.id);
      expect(deleted).toBe(true);

      const found = await repository.getById(created.id);
      expect(found).toBeNull();
    });
  });
});
