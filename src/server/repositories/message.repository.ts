import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, sql, lt, lte } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import { message, messageVariant } from '@server/db/schema';
import type { ChatMessage } from '@shared/api/chat';
import { AppDb } from '@server/db/drizzle';

const nowIso = () => new Date().toISOString();

export type VariantKind = 'original' | 'regenerate' | 'edit' | 'continue';

export type MessageRow = {
  id: string;
  conversationId: string;
  role: ChatMessage['role'];
  createdAt: string;
  deletedAt: string | null;
  parentMessageId: string | null;
  activeVariantId: string | null;
};

export type MessageWithActiveContent = {
  id: string;
  conversationId: string;
  role: ChatMessage['role'];
  createdAt: string;
  parentMessageId: string | null;
  activeVariantId: string | null;

  // active variant
  content: string | null;
  variantCreatedAt: string | null;
  variantKind: VariantKind | null;
  variantMetaJson: string | null;
};

export type VariantRow = {
  id: string;
  messageId: string;
  content: string;
  createdAt: string;
  kind: VariantKind;
  metaJson: string | null;
};

export class MessageRepository {
  constructor(private readonly db: AppDb) {}

  /**
   * Creates a new logical message slot (message table) and its first variant.
   * The created variant is set as activeVariantId.
   */
  createMessageWithVariant(params: {
    conversationId: string;
    role: ChatMessage['role'];
    content: string;
    reasoning?: string | null;
    kind: VariantKind; // usually 'original'
    parentMessageId?: string | null;
    metaJson?: string | null;
    createdAt?: string; // optional override for consistent timestamps
  }): { messageId: string; variantId: string } {
    const messageId = randomUUID();
    const variantId = randomUUID();
    const ts = params.createdAt ?? nowIso();

    this.db.transaction(() => {
      this.db
        .insert(message)
        .values({
          id: messageId,
          conversationId: params.conversationId,
          role: params.role,
          createdAt: ts,
          deletedAt: null,
          parentMessageId: params.parentMessageId ?? null,
          activeVariantId: variantId,
        })
        .run();

      this.db
        .insert(messageVariant)
        .values({
          id: variantId,
          messageId,
          content: params.content,
          reasoning: params.reasoning ?? null,
          createdAt: ts,
          kind: params.kind,
          metaJson: params.metaJson ?? null,
        })
        .run();
    });

    return { messageId, variantId };
  }

  /**
   * Adds a new variant to an existing message slot.
   * Typically used for regenerate/edit/continue.
   */
  addVariant(params: {
    messageId: string;
    content: string;
    reasoning?: string | null;
    kind: Exclude<VariantKind, 'original'> | VariantKind;
    metaJson?: string | null;
    setActive?: boolean; // default true
    createdAt?: string;
  }): string {
    const variantId = randomUUID();
    const ts = params.createdAt ?? nowIso();
    const setActive = params.setActive ?? true;

    this.db.transaction(() => {
      this.db
        .insert(messageVariant)
        .values({
          id: variantId,
          messageId: params.messageId,
          content: params.content,
          reasoning: params.reasoning ?? null,
          createdAt: ts,
          kind: params.kind,
          metaJson: params.metaJson ?? null,
        })
        .run();

      if (setActive) {
        this.db
          .update(message)
          .set({ activeVariantId: variantId })
          .where(and(eq(message.id, params.messageId), isNull(message.deletedAt)))
          .run();
      }
    });

    return variantId;
  }

  setActiveVariant(messageId: string, variantId: string) {
    // Optional: could assert that variantId belongs to messageId before setting.
    this.db
      .update(message)
      .set({ activeVariantId: variantId })
      .where(and(eq(message.id, messageId), isNull(message.deletedAt)))
      .run();
  }

  softDeleteMessage(messageId: string) {
    this.db.update(message).set({ deletedAt: nowIso() }).where(eq(message.id, messageId)).run();
  }

  /**
   * Returns the message list with the currently active variant content joined in.
   * This is the main "render chat history" query.
   */
  listMessagesWithActiveVariant(conversationId: string): ChatMessage[] {
    return this.db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        createdAt: message.createdAt,
        parentMessageId: message.parentMessageId,
        activeVariantId: message.activeVariantId,

        content: messageVariant.content,
        variantCreatedAt: messageVariant.createdAt,
        variantKind: messageVariant.kind,
        variantMetaJson: messageVariant.metaJson,

        variantCount: sql<number>`
        (
          SELECT COUNT(*)
          FROM message_variant mv
          WHERE mv.messageId = ${message.id}
        )
      `.as('variantCount'),
      })
      .from(message)
      .leftJoin(
        messageVariant,
        and(
          eq(messageVariant.id, message.activeVariantId),
          eq(messageVariant.messageId, message.id)
        )
      )
      .where(and(eq(message.conversationId, conversationId), isNull(message.deletedAt)))
      .orderBy(asc(message.createdAt))
      .all() as ChatMessage[];
  }

  listVariantsForMessage(messageId: string): VariantRow[] {
    return this.db
      .select({
        id: messageVariant.id,
        messageId: messageVariant.messageId,
        content: messageVariant.content,
        createdAt: messageVariant.createdAt,
        kind: messageVariant.kind,
        metaJson: messageVariant.metaJson,
      })
      .from(messageVariant)
      .where(eq(messageVariant.messageId, messageId))
      .orderBy(asc(messageVariant.createdAt))
      .all() as VariantRow[];
  }

  /**
   * Convenience: get one message slot (without variants).
   */
  getMessage(messageId: string): MessageRow | null {
    return (this.db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        createdAt: message.createdAt,
        deletedAt: message.deletedAt,
        parentMessageId: message.parentMessageId,
        activeVariantId: message.activeVariantId,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .get() ?? null) as MessageRow | null;
  }

  getChatContext(conversationId: string): ChatMessage[] {
    const rows = this.listMessagesWithActiveVariant(conversationId);

    return rows
      .filter((r) => r.content && r.content.length > 0)
      .map((r) => ({
        role: r.role,
        content: r.content ?? '',
      }));
  }

  getChatContextBeforeMessage(
    messageId: string
  ): { conversationId: string; context: ChatMessage[] } | null {
    const target = this.db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        createdAt: message.createdAt,
        deletedAt: message.deletedAt,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .get();

    if (!target || target.deletedAt !== null) return null;

    const rows = this.db
      .select({
        role: message.role,
        content: messageVariant.content,
        createdAt: message.createdAt,
      })
      .from(message)
      .leftJoin(
        messageVariant,
        and(
          eq(messageVariant.id, message.activeVariantId),
          eq(messageVariant.messageId, message.id)
        )
      )
      .where(
        and(
          eq(message.conversationId, target.conversationId),
          isNull(message.deletedAt),
          lt(message.createdAt, target.createdAt) // STRICTLY before the target message
        )
      )
      .orderBy(asc(message.createdAt))
      .all();

    const context: ChatMessage[] = rows
      .filter((r) => typeof r.content === 'string' && r.content.length > 0)
      .map((r) => ({
        role: r.role as ChatMessage['role'],
        content: r.content as string,
      }));

    return { conversationId: target.conversationId, context };
  }

  countVariants(messageId: string): number {
    const row = this.db
      .select({
        count: sql<number>`count(*)`.as('count'),
      })
      .from(messageVariant)
      .where(eq(messageVariant.messageId, messageId))
      .get();

    return row?.count ?? 0;
  }

  getContextThroughMessage(
    messageId: string
  ): { conversationId: string; context: ChatMessage[] } | null {
    const target = this.db
      .select({
        id: message.id,
        conversationId: message.conversationId,
        createdAt: message.createdAt,
        deletedAt: message.deletedAt,
      })
      .from(message)
      .where(eq(message.id, messageId))
      .get();

    if (!target || target.deletedAt !== null) return null;

    const rows = this.db
      .select({
        role: message.role,
        content: messageVariant.content,
        createdAt: message.createdAt,
      })
      .from(message)
      .leftJoin(
        messageVariant,
        and(
          eq(messageVariant.id, message.activeVariantId),
          eq(messageVariant.messageId, message.id)
        )
      )
      .where(
        and(
          eq(message.conversationId, target.conversationId),
          isNull(message.deletedAt),
          lte(message.createdAt, target.createdAt) // <= include the target message
        )
      )
      .orderBy(asc(message.createdAt))
      .all();

    const context: ChatMessage[] = rows
      .filter((r) => typeof r.content === 'string' && r.content.length > 0)
      .map((r) => ({
        role: r.role as ChatMessage['role'],
        content: r.content as string,
      }));

    return { conversationId: target.conversationId, context };
  }
}
