import { AppDb } from '@server/db/drizzle';
import { conversation } from '@server/db/schema';
import { desc, eq, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const nowIso = () => new Date().toISOString();

export class ConversationRepository {
  constructor(private readonly db: AppDb) {}

  create(title?: string | null) {
    const id = randomUUID();
    const ts = nowIso();
    this.db
      .insert(conversation)
      .values({
        id,
        title: title ?? null,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      })
      .run();
    return id;
  }

  rename(id: string, title: string | null) {
    this.db
      .update(conversation)
      .set({ title, updatedAt: nowIso() })
      .where(eq(conversation.id, id))
      .run();
  }

  touch(id: string) {
    this.db.update(conversation).set({ updatedAt: nowIso() }).where(eq(conversation.id, id)).run();
  }

  list() {
    return this.db
      .select()
      .from(conversation)
      .where(isNull(conversation.deletedAt))
      .orderBy(desc(conversation.updatedAt))
      .all();
  }

  softDelete(id: string) {
    this.db
      .update(conversation)
      .set({ deletedAt: nowIso(), updatedAt: nowIso() })
      .where(eq(conversation.id, id))
      .run();
  }

  getTitle(id: string): string | null {
    const row = this.db
      .select({ title: conversation.title })
      .from(conversation)
      .where(eq(conversation.id, id))
      .get();
    return row?.title ?? null;
  }
}
