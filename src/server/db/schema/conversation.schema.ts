import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const conversation = sqliteTable('conversation', {
  id: text('id').primaryKey(),
  title: text('title'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  deletedAt: text('deletedAt'),
});

export const conversationSettings = sqliteTable('conversation_settings', {
  conversationId: text('conversationId')
    .primaryKey()
    .references(() => conversation.id, { onDelete: 'cascade' }),
  model: text('model'),
  temperature: text('temperature'),
  systemPromptPresetIdsJson: text('systemPromptPresetIdsJson'),
});
