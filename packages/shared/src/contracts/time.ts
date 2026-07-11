import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

const cuid = z.string().cuid();
const isoDateTime = z.string().datetime({ message: 'Must be an ISO date-time' });

export const startTimerSchema = z.object({
  workItemId: cuid,
  description: z.string().trim().max(500).nullish(),
});

export const createTimeLogSchema = z.object({
  workItemId: cuid,
  minutes: z.number().int().min(1, 'At least 1 minute').max(1440, 'At most 24 hours'),
  description: z.string().trim().max(500).nullish(),
  spentOn: isoDateTime.optional(),
});

export const updateTimeLogSchema = z
  .object({
    minutes: z.number().int().min(1).max(1440),
    description: z.string().trim().max(500).nullable(),
    spentOn: isoDateTime,
  })
  .partial();

export const listTimeLogsQuerySchema = paginationQuerySchema.extend({
  workItemId: cuid.optional(),
  userId: cuid.optional(),
  mine: z.coerce.boolean().optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>;
export type UpdateTimeLogInput = z.infer<typeof updateTimeLogSchema>;
export type ListTimeLogsQuery = z.infer<typeof listTimeLogsQuerySchema>;
