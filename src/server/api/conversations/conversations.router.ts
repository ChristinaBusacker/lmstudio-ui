import express from 'express';
import { z } from 'zod';

import type { ConversationRepository } from '@server/repositories/conversation.repository';
import type { MessageRepository } from '@server/repositories/message.repository';
import {
  CreateConversationRequestSchema,
  RenameConversationRequestSchema,
} from '@shared/api/conversations';

import { parseOr400 } from '@server/http/zod';

const IdParamSchema = z.object({ id: z.string().uuid() });

export function createConversationsRouter(deps: {
  conversations: ConversationRepository;
  messages: MessageRepository;
}) {
  const router = express.Router();

  // POST /api/conversations
  router.post('/', (req, res) => {
    const body = parseOr400(CreateConversationRequestSchema, req.body ?? {}, res);
    if (!body) return;

    const id = deps.conversations.create(body.title ?? null);
    return res.status(201).json({ id });
  });

  // GET /api/conversations
  router.get('/', (_req, res) => {
    const list = deps.conversations.list();
    return res.json(list);
  });

  // PATCH /api/conversations/:id
  router.patch('/:id', (req, res) => {
    const params = parseOr400(IdParamSchema, req.params, res);
    if (!params) return;

    const body = parseOr400(RenameConversationRequestSchema, req.body ?? {}, res);
    if (!body) return;

    deps.conversations.rename(params.id, body.title);
    return res.status(204).send();
  });

  // GET /api/conversations/:id/messages
  router.get('/:id/messages', (req, res) => {
    const params = parseOr400(IdParamSchema, req.params, res);
    if (!params) return;

    const msgs = deps.messages.listMessagesWithActiveVariant(params.id);
    return res.json(msgs);
  });

  return router;
}
