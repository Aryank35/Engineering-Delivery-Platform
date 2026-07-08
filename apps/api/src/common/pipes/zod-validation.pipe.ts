import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { ZodError, type ZodSchema } from 'zod';

/**
 * Validates and parses an argument against a Zod schema, coercing it to the
 * schema's inferred type. Field errors are surfaced under `details` so the
 * exception filter can present them per-field.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || '_';
          (details[path] ??= []).push(issue.message);
        }
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Validation failed',
          details,
        });
      }
      throw error;
    }
  }
}

/** Convenience factory so controllers read `@Body(zodPipe(schema))`. */
export const zodPipe = <T>(schema: ZodSchema<T>) => new ZodValidationPipe<T>(schema);
