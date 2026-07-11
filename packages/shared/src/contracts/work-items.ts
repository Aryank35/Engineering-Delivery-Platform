import { z } from 'zod';
import { PRIORITIES, WORK_ITEM_STATUSES, WORK_ITEM_TYPES } from '../domain/work-items';
import { paginationQuerySchema } from './pagination';

const cuid = z.string().cuid();
const isoDateTime = z.string().datetime({ message: 'Must be an ISO date-time' });

export const createWorkItemSchema = z.object({
  type: z.enum(WORK_ITEM_TYPES),
  title: z.string().trim().min(1, 'Title is required').max(300),
  description: z.string().max(20000).nullish(),
  status: z.enum(WORK_ITEM_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  parentId: cuid.nullish(),
  assigneeId: cuid.nullish(),
  storyPoints: z.number().int().min(0).max(1000).nullish(),
  startDate: isoDateTime.nullish(),
  dueDate: isoDateTime.nullish(),
  labelIds: z.array(cuid).max(50).optional().default([]),
});

export const updateWorkItemSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(20000).nullable(),
    status: z.enum(WORK_ITEM_STATUSES),
    priority: z.enum(PRIORITIES),
    parentId: cuid.nullable(),
    assigneeId: cuid.nullable(),
    storyPoints: z.number().int().min(0).max(1000).nullable(),
    startDate: isoDateTime.nullable(),
    dueDate: isoDateTime.nullable(),
    labelIds: z.array(cuid).max(50),
  })
  .partial();

export const listWorkItemsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(WORK_ITEM_TYPES).optional(),
  status: z.enum(WORK_ITEM_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: cuid.optional(),
  reporterId: cuid.optional(),
  parentId: cuid.optional(),
  labelId: cuid.optional(),
  search: z.string().trim().max(200).optional(),
});

export type CreateWorkItemInput = z.infer<typeof createWorkItemSchema>;
export type UpdateWorkItemInput = z.infer<typeof updateWorkItemSchema>;
export type ListWorkItemsQuery = z.infer<typeof listWorkItemsQuerySchema>;
