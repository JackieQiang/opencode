// ==================== 类型定义 ====================

/**
 * 审计操作类型
 */
export type AuditAction =
  | 'key_used'
  | 'key_added'
  | 'key_removed'
  | 'key_rotated'
  | 'key_status_changed'
  | 'alert_triggered'
  | 'user_login'
  | 'user_logout'
  | 'tenant_created'
  | 'tenant_updated'
  | 'permission_changed';

/**
 * 审计日志
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  tenantId: string;
  userId?: string;

  // 操作信息
  action: AuditAction;
  resource: string;
  resourceId?: string;

  // 变更详情
  changes?: Record<string, { old: any; new: any }>;

  // 请求详情
  keyId?: string;
  provider?: string;
  model?: string;
  tokens?: number;
  cost?: number;
  latency?: number;
  success?: boolean;
  error?: string;

  // 上下文
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;

  // 额外信息
  metadata?: Record<string, any>;
}

/**
 * 审计日志查询参数
 */
export interface AuditLogQuery {
  tenantId?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 审计日志统计
 */
export interface AuditLogStats {
  totalCount: number;
  actionCounts: Record<AuditAction, number>;
  tenantCounts: Record<string, number>;
  userCounts: Record<string, number>;
}

// ==================== 审计日志服务 ====================

/**
 * 审计日志服务
 */
export class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs: number = 100000;

  /**
   * 记录日志
   */
  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    this.logs.push(log);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    return log;
  }

  /**
   * 记录 API Key 使用
   */
  logKeyUsed(data: {
    tenantId: string;
    userId?: string;
    keyId: string;
    provider: string;
    model: string;
    tokens: number;
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
    ipAddress?: string;
    userAgent?: string;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      action: 'key_used',
      resource: 'api_key',
      resourceId: data.keyId,
      keyId: data.keyId,
      provider: data.provider,
      model: data.model,
      tokens: data.tokens,
      cost: data.cost,
      latency: data.latency,
      success: data.success,
      error: data.error,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  /**
   * 记录 Key 添加
   */
  logKeyAdded(data: {
    tenantId: string;
    userId?: string;
    keyId: string;
    provider: string;
    ipAddress?: string;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      action: 'key_added',
      resource: 'api_key',
      resourceId: data.keyId,
      provider: data.provider,
      ipAddress: data.ipAddress,
    });
  }

  /**
   * 记录 Key 删除
   */
  logKeyRemoved(data: {
    tenantId: string;
    userId?: string;
    keyId: string;
    reason?: string;
    ipAddress?: string;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      action: 'key_removed',
      resource: 'api_key',
      resourceId: data.keyId,
      metadata: { reason: data.reason },
      ipAddress: data.ipAddress,
    });
  }

  /**
   * 记录 Key 轮换
   */
  logKeyRotated(data: {
    tenantId: string;
    userId?: string;
    keyId: string;
    oldKeyId?: string;
    ipAddress?: string;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      action: 'key_rotated',
      resource: 'api_key',
      resourceId: data.keyId,
      changes: data.oldKeyId ? { oldKeyId: { old: data.oldKeyId, new: data.keyId } } : undefined,
      ipAddress: data.ipAddress,
    });
  }

  /**
   * 记录 Key 状态变更
   */
  logKeyStatusChanged(data: {
    tenantId: string;
    userId?: string;
    keyId: string;
    oldStatus: string;
    newStatus: string;
    reason?: string;
    ipAddress?: string;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      userId: data.userId,
      action: 'key_status_changed',
      resource: 'api_key',
      resourceId: data.keyId,
      changes: {
        status: { old: data.oldStatus, new: data.newStatus },
      },
      metadata: { reason: data.reason },
      ipAddress: data.ipAddress,
    });
  }

  /**
   * 记录告警触发
   */
  logAlertTriggered(data: {
    tenantId: string;
    alertType: string;
    threshold: number;
    currentValue: number;
  }): AuditLog {
    return this.log({
      tenantId: data.tenantId,
      action: 'alert_triggered',
      resource: 'budget',
      metadata: {
        alertType: data.alertType,
        threshold: data.threshold,
        currentValue: data.currentValue,
      },
    });
  }

  /**
   * 查询日志
   */
  query(params: AuditLogQuery): AuditLog[] {
    let filtered = [...this.logs];

    if (params.tenantId) {
      filtered = filtered.filter(l => l.tenantId === params.tenantId);
    }
    if (params.userId) {
      filtered = filtered.filter(l => l.userId === params.userId);
    }
    if (params.action) {
      filtered = filtered.filter(l => l.action === params.action);
    }
    if (params.resource) {
      filtered = filtered.filter(l => l.resource === params.resource);
    }
    if (params.startTime) {
      filtered = filtered.filter(l => l.timestamp >= params.startTime!);
    }
    if (params.endTime) {
      filtered = filtered.filter(l => l.timestamp <= params.endTime!);
    }

    // 按时间倒序
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 分页
    const offset = params.offset || 0;
    const limit = params.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  /**
   * 获取统计信息
   */
  getStats(params?: { tenantId?: string; startTime?: Date; endTime?: Date }): AuditLogStats {
    let filtered = [...this.logs];

    if (params?.tenantId) {
      filtered = filtered.filter(l => l.tenantId === params.tenantId);
    }
    if (params?.startTime) {
      filtered = filtered.filter(l => l.timestamp >= params.startTime!);
    }
    if (params?.endTime) {
      filtered = filtered.filter(l => l.timestamp <= params.endTime!);
    }

    const actionCounts: Record<AuditAction, number> = {} as Record<AuditAction, number>;
    const tenantCounts: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    for (const log of filtered) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      tenantCounts[log.tenantId] = (tenantCounts[log.tenantId] || 0) + 1;
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    }

    return {
      totalCount: filtered.length,
      actionCounts,
      tenantCounts,
      userCounts,
    };
  }

  /**
   * 导出日志
   */
  export(params: AuditLogQuery & { format?: 'json' | 'csv' }): string {
    const logs = this.query(params);

    if (params.format === 'csv') {
      const headers = [
        'id',
        'timestamp',
        'tenantId',
        'userId',
        'action',
        'resource',
        'resourceId',
        'provider',
        'model',
        'tokens',
        'cost',
        'latency',
        'success',
        'error',
        'ipAddress',
      ];

      const rows = logs.map(l => [
        l.id,
        l.timestamp.toISOString(),
        l.tenantId,
        l.userId || '',
        l.action,
        l.resource,
        l.resourceId || '',
        l.provider || '',
        l.model || '',
        l.tokens?.toString() || '',
        l.cost?.toString() || '',
        l.latency?.toString() || '',
        l.success?.toString() || '',
        l.error || '',
        l.ipAddress || '',
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * 清除日志
   */
  clear(tenantId?: string): void {
    if (tenantId) {
      this.logs = this.logs.filter(l => l.tenantId !== tenantId);
    } else {
      this.logs = [];
    }
  }

  /**
   * 获取日志数量
   */
  count(tenantId?: string): number {
    if (tenantId) {
      return this.logs.filter(l => l.tenantId === tenantId).length;
    }
    return this.logs.length;
  }
}

// ==================== 工厂函数 ====================

export function createAuditLogger(): AuditLogger {
  return new AuditLogger();
}
