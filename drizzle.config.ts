import type { Config } from 'drizzle-kit';

export default {
  schema: './src/server/db/schema',
  out: './src/server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH ?? './data.sqlite',
  },
} satisfies Config;
