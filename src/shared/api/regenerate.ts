import { z } from 'zod';

export const RegenerateRequestSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});
export type RegenerateRequest = z.infer<typeof RegenerateRequestSchema>;

/**
 * Response for "regenerate assistant message" endpoint
 * (e.g. POST /api/messages/:messageId/regenerate)
 */
export const RegenerateResponseSchema = z.object({
  messageId: z.string().uuid(),
  createdVariantId: z.string().uuid(),
  activeVariantId: z.string().uuid(),
});
export type RegenerateResponse = z.infer<typeof RegenerateResponseSchema>;
