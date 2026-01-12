import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

export function runMigrations(db: BetterSQLite3Database, migrationsFolder: string) {
  migrate(db, { migrationsFolder });
}
