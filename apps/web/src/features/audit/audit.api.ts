import { api } from '@/lib/api-client';
import type { AuditLogEntry, ListAuditLogsQuery, Paginated } from '@eop/shared';

export const auditApi = {
  list: (query: Partial<ListAuditLogsQuery>) =>
    api.get<Paginated<AuditLogEntry>>('/audit-logs', { params: query }).then((r) => r.data),
};
