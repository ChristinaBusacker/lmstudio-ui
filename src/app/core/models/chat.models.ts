export type UUID = string;
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Conversation {
  id: UUID;
  title?: string | null;
  updatedAt?: string;
}

export interface ChatMessage {
  id: UUID;
  conversationId: UUID;
  role: Role;
  content: string;
  createdAt?: string;

  activeVariantId?: UUID | null;
}

export interface MessageVariant {
  id: UUID;
  messageId: UUID;
  content: string;
  createdAt?: string;
}

export interface ChatRequestMessage {
  role: Role;
  content: string;
}

export interface ChatResponse {
  conversationId: UUID;
  createdUserMessageIds: UUID[];
  createdAssistantMessageId: UUID | null;
  assistantText?: string | null;
}

export type ChatStreamEvent =
  | { type: 'meta'; conversationId: UUID; createdUserMessageIds: UUID[] }
  | { type: 'delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'final'; createdAssistantMessageId: UUID }
  | { type: 'done' }
  | { type: 'error'; message: string };
