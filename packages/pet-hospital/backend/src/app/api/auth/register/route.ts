import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 注册请求验证
const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email().optional(),
  phone: z.string().pattern(/^\d{11}$/).optional(),
  password: z.string().min(6),
  tenantId: z.string().optional(), // 可选，创建新租户
});

/**
 * POST /api/auth/register
 *
 * 用户注册接口
 *
 * 待实现：
 * - 用户名/邮箱唯一性检查
 * - 密码加密 (bcrypt)
 * - 创建用户记录
 * - 创建租户（如果指定）
 * - 发送欢迎邮件
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证请求体
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: result.error.errors },
        { status: 400 }
      );
    }

    const { username, email, phone, password, tenantId } = result.data;

    // 验证邮箱或手机号至少提供一个
    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Email or phone is required' },
        { status: 400 }
      );
    }

    // TODO: 检查用户名/邮箱/手机号是否已存在

    // TODO: 加密密码
    // const passwordHash = await bcrypt.hash(password, 10);

    // TODO: 创建用户
    // const user = await createUser({ username, email, phone, passwordHash, tenantId });

    // 模拟响应
    const mockUser = {
      id: `user-${Date.now()}`,
      username,
      email,
      phone,
      tenantId: tenantId || 'tenant-default',
      roles: ['user'],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      user: mockUser,
      message: 'Registration successful',
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
