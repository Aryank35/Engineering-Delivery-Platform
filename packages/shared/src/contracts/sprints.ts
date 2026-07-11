import { z } from 'zod';
import { WORK_ITEM_STATUSES } from '../domain/work-items';
import { SPRINT_STATUSES } from '../domain/sprints';
import { paginationQuerySchema } from './pagination';

const cuid = z.string().cuid();
const isoDateTime = z.string().datetime({ message: 'Must be an ISO date-time' });
const wipLimits = z.record(z.enum(WORK_ITEM_STATUSES), z.number().int().min(1)).optional();

export const createSprintSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    goal: z.string().trim().max(2000).nullish(),
    startDate: isoDateTime,
    endDate: isoDateTime,
    wipLimits,
  })
  .refine((v) => new Date(v.endDate) >= new Date(v.startDate), {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const updateSprintSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    goal: z.string().trim().max(2000).nullable(),
    status: z.enum(SPRINT_STATUSES),
    startDate: isoDateTime,
    endDate: isoDateTime,
    wipLimits: z.record(z.enum(WORK_ITEM_STATUSES), z.number().int().min(1)).nullable(),
  })
  .partial();

export const listSprintsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(SPRINT_STATUSES).optional(),
});

export const sprintItemsSchema = z.object({
  itemIds: z.array(cuid).min(1, 'Select at least one item').max(200),
});

export const moveWorkItemSchema = z.object({
  status: z.enum(WORK_ITEM_STATUSES),
  sprintId: cuid.nullish(),
  beforeId: cuid.optional(),
  afterId: cuid.optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type ListSprintsQuery = z.infer<typeof listSprintsQuerySchema>;
export type SprintItemsInput = z.infer<typeof sprintItemsSchema>;
export type MoveWorkItemInput = z.infer<typeof moveWorkItemSchema>;
