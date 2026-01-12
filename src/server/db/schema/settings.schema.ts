import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const appSettings = sqliteTable('app_settings', {
  // single row table, id always 'global'
  id: text('id').primaryKey(),

  // general settings
  temperature: text('temperature'), // default temp
  autoScrollEnabled: text('autoScrollEnabled'), // 'true'|'false'
  showReasoning: text('showReasoning'), // 'true'|'false'
  persistReasoning: text('persistReasoning'), // 'true'|'false'
  defaultModel: text('defaultModel'),

  // system prompt presets enabled globally (if you want a global toggle)
  systemPromptsEnabled: text('systemPromptsEnabled'), // 'true'|'false'
});
