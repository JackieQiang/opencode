# CLAUDE.md

此文件为Claude Code (claude.ai/code)在此代码仓库中处理代码时提供指导。

## 项目概述

这是一个企业级多租户 AI 助手系统，构建为 Bun 单体仓库。当前使用 Hono 后端，计划迁移到 Next.js。

## 开发方法论

### 测试驱动开发 (TDD) 模式

**核心原则**：在实现任何功能之前，先编写测试用例，确保测试通过后再进行功能开发。

1. **需求分析阶段**
   - 详细分析功能需求，编写需求规格说明书
   - 识别边界条件和异常场景
   - **需要用户确认测试用例**

2. **测试用例编写阶段**
   - 编写验收测试（Acceptance Tests）
   - 编写单元测试（Unit Tests）
   - 编写集成测试（Integration Tests）
   - 编写安全测试（Security Tests）
   - **提交给用户确认测试用例的完整性和正确性**

3. **开发实现阶段**
   - 运行测试确保失败（红色）
   - 实现最小功能代码使测试通过（绿色）
   - 重构代码（黄色）
   - 确保所有测试持续通过

4. **测试覆盖要求**
   - 核心业务逻辑测试覆盖率 >= 90%
   - 安全相关测试覆盖率 = 100%
   - 所有 API 端点必须有集成测试

## 企业级安全要求

### 认证与授权

- **JWT 安全增强**
  - 使用 RS256 非对称签名算法
  - Token 有效期：访问令牌 15 分钟，刷新令牌 7 天
  - 实现 Token 撤销机制（加入黑名单）
  - 支持多设备登录管理与踢出

- **API Key 安全**
  - API Key 加密存储（AES-256-GCM）
  - Key 轮换机制（自动/手动）
  - Key 使用审计日志
  - 敏感操作需要二次验证

- **数据安全**
  - 租户数据完全隔离（逻辑隔离 + 物理隔离可选）
  - 敏感数据脱敏展示
  - 数据传输 TLS 1.3
  - 静态数据加密

- **访问控制**
  - 基于角色的访问控制 (RBAC)
  - 细粒度权限控制 (CBAC)
  - 操作审计日志
  - 异常行为检测与告警

### 速率限制与配额

- **多层级限流**
  - 用户级、租户级、系统级限流
  - 按 API 端点差异化限流
  - 滑动窗口算法 + 令牌桶算法
  - 配额预警机制（80% 告警）

## 统计与监控要求

### 数据统计面板

**企业级可视化要求**：

1. **实时监控仪表盘**
   - 响应延迟热力图（按时间段、API、模型）
   - 请求量实时趋势图
   - 错误率监控与告警
   - 资源利用率（CPU、内存、API 配额）

2. **使用量统计分析**
   - 租户使用量排名与趋势
   - 按模型/供应商成本分析
   - Token 消耗统计与预测
   - 成本可视化与预算预警

3. **多维度图表**
   - 折线图：时间序列趋势
   - 饼图/环形图：占比分析
   - 柱状图：对比分析
   - 堆叠图：多维度分解
   - 热力图：分布分析

4. **导出与报告**
   - 支持 CSV/Excel 导出
   - 自定义时间范围
   - 自动生成日报/周报/月报
   - 邮件订阅报告

### 技术栈（图表）

- 前端图表库：Chart.js / ECharts / Recharts
- 数据聚合：ClickHouse / Elasticsearch
- 实时推送：WebSocket / Server-Sent Events

## 常用命令

### 开发（当前 Hono 后端）

```bash
# 运行后端开发服务器 (Hono - 当前)
bun run packages/pet-hospital/src/server/index.ts

# 运行前端开发 (H5)
cd packages/pet-hospital/frontend/user-app && npm run dev:h5

# 运行前端开发 (微信小程序)
cd packages/pet-hospital/frontend/user-app && npm run dev:weapp
```

### 开发（Next.js 后端 - 目标）

```bash
# 运行后端开发服务器 (Next.js - 目标)
cd packages/pet-hospital/backend && bun run dev

# 运行测试（开发时监听模式）
bun test:watch

# 运行测试并生成覆盖率报告
bun test:coverage
```

### 构建

```bash
# 构建前端 H5
cd packages/pet-hospital/frontend/user-app && npm run build:h5

# 构建前端微信小程序
cd packages/pet-hospital/frontend/user-app && npm run build:weapp

# 类型检查
bun run typecheck
```

### 测试

```bash
# 运行所有测试
bun test

# 运行特定模块的测试
bun test packages/pet-hospital/tests/

# 运行测试并显示详细输出
bun test --reporter=verbose

# 运行安全相关测试
bun test packages/pet-hospital/tests/security/
```

## 当前架构（Hono 后端 - 迁移中）

```
packages/pet-hospital/
├── frontend/user-app/          # Taro + Solid.js 前端
├── src/
│   ├── server/               # Hono API 服务器 (端口 4000)
│   │   ├── index.ts
│   │   └── api/v1/          # API 路由
│   ├── engine/              # 核心引擎
│   │   ├── tenant/          # 租户管理
│   │   └── monitoring/      # 使用监控
│   ├── mcp/tools/           # MCP 工具
│   └── skills/              # AI 技能
└── tests/                    # 测试文件
```

## 目标架构（Next.js 后端）

```
packages/pet-hospital/
├── frontend/user-app/          # Taro + Solid.js 前端
├── backend/                    # Next.js 后端
│   ├── src/
│   │   ├── app/              # Next.js App Router
│   │   │   ├── api/          # API Route Handlers
│   │   │   │   ├── auth/     # 认证接口
│   │   │   │   └── v1/       # 业务接口
│   │   │   └── layout.tsx
│   │   ├── middleware.ts     # 中间件 (JWT & 租户)
│   │   ├── lib/              # 核心逻辑
│   │   │   ├── engine/       # 引擎 (租户、Key池)
│   │   │   ├── auth/         # 认证服务
│   │   │   ├── mcp/          # MCP 工具
│   │   │   └── skills/       # AI 技能
│   │   └── data/             # 数据层
│   └── package.json
├── src/                       # Hono 后端 (待迁移)
└── tests/                     # 测试文件
```

## 多租户核心功能

### 1. 用户与认证 (lib/auth/)

- **AuthService**: 用户注册、登录、JWT Token生成与验证
- **JwtMiddleware**: 请求认证中间件
- 支持多租户用户隔离

### 2. API Key 池管理 (lib/engine/tenant/)

- **TenantKeyPoolManager**: 租户Key池管理器
  - 支持共享Key池和独有Key池
  - 自动故障转移

- **ApiKeyPool**: 单个Key池
  - 选择策略：加权、成本优化、延迟优化、故障转移
  - 健康检查和自动故障转移

- **RateLimiter**: 速率限制
  - 用户/租户/系统级别限流
  - 滑动窗口算法

### 3. 权限管理

- **TenantContext**: 租户上下文
  - 用户角色和权限
  - hasPermission() 权限检查

### 4. 使用量监控 (lib/engine/monitoring/)

- **UsageMonitor**: 使用量监控
  - 租户级别统计
  - 成本预警

## API 端点

### 当前（Hono）

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v1/triage/start | POST | 开始分诊 |
| /api/v1/triage/symptoms | POST | 处理症状 |
| /api/v1/triage/recommend | POST | 生成建议 |

### 目标（Next.js）

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/auth/me | GET | 当前用户 |
| /api/auth/refresh | POST | 刷新Token |
| /api/v1/triage/* | POST | 分诊相关 |

## 技术栈

- 运行时: Bun
- 前端: Taro 4.1.11 + Solid.js 1.9
- 后端: Hono 4.x → Next.js (迁移中)
- AI SDK: ai 5.x
- 测试: Vitest

## 要求

- 回答的内容都使用中文