import Database from 'better-sqlite3';
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';

import { env } from '@server/config/env';
import * as schema from './schema';

export type Db = ReturnType<typeof createDb>;
export type AppSchema = typeof schema;
export type AppDb = BetterSQLite3Database<AppSchema>;

export function createDb() {
  const sqlite = new Database(env.DB_PATH);

  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
