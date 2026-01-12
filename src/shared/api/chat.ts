import { z } from 'zod';

export const ChatRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string().min(1),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  // IMPORTANT: In our current backend flow this should represent NEW messages (typically one user msg).
  messages: z.array(ChatMessageSchema).min(1),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Response for POST /api/lmstudio/chat
 */
export const ChatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  createdUserMessageIds: z.array(z.string().uuid()),
  createdAssistantMessageId: z.string().uuid().nullable(),
  assistantText: z.string().nullable(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
