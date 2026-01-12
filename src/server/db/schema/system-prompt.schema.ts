import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const systemPromptPreset = sqliteTable(
  'system_prompt_preset',
  {
    id: text('id').primaryKey(), // uuid
    name: text('name').notNull(),
    prompt: text('prompt').notNull(),
    isEnabled: text('isEnabled').notNull(), // 'true'|'false'
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt').notNull(),
    deletedAt: text('deletedAt'),
  },
  (t) => [index('idx_system_prompt_name').on(t.name)]
);
