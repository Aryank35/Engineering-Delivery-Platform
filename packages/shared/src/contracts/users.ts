import { z } from 'zod';
import { ROLE_KEYS } from '../rbac/roles';
import { emailSchema, passwordSchema } from './auth';
import { paginationQuerySchema } from './pagination';

const roleKeySchema = z.enum(ROLE_KEYS);

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  roles: z.array(roleKeySchema).min(1, 'At least one role is required'),
  timezone: z.string().trim().max(64).optional(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    avatarUrl: z.string().url().max(500).nullable(),
    timezone: z.string().trim().max(64).nullable(),
    isActive: z.boolean(),
  })
  .partial();

export const assignRolesSchema = z.object({
  roles: z.array(roleKeySchema).min(1, 'At least one role is required'),
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    avatarUrl: z.string().url().max(500).nullable(),
    timezone: z.string().trim().max(64).nullable(),
  })
  .partial();

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  role: roleKeySchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
