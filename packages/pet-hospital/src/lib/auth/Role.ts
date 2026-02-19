/**
 * 角色实体和类型定义
 */

// 角色实体
export interface Role {
  id: string;
  tenantId: string | null;     // null = 系统级角色
  name: string;                // 唯一标识 (e.g., "vet", "nurse", "admin")
  displayName: string;         // 显示名称
  description?: string;

  // 权限
  permissions: string[];        // 基础权限
  mcpPermissions?: string[];   // MCP 工具权限
  skillPermissions?: string[]; // Skill 权限

  // 角色设置
  isSystem: boolean;           // 系统角色不可删除
  isDefault: boolean;          // 新用户默认角色
  priority: number;           // 优先级（数字越大越高）

  // 继承
  extends?: string[];          // 继承的角色 ID

  // 时间戳
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// 权限定义
export interface Permission {
  id: string;
  name: string;
  resource: string;            // 资源 (e.g., "api_key", "hospital", "appointment")
  action: string;             // 操作 (e.g., "create", "read", "update", "delete")
  description?: string;
  category: string;           // 分类
}

// 创建角色参数
export interface CreateRoleParams {
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  permissions?: string[];
  mcpPermissions?: string[];
  skillPermissions?: string[];
  extends?: string[];
  isDefault?: boolean;
}

// 更新角色参数
export interface UpdateRoleParams {
  displayName?: string;
  description?: string;
  permissions?: string[];
  mcpPermissions?: string[];
  skillPermissions?: string[];
  extends?: string[];
  isDefault?: boolean;
  priority?: number;
}

// 角色查询选项
export interface RoleQueryOptions {
  tenantId?: string | null;  // null = 系统角色
  isSystem?: boolean;
  isDefault?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// 预定义权限
export const PERMISSIONS: Permission[] = [
  // 租户
  { id: 'tenant_read', name: 'tenant:read', resource: 'tenant', action: 'read', category: '租户' },
  { id: 'tenant_update', name: 'tenant:update', resource: 'tenant', action: 'update', category: '租户' },

  // 用户
  { id: 'user_create', name: 'user:create', resource: 'user', action: 'create', category: '用户' },
  { id: 'user_read', name: 'user:read', resource: 'user', action: 'read', category: '用户' },
  { id: 'user_update', name: 'user:update', resource: 'user', action: 'update', category: '用户' },
  { id: 'user_delete', name: 'user:delete', resource: 'user', action: 'delete', category: '用户' },

  // 角色
  { id: 'role_read', name: 'role:read', resource: 'role', action: 'read', category: '角色' },
  { id: 'role_create', name: 'role:create', resource: 'role', action: 'create', category: '角色' },
  { id: 'role_update', name: 'role:update', resource: 'role', action: 'update', category: '角色' },
  { id: 'role_delete', name: 'role:delete', resource: 'role', action: 'delete', category: '角色' },

  // API Key
  { id: 'api_key_create', name: 'api_key:create', resource: 'api_key', action: 'create', category: 'API Key' },
  { id: 'api_key_read', name: 'api_key:read', resource: 'api_key', action: 'read', category: 'API Key' },
  { id: 'api_key_update', name: 'api_key:update', resource: 'api_key', action: 'update', category: 'API Key' },
  { id: 'api_key_delete', name: 'api_key:delete', resource: 'api_key', action: 'delete', category: 'API Key' },

  // 医院
  { id: 'hospital_read', name: 'hospital:read', resource: 'hospital', action: 'read', category: '医院' },

  // 预约
  { id: 'appointment_create', name: 'appointment:create', resource: 'appointment', action: 'create', category: '预约' },
  { id: 'appointment_read', name: 'appointment:read', resource: 'appointment', action: 'read', category: '预约' },
  { id: 'appointment_update', name: 'appointment:update', resource: 'appointment', action: 'update', category: '预约' },
  { id: 'appointment_delete', name: 'appointment:delete', resource: 'appointment', action: 'delete', category: '预约' },

  // 宠物
  { id: 'pet_create', name: 'pet:create', resource: 'pet', action: 'create', category: '宠物' },
  { id: 'pet_read', name: 'pet:read', resource: 'pet', action: 'read', category: '宠物' },
  { id: 'pet_update', name: 'pet:update', resource: 'pet', action: 'update', category: '宠物' },
  { id: 'pet_delete', name: 'pet:delete', resource: 'pet', action: 'delete', category: '宠物' },
];

// 权限映射（用于快速查找）
export const PERMISSION_MAP = new Map(PERMISSIONS.map(p => [p.name, p]));

// 预定义系统级角色
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'super_admin',
    tenantId: null,
    name: 'super_admin',
    displayName: '超级管理员',
    description: '系统超级管理员，可管理所有租户',
    permissions: ['*:*'],
    mcpPermissions: ['*'],
    skillPermissions: ['*'],
    isSystem: true,
    isDefault: false,
    priority: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 预定义租户级角色模板
export function createTenantRoles(tenantId: string): Role[] {
  const now = new Date();
  return [
    {
      id: `${tenantId}_tenant_admin`,
      tenantId,
      name: 'tenant_admin',
      displayName: '租户管理员',
      description: '租户管理员，可管理租户内所有资源',
      permissions: [
        'tenant:*',
        'user:*',
        'role:*',
        'api_key:*',
        'hospital:read',
        'appointment:*',
        'pet:*',
      ],
      mcpPermissions: ['*'],
      skillPermissions: ['*'],
      isSystem: true,
      isDefault: false,
      priority: 100,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${tenantId}_vet`,
      tenantId,
      name: 'vet',
      displayName: '兽医',
      description: '兽医角色，可查看和创建预约',
      permissions: [
        'hospital:read',
        'appointment:create',
        'appointment:read',
        'appointment:update',
        'pet:read',
      ],
      mcpPermissions: [
        'getHospitals',
        'createAppointment',
        'getPetInfo',
      ],
      skillPermissions: [
        'triage-consultation',
      ],
      isSystem: true,
      isDefault: false,
      priority: 50,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${tenantId}_nurse`,
      tenantId,
      name: 'nurse',
      displayName: '护士',
      description: '护士角色，可查看医院和预约',
      permissions: [
        'hospital:read',
        'appointment:read',
        'pet:read',
      ],
      mcpPermissions: [
        'getHospitals',
        'getPetInfo',
      ],
      skillPermissions: [],
      isSystem: true,
      isDefault: false,
      priority: 30,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${tenantId}_pet_owner`,
      tenantId,
      name: 'pet_owner',
      displayName: '宠物主人',
      description: '普通用户，宠物主人',
      permissions: [
        'hospital:read',
        'appointment:create',
        'appointment:read:own',
        'pet:read:own',
        'pet:create',
      ],
      mcpPermissions: [
        'getHospitals',
        'createAppointment',
        'getPetInfo',
      ],
      skillPermissions: [
        'triage-consultation',
      ],
      isSystem: true,
      isDefault: true,
      priority: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${tenantId}_readonly`,
      tenantId,
      name: 'readonly',
      displayName: '只读用户',
      description: '只读访问权限',
      permissions: [
        'hospital:read',
        'appointment:read',
        'pet:read',
      ],
      mcpPermissions: [
        'getHospitals',
        'getPetInfo',
      ],
      skillPermissions: [],
      isSystem: true,
      isDefault: false,
      priority: 5,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
