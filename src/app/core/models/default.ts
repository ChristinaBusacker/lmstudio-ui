export type UUID = string;

export interface Conversation {
  id: UUID;
  title?: string | null;
  updatedAt?: string; // falls vorhanden
}

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: UUID;
  conversationId: UUID;
  role: Role;
  content: string;
  createdAt?: string;
  // Active variant info (wenn API es liefert)
  activeVariantId?: UUID | null;
}

export interface MessageVariant {
  id: UUID;
  messageId: UUID;
  content: string;
  createdAt?: string;
  // evtl: model, temperature, etc.
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
