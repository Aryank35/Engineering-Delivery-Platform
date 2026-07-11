import { z } from 'zod';

const hexColor = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Must be a hex colour such as #7C3AED');

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  color: hexColor,
});

export const updateLabelSchema = createLabelSchema.partial();

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
