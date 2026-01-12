import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { ChatRequestSchema } from '@shared/api/chat';

export function registerLmstudioPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/api/lmstudio/health',
    description: 'Proxy health check against LM Studio /models.',
    tags: ['LMStudio'],
    responses: {
      200: { description: 'OK (LM Studio reachable)' },
      500: { description: 'LM Studio unreachable' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/lmstudio/models',
    description: 'List available models from LM Studio (proxy).',
    tags: ['LMStudio'],
    responses: {
      200: { description: 'OK' },
      500: { description: 'LM Studio unreachable' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/lmstudio/chat',
    description: 'Non-streaming chat completion. Persists user & assistant messages.',
    tags: ['LMStudio'],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: ChatRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: 'Chat response',
        content: {
          'application/json': {
            schema: z.object({
              conversationId: z.string().uuid(),
              createdUserMessageIds: z.array(z.string().uuid()),
              createdAssistantMessageId: z.string().uuid().nullable(),
              assistantText: z.string().nullable().optional(),
            }),
          },
        },
      },
      400: { description: 'Validation error' },
      502: { description: 'LM Studio error' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/lmstudio/chat/stream',
    description:
      'Streaming chat via SSE. Events: meta, delta, reasoning_delta, done, final, error.\n\n' +
      'Example stream:\n' +
      'event: meta\n' +
      'data: {"conversationId":"...","createdUserMessageIds":["..."]}\n\n' +
      'event: delta\n' +
      'data: {"text":"Hello"}\n\n' +
      'event: final\n' +
      'data: {"createdAssistantMessageId":"..."}\n',
    tags: ['LMStudio'],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: ChatRequestSchema },
        },
      },
    },
    responses: {
      200: {
        description: 'SSE stream',
        content: {
          'text/event-stream': {
            schema: z.string(),
          },
        },
      },
      400: { description: 'Validation error' },
    },
  });

  // DEV ONLY endpoint (optional in docs)
  registry.registerPath({
    method: 'post',
    path: '/api/lmstudio/_debug/echo',
    description: 'Debug endpoint: echoes request body. DEV only.',
    tags: ['LMStudio'],
    responses: { 200: { description: 'OK' } },
  });
}
