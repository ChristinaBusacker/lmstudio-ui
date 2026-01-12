import express from 'express';
import { createLmstudioRouter } from './lmstudio/lmstudio.router.js';

export function createApiRouter(deps: {
  conversationsRouter: express.Router;
  messagesRouter: express.Router;
  lmstudioRouter: express.Router;
}) {
  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ ok: true }));

  router.use('/lmstudio', deps.lmstudioRouter);
  router.use('/conversations', deps.conversationsRouter);
  router.use('/messages', deps.messagesRouter);

  // später:
  // router.use('/auth', deps.authRouter);

  return router;
}
