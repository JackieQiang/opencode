import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// JWT secret - 在生产环境中应从环境变量获取
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';

/**
 * Next.js Middleware
 *
 * 功能：
 * 1. JWT Token 验证
 * 2. 租户上下文解析
 * 3. 请求日志
 *
 * 待实现：
 * - RS256 签名验证
 * - Token 撤销检查
 * - 速率限制
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径不需要认证
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname === '/api/health')
  {
    return NextResponse.next();
  }

  // 获取 Token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing token' },
      { status: 401 }
    );
  }

  // TODO: 实现 JWT 验证
  // 1. 解码 Token
  // 2. 验证签名 (RS256)
  // 3. 检查 Token 是否在黑名单中
  // 4. 构建租户上下文

  // 模拟：直接放行（待实现）
  const response = NextResponse.next();

  // 将用户信息添加到请求头
  // response.headers.set('x-user-id', userId);
  // response.headers.set('x-tenant-id', tenantId);

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
