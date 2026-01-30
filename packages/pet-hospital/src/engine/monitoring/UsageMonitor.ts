import { UsageRecord, UserUsageStats } from './UsageModels';

export class UsageMonitor {
  private records: UsageRecord[] = [];
  private userStats: Map<string, UserUsageStats> = new Map();

  async record(record: Omit<UsageRecord, 'id' | 'createdAt'>): Promise<void> {
    const fullRecord: UsageRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    this.records.push(fullRecord);

    // Update user stats
    const userKey = `${record.userId}_${new Date().toISOString().split('T')[0]}`;
    const existingStats = this.userStats.get(userKey) || {
      userId: record.userId,
      tenantId: record.tenantId,
      today: { conversationCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
      month: { conversationCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
    };

    existingStats.today.conversationCount += 1;
    existingStats.today.inputTokens += record.inputTokens;
    existingStats.today.outputTokens += record.outputTokens;
    existingStats.today.totalTokens += record.inputTokens + record.outputTokens;
    existingStats.today.cost += record.cost;

    this.userStats.set(userKey, existingStats);
  }

  async getUserStats(userId: string): Promise<UserUsageStats> {
    const userKey = `${userId}_${new Date().toISOString().split('T')[0]}`;
    return this.userStats.get(userKey) || {
      userId,
      tenantId: '',
      today: { conversationCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
      month: { conversationCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
    };
  }
}
