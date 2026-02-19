/**
 * 密码服务 - 负责密码的哈希和验证
 */

export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
  needsRehash(hash: string): boolean;
}

/**
 * 创建密码服务的工厂函数
 * 使用 Web Crypto API 实现 SHA-256 哈希
 *
 * 注意：这是简化实现，生产环境应使用 bcrypt 或 argon2
 */
export function createPasswordService(): PasswordService {
  const SALT = 'pet_hospital_salt_2024';

  return {
    async hash(password: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + SALT);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashBase64 = btoa(String.fromCharCode(...hashArray));
      return `sha256:${hashBase64}`;
    },

    async verify(password: string, hash: string): Promise<boolean> {
      if (!hash.startsWith('sha256:')) {
        // 兼容旧格式或其他哈希算法
        return false;
      }
      const newHash = await this.hash(password);
      return newHash === hash;
    },

    needsRehash(hash: string): boolean {
      // 当前使用 SHA-256，未来迁移到 bcrypt 时可判断是否需要重新哈希
      return false;
    },
  };
}

/**
 * 生成随机密码
 */
export function generateRandomPassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, n => charset[n % charset.length]).join('');
}

/**
 * 验证密码强度
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
