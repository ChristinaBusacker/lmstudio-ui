import type { MessageRepository } from '@server/repositories/message.repository';
import type { ConversationRepository } from '@server/repositories/conversation.repository';
import type { SseSend } from '@server/http/sse';

export function persistIncomingUserMessages(params: {
  conversations: ConversationRepository;
  messagesRepo: MessageRepository;
  conversationId: string;
  incoming: Array<{ role: string; content: string }>;
}): string[] {
  const createdUserMessageIds: string[] = [];

  for (const m of params.incoming) {
    if (m.role !== 'user') continue;

    const { messageId } = params.messagesRepo.createMessageWithVariant({
      conversationId: params.conversationId,
      role: 'user',
      content: m.content,
      kind: 'original',
    });

    createdUserMessageIds.push(messageId);
  }

  params.conversations.touch(params.conversationId);
  return createdUserMessageIds;
}

export function requireAssistantMessageHttp(params: {
  messagesRepo: MessageRepository;
  messageId: string;
  res: import('express').Response;
}) {
  const msg = params.messagesRepo.getMessage(params.messageId);
  if (!msg) {
    params.res.status(404).json({ error: 'Message not found' });
    return null;
  }
  if (msg.deletedAt) {
    params.res.status(404).json({ error: 'Message deleted' });
    return null;
  }
  if (msg.role !== 'assistant') {
    params.res.status(400).json({ error: 'Only supported for assistant messages' });
    return null;
  }
  return msg;
}

export function requireAssistantMessageSse(params: {
  messagesRepo: MessageRepository;
  messageId: string;
  send: SseSend;
  end: () => void;
}) {
  const msg = params.messagesRepo.getMessage(params.messageId);
  if (!msg) {
    params.send('error', { message: 'Message not found' });
    params.end();
    return null;
  }
  if (msg.deletedAt) {
    params.send('error', { message: 'Message deleted' });
    params.end();
    return null;
  }
  if (msg.role !== 'assistant') {
    params.send('error', { message: 'Only supported for assistant messages' });
    params.end();
    return null;
  }
  return msg;
}

export const CONTINUE_HINT = {
  role: 'user' as const,
  content:
    'Continue from where you stopped. Output only the continuation (no preface, no repetition).',
};
