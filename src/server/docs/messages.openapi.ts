import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { RegenerateRequestSchema } from '@shared/api/regenerate';
import { SetActiveVariantRequestSchema } from '@shared/api/messages';

export function registerMessagePaths(registry: OpenAPIRegistry) {
  const MessageIdParamSchema = z.object({ messageId: z.string().uuid() });

  registry.registerPath({
    method: 'get',
    path: '/api/messages/{messageId}/variants',
    description: 'List variants for a message.',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: { params: MessageIdParamSchema },
    responses: {
      200: { description: 'OK' },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/messages/{messageId}/active-variant',
    description: 'Set active variant for a message.',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: {
      params: MessageIdParamSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: SetActiveVariantRequestSchema } },
      },
    },
    responses: {
      204: { description: 'Updated' },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/messages/{messageId}',
    description: 'Soft-delete a message.',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: { params: MessageIdParamSchema },
    responses: {
      204: { description: 'Deleted' },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/messages/{messageId}/variants/regenerate',
    description: 'Regenerate assistant message (creates new variant, sets active).',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: {
      params: MessageIdParamSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: RegenerateRequestSchema } },
      },
    },
    responses: {
      201: { description: 'Created' },
      400: { description: 'Validation error' },
      404: { description: 'Message/context not found' },
      502: { description: 'LM Studio error' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/messages/{messageId}/variants/continue',
    description: 'Continue assistant message (creates new variant, sets active).',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: {
      params: MessageIdParamSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: RegenerateRequestSchema } },
      },
    },
    responses: {
      201: { description: 'Created' },
      400: { description: 'Validation error' },
      404: { description: 'Message/context not found' },
      502: { description: 'LM Studio error' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/messages/{messageId}/variants/regenerate/stream',
    description:
      'Streaming regenerate via SSE. Events: meta, delta, reasoning_delta, done, final, error.',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: {
      params: MessageIdParamSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: RegenerateRequestSchema } },
      },
    },
    responses: {
      200: {
        description: 'SSE stream',
        content: { 'text/event-stream': { schema: z.string() } },
      },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/messages/{messageId}/variants/continue/stream',
    description:
      'Streaming continue via SSE. Events: meta, delta, reasoning_delta, done, final, error.',
    tags: ['Messages'],
    security: [{ bearerAuth: [] }],
    request: {
      params: MessageIdParamSchema,
      body: {
        required: true,
        content: { 'application/json': { schema: RegenerateRequestSchema } },
      },
    },
    responses: {
      200: {
        description: 'SSE stream',
        content: { 'text/event-stream': { schema: z.string() } },
      },
      400: { description: 'Validation error' },
    },
  });
}
