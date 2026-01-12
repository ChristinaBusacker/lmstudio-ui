import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  CreateConversationRequestSchema,
  RenameConversationRequestSchema,
} from '@shared/api/conversations';

export function registerConversationPaths(registry: OpenAPIRegistry) {
  const IdParamSchema = z.object({ id: z.string().uuid() });

  registry.registerPath({
    method: 'post',
    path: '/api/conversations',
    description: 'Create a new conversation.',
    tags: ['Conversations'],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: CreateConversationRequestSchema },
        },
      },
    },
    responses: {
      201: {
        description: 'Created',
        content: {
          'application/json': {
            schema: z.object({ id: z.string().uuid() }),
          },
        },
      },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/conversations',
    description: 'List conversations.',
    tags: ['Conversations'],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'OK' },
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/conversations/{id}',
    description: 'Rename a conversation.',
    tags: ['Conversations'],
    security: [{ bearerAuth: [] }],
    request: {
      params: IdParamSchema,
      body: {
        required: true,
        content: {
          'application/json': { schema: RenameConversationRequestSchema },
        },
      },
    },
    responses: {
      204: { description: 'Updated' },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/conversations/{id}/messages',
    description: 'List messages for a conversation, including active variant.',
    tags: ['Conversations'],
    security: [{ bearerAuth: [] }],
    request: { params: IdParamSchema },
    responses: {
      200: { description: 'OK' },
      400: { description: 'Validation error' },
    },
  });
}
