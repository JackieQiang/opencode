import { randomUUID } from 'crypto';

// ==================== 类型定义 ====================

/**
 * Provider 类型
 */
export type Provider = 'openai' | 'anthropic' | 'deepseek';

/**
 * API Key 状态
 */
export type ApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked';

/**
 * API Key 实体
 */
export interface ApiKey {
  id: string;
  key: string;                    // 原始 key (加密存储)
  provider: Provider;
  models: string[];
  weight: number;
  limitPerMinute: number;
  limitPerDay: number;

  // 生命周期
  status: ApiKeyStatus;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;

  // 共享/独有
  isShared: boolean;
  tenantId?: string;              // 独有池时填写

  // 名称/描述
  name?: string;
  description?: string;
}

/**
 * API Key 配置 (用于创建)
 */
export interface ApiKeyCreateConfig {
  key: string;
  provider: Provider;
  models: string[];
  weight?: number;
  limitPerMinute?: number;
  limitPerDay?: number;
  isShared?: boolean;
  tenantId?: string;
  name?: string;
  description?: string;
  expiresAt?: Date;
}

/**
 * 密钥加密/解密服务
 */
export class KeyEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits

  /**
   * 加密 API Key
   * 使用 AES-256-GCM 加密
   */
  encrypt(plainKey: string, encryptionKey?: string): string {
    // 注意: 生产环境应使用环境变量中的密钥
    const key = encryptionKey || this.getDefaultKey();

    // 简单模拟加密 (实际应使用 crypto.createCipheriv)
    // 这里返回 base64 编码的原始 key 作为占位符
    // 生产环境请使用真正的 AES-256-GCM 实现
    return Buffer.from(plainKey).toString('base64');
  }

  /**
   * 解密 API Key
   */
  decrypt(encryptedKey: string, encryptionKey?: string): string {
    const key = encryptionKey || this.getDefaultKey();

    // 简单模拟解密
    // 生产环境请使用真正的 AES-256-GCM 实现
    return Buffer.from(encryptedKey, 'base64').toString('utf-8');
  }

  /**
   * 生成密钥指纹 (用于日志中显示)
   */
  getFingerprint(plainKey: string): string {
    // 显示前4位和后4位，中间用***替代
    if (plainKey.length <= 8) {
      return '****';
    }
    return `${plainKey.slice(0, 4)}***${plainKey.slice(-4)}`;
  }

  /**
   * 获取默认加密密钥
   * 生产环境应从环境变量或 KMS 获取
   */
  private getDefaultKey(): string {
    // 实际应从 process.env.ENCRYPTION_KEY 获取
    return process.env.API_KEY_ENCRYPTION_KEY || 'default-dev-key-32-chars!!!';
  }
}

/**
 * API Key 存储库 (内存实现，可替换为数据库)
 */
export class ApiKeyRepository {
  private keys: Map<string, ApiKey> = new Map();

  /**
   * 创建 API Key
   */
  async create(config: ApiKeyCreateConfig, encryptionService: KeyEncryptionService): Promise<ApiKey> {
    const id = randomUUID();
    const now = new Date();

    const apiKey: ApiKey = {
      id,
      key: encryptionService.encrypt(config.key), // 加密存储
      provider: config.provider,
      models: config.models,
      weight: config.weight || 1,
      limitPerMinute: config.limitPerMinute || 100,
      limitPerDay: config.limitPerDay || 10000,
      status: 'active',
      createdAt: now,
      expiresAt: config.expiresAt,
      isShared: config.isShared || false,
      tenantId: config.tenantId,
      name: config.name,
      description: config.description,
    };

    this.keys.set(id, apiKey);
    return apiKey;
  }

  /**
   * 根据 ID 获取
   */
  async getById(id: string): Promise<ApiKey | null> {
    return this.keys.get(id) || null;
  }

  /**
   * 获取租户的所有 Key
   */
  async getByTenantId(tenantId: string): Promise<ApiKey[]> {
    return Array.from(this.keys.values()).filter(
      k => k.tenantId === tenantId && k.status === 'active'
    );
  }

  /**
   * 获取所有共享 Key
   */
  async getSharedKeys(): Promise<ApiKey[]> {
    return Array.from(this.keys.values()).filter(
      k => k.isShared && k.status === 'active'
    );
  }

  /**
   * 更新 Key 状态
   */
  async updateStatus(id: string, status: ApiKeyStatus): Promise<ApiKey | null> {
    const key = this.keys.get(id);
    if (!key) return null;

    key.status = status;
    this.keys.set(id, key);
    return key;
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsed(id: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      key.lastUsedAt = new Date();
    }
  }

  /**
   * 删除 Key
   */
  async delete(id: string): Promise<boolean> {
    return this.keys.delete(id);
  }

  /**
   * 获取所有 Key
   */
  async getAll(): Promise<ApiKey[]> {
    return Array.from(this.keys.values());
  }

  /**
   * 检查 Key 是否过期
   */
  async checkExpiry(id: string): Promise<boolean> {
    const key = this.keys.get(id);
    if (!key) return false;

    if (key.expiresAt && new Date() > key.expiresAt) {
      key.status = 'expired';
      return true;
    }
    return false;
  }
}

// ==================== 工厂函数 ====================

export function createEncryptionService(): KeyEncryptionService {
  return new KeyEncryptionService();
}

export function createApiKeyRepository(): ApiKeyRepository {
  return new ApiKeyRepository();
}
