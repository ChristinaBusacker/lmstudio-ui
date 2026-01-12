import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { registerConversationPaths } from './conversations.openapi';
import { registerLmstudioPaths } from './lmstudio.openapi';
import { registerMessagePaths } from './messages.openapi';

type OpenApiDoc = Record<string, any>;

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registerConversationPaths(registry);
  registerLmstudioPaths(registry);
  registerMessagePaths(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  // Generate with the limited config type your version expects
  const doc = generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'lmstudio-ui API',
      version: '1.0.0',
    },
  }) as OpenApiDoc;

  // Patch in security scheme + global security
  // Patch in security scheme + global security
  doc['components'] ??= {};
  doc['components'].securitySchemes ??= {};

  doc['components'].securitySchemes.bearerAuth = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  };

  // optional: global default auth for all endpoints
  // optional: global default auth for all endpoints
  doc['security'] ??= [{ bearerAuth: [] }];

  return doc;
}
