import { z } from 'zod';

export const CreateConversationRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});
export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>;

export const RenameConversationRequestSchema = z.object({
  title: z.string().min(1).max(200).nullable(),
});
export type RenameConversationRequest = z.infer<typeof RenameConversationRequestSchema>;

/**
 * Response for POST /api/conversations
 */
export const CreateConversationResponseSchema = z.object({
  id: z.string().uuid(),
});
export type CreateConversationResponse = z.infer<typeof CreateConversationResponseSchema>;

/**
 * Item for GET /api/conversations
 *
 * Note: Keep this stable for the frontend. Avoid returning deletedAt.
 */
export const ConversationListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().nullable(),
  createdAt: z.string(), // ISO string
  updatedAt: z.string(), // ISO string
});
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;

export const ConversationListResponseSchema = z.array(ConversationListItemSchema);
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;
