import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 登录请求验证
const LoginSchema = z.object({
  login: z.string().min(1), // username | email | phone
  password: z.string().min(6),
});

// TODO: 从数据库获取用户
const mockUsers = new Map([
  ['admin', { id: '1', username: 'admin', password: '$2a$10$xxx', tenantId: 'tenant-1', roles: ['admin'] }],
]);

/**
 * POST /api/auth/login
 *
 * 用户登录接口
 *
 * 待实现：
 * - 密码验证 (bcrypt)
 * - JWT Token 生成 (RS256)
 * - 刷新 Token 生成
 * - 登录日志
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求体
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: result.error.errors },
        { status: 400 }
      );
    }

    const { login, password } = result.data;

    // TODO: 查找用户并验证密码
    const user = mockUsers.get(login);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // TODO: 验证密码
    // const passwordValid = await bcrypt.compare(password, user.password);

    // TODO: 生成 Token
    // const accessToken = await generateAccessToken(user);
    // const refreshToken = await generateRefreshToken(user);

    // 模拟响应
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
        roles: user.roles,
      },
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 900, // 15 minutes
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
