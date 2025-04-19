import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(migrationProjects),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Migration Project schema
export const migrationProjects = pgTable("migration_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  migrationType: text("migration_type").notNull(),
  sourceLanguage: text("source_language").notNull(),
  sourceVersion: text("source_version"),
  targetLanguage: text("target_language").notNull(),
  targetVersion: text("target_version"),
  status: text("status").default("pending").notNull(), // pending, in-progress, completed, failed
  totalFiles: integer("total_files").default(0),
  completedFiles: integer("completed_files").default(0),
  failedFiles: integer("failed_files").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id),
});

export const migrationProjectsRelations = relations(migrationProjects, ({ one, many }) => ({
  user: one(users, {
    fields: [migrationProjects.userId],
    references: [users.id],
  }),
  files: many(migrationFiles),
}));

export const insertMigrationProjectSchema = createInsertSchema(migrationProjects).pick({
  name: true,
  description: true,
  migrationType: true,
  sourceLanguage: true,
  sourceVersion: true,
  targetLanguage: true,
  targetVersion: true,
  status: true,
  totalFiles: true,
  completedFiles: true,
  failedFiles: true,
  startedAt: true,
  completedAt: true,
  userId: true,
});

// Migration File schema - for storing code files
export const migrationFiles = pgTable("migration_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => migrationProjects.id).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path"),
  fileType: text("file_type"), // store file extension or type
  fileSize: integer("file_size"), // store file size in bytes
  sourceCode: text("source_code").notNull(),
  targetCode: text("target_code"),
  status: text("status").default("pending").notNull(), // pending, completed, failed
  processingTime: integer("processing_time"), // time taken to process in milliseconds
  migrationErrors: jsonb("migration_errors"), // any errors that occurred during migration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const migrationFilesRelations = relations(migrationFiles, ({ one, many }) => ({
  project: one(migrationProjects, {
    fields: [migrationFiles.projectId],
    references: [migrationProjects.id],
  }),
  analysis: one(migrationAnalyses),
}));

export const insertMigrationFileSchema = createInsertSchema(migrationFiles).pick({
  projectId: true,
  fileName: true,
  filePath: true,
  fileType: true,
  fileSize: true,
  sourceCode: true,
  targetCode: true,
  status: true,
  processingTime: true,
  migrationErrors: true,
});

// Migration Analysis schema - for storing analysis results
export const migrationAnalyses = pgTable("migration_analyses", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => migrationFiles.id).notNull(),
  keyChanges: jsonb("key_changes").notNull(),
  performanceMetrics: jsonb("performance_metrics"),
  businessLogicPreservation: jsonb("business_logic_preservation"),
  generatedTests: text("generated_tests"),
  compatibilityScore: integer("compatibility_score"), // score from 0-100 indicating compatibility
  securityIssues: jsonb("security_issues"), // any security issues identified
  optimizationSuggestions: jsonb("optimization_suggestions"), // suggestions for code optimization
  migrationComplexity: text("migration_complexity"), // low, medium, high
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const migrationAnalysesRelations = relations(migrationAnalyses, ({ one }) => ({
  file: one(migrationFiles, {
    fields: [migrationAnalyses.fileId],
    references: [migrationFiles.id],
  }),
}));

export const insertMigrationAnalysisSchema = createInsertSchema(migrationAnalyses).pick({
  fileId: true,
  keyChanges: true,
  performanceMetrics: true,
  businessLogicPreservation: true,
  generatedTests: true,
  compatibilityScore: true,
  securityIssues: true,
  optimizationSuggestions: true,
  migrationComplexity: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMigrationProject = z.infer<typeof insertMigrationProjectSchema>;
export type MigrationProject = typeof migrationProjects.$inferSelect;

export type InsertMigrationFile = z.infer<typeof insertMigrationFileSchema>;
export type MigrationFile = typeof migrationFiles.$inferSelect;

export type InsertMigrationAnalysis = z.infer<typeof insertMigrationAnalysisSchema>;
export type MigrationAnalysis = typeof migrationAnalyses.$inferSelect;
