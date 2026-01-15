import express from 'express';
import { ChatRequestSchema } from '@shared/api/chat';
import type { ConversationRepository } from '@server/repositories/conversation.repository';
import type { MessageRepository } from '@server/repositories/message.repository';
import { LmstudioService } from './lmstudio.service';
import { env } from '@server/config/env';

import { startSse } from '@server/http/sse';
import { parseOr400 } from '@server/http/zod';
import { persistIncomingUserMessages } from '@server/domain/messages/helpers';

type Deps = {
  conversations: ConversationRepository;
  messages: MessageRepository;
  lmstudio: LmstudioService;
};

export function createLmstudioRouter(deps: Deps) {
  const router = express.Router();

  // GET /api/lmstudio/health
  router.get('/health', async (_req, res) => {
    try {
      const r = await fetch(`${env.LMSTUDIO_BASE_URL}/models`);
      const text = await r.text();
      return res.status(r.status).type('application/json').send(text);
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
    }
  });

  // ✅ NEW: GET /api/lmstudio/models
  // (simple proxy; later we can normalize the shape)
  router.get('/models', async (_req, res) => {
    try {
      const r = await fetch(`${env.LMSTUDIO_BASE_URL}/models`);
      const text = await r.text();
      return res.status(r.status).type('application/json').send(text);
    } catch (e: any) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  // POST /api/lmstudio/chat (non-stream)
  router.post('/chat', async (req, res) => {
    const body = parseOr400(ChatRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const { conversationId: maybeConvId, messages, model, temperature } = body;
    const conversationId = maybeConvId ?? deps.conversations.create(null);

    try {
      const context = deps.messages.getChatContext(conversationId);

      const createdUserMessageIds = persistIncomingUserMessages({
        conversations: deps.conversations,
        messagesRepo: deps.messages,
        conversationId,
        incoming: messages,
      });

      const outgoing = [...context, ...messages];

      const lm = await deps.lmstudio.chat({
        model,
        temperature,
        messages: outgoing,
      });

      let createdAssistantMessageId: string | null = null;
      if (lm.assistantText) {
        const { messageId } = deps.messages.createMessageWithVariant({
          conversationId,
          role: 'assistant',
          content: lm.assistantText,
          kind: 'original',
          metaJson: JSON.stringify(lm.raw),
        });
        createdAssistantMessageId = messageId;

        deps.conversations.touch(conversationId);
      }

      return res.json({
        conversationId,
        createdUserMessageIds,
        createdAssistantMessageId,
        assistantText: lm.assistantText,
      });
    } catch (e: any) {
      console.error(e);
      return res
        .status(502)
        .json({ error: 'LMStudio call failed', details: String(e?.message ?? e) });
    }
  });

  // POST /api/lmstudio/chat/stream (SSE)
  router.post('/chat/stream', async (req, res) => {
    const body = parseOr400(ChatRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const { conversationId: maybeConvId, messages, model, temperature } = body;
    const conversationId = maybeConvId ?? deps.conversations.create(null);

    const sse = startSse(req, res);

    try {
      const context = deps.messages.getChatContext(conversationId);

      const createdUserMessageIds = persistIncomingUserMessages({
        conversations: deps.conversations,
        messagesRepo: deps.messages,
        conversationId,
        incoming: messages,
      });

      sse.send('meta', { conversationId, createdUserMessageIds });

      const sysPrompt = {
        role: 'system',
        content: ``,
      };

      const result = await deps.lmstudio.streamChat({
        messages: [sysPrompt, ...context, ...messages],
        model,
        temperature,
        send: sse.send,
        abortSignal: sse.abortSignal,
      });

      if (sse.clientClosed()) return sse.end();

      if (!result.fullText.trim().length) {
        sse.send('error', { message: 'LM Studio produced empty output' });
        return sse.end();
      }

      const { messageId: assistantMessageId } = deps.messages.createMessageWithVariant({
        conversationId,
        role: 'assistant',
        content: result.fullText,
        reasoning: result.fullReasoning?.trim().length ? result.fullReasoning : null,
        kind: 'original',
        metaJson: JSON.stringify({ streamed: true }),
      });

      deps.conversations.touch(conversationId);

      const existingTitle = deps.conversations.getTitle(conversationId);
      const userCount = deps.messages.countUserMessages(conversationId);

      if (!existingTitle && userCount === 1 && !sse.clientClosed()) {
        // pick the first user message we received in this request
        const firstUserText = messages.find((m) => m.role === 'user')?.content ?? '';

        const title = await deps.lmstudio.generateTitle({
          userText: firstUserText,
          assistantText: result.fullText,
          model,
        });

        if (title && title.trim().length) {
          deps.conversations.rename(conversationId, title);
          sse.send('title', { title });
        }
      }

      sse.send('final', { createdAssistantMessageId: assistantMessageId });
      return sse.end();
    } catch (e: any) {
      if (sse.abortSignal.aborted || String(e?.name ?? '') === 'AbortError') return sse.end();
      console.error(e);
      sse.send('error', { message: String(e?.message ?? e) });
      return sse.end();
    }
  });

  // DEV ONLY
  router.post('/_debug/echo', (req, res) => {
    return res.json({ ok: true, body: req.body });
  });

  return router;
}
