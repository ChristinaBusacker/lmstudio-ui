import express from 'express';
import { z } from 'zod';

import type { MessageRepository } from '@server/repositories/message.repository';
import { ConversationRepository } from '@server/repositories/conversation.repository';
import { LmstudioService } from '../lmstudio/lmstudio.service';

import { SetActiveVariantRequestSchema } from '@shared/api/messages';
import { RegenerateRequestSchema } from '@shared/api/regenerate';
import { env } from '@server/config/env';

import { startSse } from '@server/http/sse';
import { parseOr400 } from '@server/http/zod';
import {
  CONTINUE_HINT,
  requireAssistantMessageHttp,
  requireAssistantMessageSse,
} from '@server/domain/messages/helpers';

const MessageIdSchema = z.object({ messageId: z.string().uuid() });

type Deps = {
  lmstudio: LmstudioService;
  conversations: ConversationRepository;
  messages: MessageRepository;
};

export function createMessagesRouter(deps: Deps) {
  const router = express.Router();

  // GET /api/messages/:messageId/variants
  router.get('/:messageId/variants', (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const variants = deps.messages.listVariantsForMessage(params.messageId);
    return res.json(variants);
  });

  // PATCH /api/messages/:messageId/active-variant
  router.patch('/:messageId/active-variant', (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(SetActiveVariantRequestSchema, req.body ?? {}, res);
    if (!body) return;

    deps.messages.setActiveVariant(params.messageId, body.variantId);
    return res.status(204).send();
  });

  // DELETE /api/messages/:messageId
  router.delete('/:messageId', (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    deps.messages.softDeleteMessage(params.messageId);
    return res.status(204).send();
  });

  // POST /api/messages/:messageId/variants/regenerate
  router.post('/:messageId/variants/regenerate', async (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(RegenerateRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const target = requireAssistantMessageHttp({
      messagesRepo: deps.messages,
      messageId: params.messageId,
      res,
    });
    if (!target) return;

    const ctx = deps.messages.getChatContextBeforeMessage(params.messageId);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });

    try {
      const lm = await deps.lmstudio.chat({
        model: body.model,
        temperature: body.temperature,
        messages: ctx.context,
      });

      if (!lm.assistantText) {
        return res.status(502).json({ error: 'LM Studio returned no assistant text' });
      }

      const variantId = deps.messages.addVariant({
        messageId: params.messageId,
        content: lm.assistantText,
        kind: 'regenerate',
        metaJson: JSON.stringify(lm.raw),
        setActive: true,
      });

      deps.conversations.touch(ctx.conversationId);

      const variantCount = deps.messages.countVariants(params.messageId);

      return res.status(201).json({
        messageId: params.messageId,
        variantId,
        variantCount,
        assistantText: lm.assistantText,
      });
    } catch (e: any) {
      console.error(e);
      return res.status(502).json({
        error: 'LMStudio call failed',
        details: String(e?.message ?? e),
      });
    }
  });

  // POST /api/messages/:messageId/variants/continue
  router.post('/:messageId/variants/continue', async (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(RegenerateRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const target = requireAssistantMessageHttp({
      messagesRepo: deps.messages,
      messageId: params.messageId,
      res,
    });
    if (!target) return;

    const ctx = deps.messages.getContextThroughMessage(params.messageId);
    if (!ctx) return res.status(404).json({ error: 'Context not found' });

    try {
      const lm = await deps.lmstudio.chat({
        model: body.model,
        temperature: body.temperature,
        messages: [...ctx.context, CONTINUE_HINT],
      });

      if (!lm.assistantText) {
        return res.status(502).json({ error: 'LM Studio returned no assistant text' });
      }

      const variantId = deps.messages.addVariant({
        messageId: params.messageId,
        content: lm.assistantText,
        kind: 'continue',
        metaJson: JSON.stringify(lm.raw),
        setActive: true,
      });

      deps.conversations.touch(ctx.conversationId);

      const variantCount = deps.messages.countVariants(params.messageId);

      return res.status(201).json({
        messageId: params.messageId,
        variantId,
        variantCount,
        assistantText: lm.assistantText,
      });
    } catch (e: any) {
      console.error(e);
      return res.status(502).json({
        error: 'LMStudio call failed',
        details: String(e?.message ?? e),
      });
    }
  });

  // POST /api/messages/:messageId/variants/regenerate/stream
  router.post('/:messageId/variants/regenerate/stream', async (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(RegenerateRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const sse = startSse(req, res);

    const target = requireAssistantMessageSse({
      messagesRepo: deps.messages,
      messageId: params.messageId,
      send: sse.send,
      end: sse.end,
    });
    if (!target) return;

    const ctx = deps.messages.getChatContextBeforeMessage(params.messageId);
    if (!ctx) {
      sse.send('error', { message: 'Context not found' });
      return sse.end();
    }

    sse.send('meta', { messageId: params.messageId, conversationId: ctx.conversationId });

    try {
      const result = await deps.lmstudio.streamChat({
        messages: ctx.context,
        model: body.model ?? env.LMSTUDIO_MODEL,
        temperature: body.temperature ?? 0.7,
        send: sse.send,
        abortSignal: sse.abortSignal,
      });

      if (sse.clientClosed()) return sse.end();

      if (!result.fullText.trim().length) {
        sse.send('error', { message: 'LM Studio produced empty output' });
        return sse.end();
      }

      const variantId = deps.messages.addVariant({
        messageId: params.messageId,
        content: result.fullText,
        reasoning: result.fullReasoning?.trim().length ? result.fullReasoning : null,
        kind: 'regenerate',
        metaJson: JSON.stringify({ streamed: true }),
        setActive: true,
      });

      deps.conversations.touch(ctx.conversationId);

      const variantCount = deps.messages.countVariants(params.messageId);

      sse.send('final', { messageId: params.messageId, variantId, variantCount });
      return sse.end();
    } catch (e: any) {
      if (sse.abortSignal.aborted || String(e?.name ?? '') === 'AbortError') return sse.end();
      console.error(e);
      sse.send('error', { message: String(e?.message ?? e) });
      return sse.end();
    }
  });

  // POST /api/messages/:messageId/variants/continue/stream
  router.post('/:messageId/variants/continue/stream', async (req, res) => {
    const params = parseOr400(MessageIdSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(RegenerateRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const sse = startSse(req, res);

    const target = requireAssistantMessageSse({
      messagesRepo: deps.messages,
      messageId: params.messageId,
      send: sse.send,
      end: sse.end,
    });
    if (!target) return;

    const ctx = deps.messages.getContextThroughMessage(params.messageId);
    if (!ctx) {
      sse.send('error', { message: 'Context not found' });
      return sse.end();
    }

    sse.send('meta', { messageId: params.messageId, conversationId: ctx.conversationId });

    try {
      const result = await deps.lmstudio.streamChat({
        messages: [...ctx.context, CONTINUE_HINT],
        model: body.model ?? env.LMSTUDIO_MODEL,
        temperature: body.temperature ?? 0.7,
        send: sse.send,
        abortSignal: sse.abortSignal,
      });

      if (sse.clientClosed()) return sse.end();

      if (!result.fullText.trim().length) {
        sse.send('error', { message: 'LM Studio produced empty output' });
        return sse.end();
      }

      const variantId = deps.messages.addVariant({
        messageId: params.messageId,
        content: result.fullText,
        reasoning: result.fullReasoning?.trim().length ? result.fullReasoning : null,
        kind: 'continue',
        metaJson: JSON.stringify({ streamed: true }),
        setActive: true,
      });

      deps.conversations.touch(ctx.conversationId);

      const variantCount = deps.messages.countVariants(params.messageId);

      sse.send('final', { messageId: params.messageId, variantId, variantCount });
      return sse.end();
    } catch (e: any) {
      if (sse.abortSignal.aborted || String(e?.name ?? '') === 'AbortError') return sse.end();
      console.error(e);
      sse.send('error', { message: String(e?.message ?? e) });
      return sse.end();
    }
  });

  return router;
}
