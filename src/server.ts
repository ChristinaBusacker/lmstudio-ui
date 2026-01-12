import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { join } from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { createApiRouter } from '@server/api';
import { authMiddleware } from '@server/auth/auth.middleware.js';
import { ConversationRepository } from '@server/repositories/conversation.repository.js';
import { MessageRepository } from '@server/repositories/message.repository.js';
import { createDb } from '@server/db/drizzle.js';
import { createLmstudioRouter } from '@server/api/lmstudio/lmstudio.router';
import { LmstudioService } from '@server/api/lmstudio/lmstudio.service';
import { createConversationsRouter } from '@server/api/conversations/conversations.router';
import { createMessagesRouter } from '@server/api/messages/messages.router';
import { buildOpenApiDocument } from '@server/docs';
import { env } from '@server/config/env';
import os from 'node:os';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Optional: only needed if you still want the Angular CLI dev-server integration.
// If you don't need it, you can remove the next line and the export at the bottom.
import { createNodeRequestHandler } from '@angular/ssr/node';

function getLocalIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const results: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }

  return results;
}

// patch the EXACT zod instance resolved at runtime
extendZodWithOpenApi(z);

// This is the browser build output (CSR)
const browserDistFolder = join(import.meta.dirname, '../browser');
const indexHtmlPath = join(browserDistFolder, 'index.csr.html');

const app = express();

/**
 * Global middleware
 */
app.disable('x-powered-by');

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body parsing (tune limits for long chats)
app.use('/api', express.json({ limit: '2mb' }));

/**
 * API routes (MUST come before SPA catch-all)
 */
const { db } = createDb();

const conversationRepo = new ConversationRepository(db);
const messageRepo = new MessageRepository(db);

const conversationsRouter = createConversationsRouter({
  conversations: conversationRepo,
  messages: messageRepo,
});

const lmstudio = new LmstudioService();

const messagesRouter = createMessagesRouter({
  conversations: conversationRepo,
  messages: messageRepo,
  lmstudio,
});

const lmstudioRouter = createLmstudioRouter({
  conversations: conversationRepo,
  messages: messageRepo,
  lmstudio,
});

// Swagger (unchanged)
const isMain =
  // minimal replacement for isMainModule(import.meta.url) when SSR is disabled
  // If you rely on PM2, keep pm_id check too
  Boolean(process.env['pm_id']) ||
  process.argv[1]?.includes('server') ||
  process.argv[1]?.includes('main');

if (isMain && env.ENABLE_SWAGGER) {
  const openapi = buildOpenApiDocument();
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
}

app.use(
  '/api',
  authMiddleware,
  createApiRouter({ lmstudioRouter, conversationsRouter, messagesRouter })
);

/**
 * Serve static files from /browser (Angular CSR build)
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * SPA fallback:
 * All non-API routes should serve index.html so Angular Router can handle them.
 */
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(indexHtmlPath);
});

/**
 * Error handler
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 */
if (isMain) {
  const port = Number(env.PORT || 4000);
  const host = env.HOST ?? '0.0.0.0';
  app.listen(port, host, (error) => {
    if (error) throw error;

    console.log(`\n🚀 lmstudio-ui server started (CSR only, SSR disabled)`);
    console.log(`→ Local:    http://localhost:${port}`);

    const ips = getLocalIPv4Addresses();
    for (const ip of ips) {
      console.log(`→ Network:  http://${ip}:${port}`);
    }

    if (env.ENABLE_SWAGGER) {
      console.log(`\n📚 API Docs`);
      console.log(`→ Swagger:  http://localhost:${port}/api/docs`);
      for (const ip of ips) {
        console.log(`→ Swagger:  http://${ip}:${port}/api/docs`);
      }
    }
    console.log();
    console.log(`→ openapi.json:  http://localhost:${port}/api/openapi.json`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build)
 * If you don't use Angular's SSR dev-server integration anymore, remove this export.
 */
export const reqHandler = createNodeRequestHandler(app);
