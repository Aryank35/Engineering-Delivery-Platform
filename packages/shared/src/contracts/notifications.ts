import { z } from 'zod';
import { paginationQuerySchema } from './pagination';

const cuid = z.string().cuid();

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(cuid).min(1, 'At least one id is required').max(200),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
