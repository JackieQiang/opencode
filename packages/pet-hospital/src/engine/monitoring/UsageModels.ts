export interface UsageRecord {
  id: string;
  userId: string;
  tenantId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number;
  status: 'success' | 'error' | 'rate_limited';
  createdAt: Date;
}

export interface UserUsageStats {
  userId: string;
  tenantId: string;
  today: {
    conversationCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
  month: {
    conversationCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}
