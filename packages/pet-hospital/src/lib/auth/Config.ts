/**
 * 环境配置
 */

// 使用 Bun 的 env 或 fallback 到 process.env
const getEnv = (key: string, defaultValue?: string): string | undefined => {
  // Bun 环境
  if (typeof Bun !== 'undefined') {
    return Bun.env[key] || defaultValue;
  }
  // Node 环境
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = getEnv(key);
  if (value === undefined) return defaultValue!;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue! : parsed;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnv(key);
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

// 应用配置
export interface AppConfig {
  // JWT 配置
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };

  // 密码配置
  password: {
    salt: string;
    iterations: number;
  };

  // 服务器配置
  server: {
    port: number;
    host: string;
  };

  // 数据库配置
  database: {
    url?: string;
  };
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  jwt: {
    secret: 'pet-hospital-default-secret-key-change-in-production',
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
  },
  password: {
    salt: 'pet-hospital-salt-2024',
    iterations: 10000,
  },
  server: {
    port: 4000,
    host: '0.0.0.0',
  },
  database: {
    url: undefined,
  },
};

// 创建配置
export function createConfig(): AppConfig {
  return {
    jwt: {
      secret: getEnv('JWT_SECRET', DEFAULT_CONFIG.jwt.secret)!,
      accessTokenExpiry: getEnv('JWT_ACCESS_TOKEN_EXPIRY', DEFAULT_CONFIG.jwt.accessTokenExpiry)!,
      refreshTokenExpiry: getEnv('JWT_REFRESH_TOKEN_EXPIRY', DEFAULT_CONFIG.jwt.refreshTokenExpiry)!,
    },
    password: {
      salt: getEnv('PASSWORD_SALT', DEFAULT_CONFIG.password.salt)!,
      iterations: getEnvNumber('PASSWORD_ITERATIONS', DEFAULT_CONFIG.password.iterations),
    },
    server: {
      port: getEnvNumber('PORT', DEFAULT_CONFIG.server.port),
      host: getEnv('HOST', DEFAULT_CONFIG.server.host)!,
    },
    database: {
      url: getEnv('DATABASE_URL'),
    },
  };
}

// 单例配置
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = createConfig();
  }
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
