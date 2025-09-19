import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  text: text('text').notNull(),
  createdAt: integer('created_at').notNull(), // Unix timestamp in milliseconds
});

export const analysisResults = sqliteTable('analysis_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  docId: integer('doc_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  resultJson: text('result_json').notNull(),
  createdAt: integer('created_at').notNull(), // Unix timestamp in milliseconds
});