import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { conversation } from './conversation.schema';

export const message = sqliteTable(
  'message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversationId')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),

    role: text('role').notNull(),
    createdAt: text('createdAt').notNull(),
    deletedAt: text('deletedAt'),

    parentMessageId: text('parentMessageId'),

    activeVariantId: text('activeVariantId'),
  },
  (t) => [
    index('idx_message_conv_createdAt').on(t.conversationId, t.createdAt),
    index('idx_message_role').on(t.role),
  ]
);

export const messageVariant = sqliteTable(
  'message_variant',
  {
    id: text('id').primaryKey(),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),

    content: text('content').notNull(),
    createdAt: text('createdAt').notNull(),
    reasoning: text('reasoning'),
    kind: text('kind').notNull(),
    metaJson: text('metaJson'),
  },
  (t) => ({
    msgCreatedIdx: index('idx_variant_message_createdAt').on(t.messageId, t.createdAt),
  })
);
