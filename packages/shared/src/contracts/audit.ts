import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  actorId: z.string().cuid().optional(),
  action: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(120).optional(),
  entityId: z.string().trim().max(120).optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
