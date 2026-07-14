import { z } from 'zod';
import { paginationQuerySchema } from './pagination';
import { DEPLOYMENT_STATUSES, RELEASE_STATUSES } from '../domain/releases';

const cuid = z.string().cuid();
const isoDateTime = z.string().datetime({ message: 'Must be an ISO date-time' });
const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Must be a hex colour such as #6B7280');

// --- Environments -----------------------------------------------------------

export const createEnvironmentSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key is required')
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Lowercase letters, numbers and dashes only'),
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).nullish(),
  color: hexColor.optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isProduction: z.boolean().optional(),
});

export const updateEnvironmentSchema = createEnvironmentSchema.partial();

// --- Releases ---------------------------------------------------------------

export const createReleaseSchema = z.object({
  version: z
    .string()
    .trim()
    .min(1, 'Version is required')
    .max(50),
  name: z.string().trim().max(120).nullish(),
  notes: z.string().trim().max(10_000).nullish(),
  status: z.enum(RELEASE_STATUSES).optional(),
  targetDate: isoDateTime.nullish(),
  workItemIds: z.array(cuid).max(500).optional(),
});

export const updateReleaseSchema = z
  .object({
    version: z.string().trim().min(1).max(50),
    name: z.string().trim().max(120).nullable(),
    notes: z.string().trim().max(10_000).nullable(),
    targetDate: isoDateTime.nullable(),
  })
  .partial();

export const setReleaseStatusSchema = z.object({
  status: z.enum(RELEASE_STATUSES),
});

export const releaseItemsSchema = z.object({
  itemIds: z.array(cuid).min(1, 'At least one work item is required').max(500),
});

export const listReleasesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(RELEASE_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
});

// --- Deployments ------------------------------------------------------------

export const createDeploymentSchema = z.object({
  environmentId: cuid,
  status: z.enum(DEPLOYMENT_STATUSES).optional(),
  notes: z.string().trim().max(2_000).nullish(),
});

export const updateDeploymentSchema = z
  .object({
    status: z.enum(DEPLOYMENT_STATUSES),
    notes: z.string().trim().max(2_000).nullable(),
  })
  .partial();

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;
export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof updateReleaseSchema>;
export type SetReleaseStatusInput = z.infer<typeof setReleaseStatusSchema>;
export type ReleaseItemsInput = z.infer<typeof releaseItemsSchema>;
export type ListReleasesQuery = z.infer<typeof listReleasesQuerySchema>;
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateDeploymentInput = z.infer<typeof updateDeploymentSchema>;
