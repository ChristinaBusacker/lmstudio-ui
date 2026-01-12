import type { ZodType } from 'zod';
import type { Response } from 'express';

export function parseOr400<T>(schema: ZodType<T>, value: unknown, res: Response): T | null {
  const r = schema.safeParse(value);
  if (!r.success) {
    res.status(400).json(r.error.flatten());
    return null;
  }
  return r.data;
}
