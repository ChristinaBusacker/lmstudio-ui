import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

export function registerComponents(registry: OpenAPIRegistry) {
  // Bearer auth (matches your middleware)
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
  });

  // Optional: common error response schema could go here later
}
