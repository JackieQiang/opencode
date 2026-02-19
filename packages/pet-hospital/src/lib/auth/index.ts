/**
 * 认证模块统一导出
 */

// 用户相关
export * from './User';
export * from './UserRepository';
export { createUserService, type UserService } from './UserService';

// 认证相关
export { createPasswordService, type PasswordService } from './PasswordService';
export * from './JWTService';
export { createAuthService, type AuthService } from './AuthService';

// 角色相关
export * from './Role';
export { createRoleService, type RoleService, createRoleRepository, type RoleRepository } from './RoleService';

// 权限中间件
export * from './PermissionMiddleware';

// 装饰器
export * from './decorators';

// 配置
export * from './Config';
