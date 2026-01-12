import { z } from 'zod';

export const SetActiveVariantRequestSchema = z.object({
  variantId: z.string().uuid(),
});
export type SetActiveVariantRequest = z.infer<typeof SetActiveVariantRequestSchema>;

/**
 * List item for GET /api/conversations/:id/messages
 */
export const MessageListItemSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  createdAt: z.string(), // ISO
  parentMessageId: z.string().uuid().nullable(),
  activeVariantId: z.string().uuid().nullable(),

  // active variant data (nullable if something is inconsistent / not created yet)
  content: z.string().nullable(),

  // How many variants exist for this message slot
  variantCount: z.number().int().nonnegative(),
});
export type MessageListItem = z.infer<typeof MessageListItemSchema>;

export const MessageListResponseSchema = z.array(MessageListItemSchema);
export type MessageListResponse = z.infer<typeof MessageListResponseSchema>;

/**
 * List item for GET /api/messages/:messageId/variants
 */
export const MessageVariantListItemSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
  content: z.string(),
  createdAt: z.string(), // ISO
  kind: z.enum(['original', 'regenerate', 'edit', 'continue']),
  metaJson: z.string().nullable(),
});
export type MessageVariantListItem = z.infer<typeof MessageVariantListItemSchema>;

export const MessageVariantListResponseSchema = z.array(MessageVariantListItemSchema);
export type MessageVariantListResponse = z.infer<typeof MessageVariantListResponseSchema>;
