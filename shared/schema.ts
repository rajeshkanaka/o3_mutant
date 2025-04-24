import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").default("New Chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const chatSessionsRelations = relations(chatSessions, ({ many }) => ({
  messages: many(messages)
}));

export const insertChatSessionSchema = createInsertSchema(chatSessions).pick({
  name: true
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("token_count"),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [messages.sessionId],
    references: [chatSessions.id],
  })
}));

export const insertMessageSchema = createInsertSchema(messages).pick({
  sessionId: true,
  role: true,
  content: true,
  tokenCount: true
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// System Prompts
export const systemPrompts = pgTable("system_prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Custom Prompt"),
  content: text("content").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertSystemPromptSchema = createInsertSchema(systemPrompts).pick({
  name: true,
  content: true,
  isDefault: true
});

export type InsertSystemPrompt = z.infer<typeof insertSystemPromptSchema>;
export type SystemPrompt = typeof systemPrompts.$inferSelect;

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  passwordHash: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// GitHub credentials
export const githubCredentials = pgTable("github_credentials", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertGithubCredentialsSchema = createInsertSchema(githubCredentials).pick({
  username: true,
  token: true
});

export type InsertGithubCredentials = z.infer<typeof insertGithubCredentialsSchema>;
export type GithubCredentials = typeof githubCredentials.$inferSelect;

// GitHub repositories
export const githubRepositories = pgTable("github_repositories", {
  id: serial("id").primaryKey(),
  credentialsId: integer("credentials_id").notNull().references(() => githubCredentials.id, { onDelete: 'cascade' }),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  defaultBranch: text("default_branch").default("main"),
  lastAnalyzed: timestamp("last_analyzed"),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertGithubRepositorySchema = createInsertSchema(githubRepositories).pick({
  credentialsId: true,
  owner: true,
  repo: true,
  defaultBranch: true
});

export type InsertGithubRepository = z.infer<typeof insertGithubRepositorySchema>;
export type GithubRepository = typeof githubRepositories.$inferSelect;

// GitHub file changes
export const githubFileChanges = pgTable("github_file_changes", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull().references(() => githubRepositories.id, { onDelete: 'cascade' }),
  path: text("path").notNull(),
  content: text("content").notNull(),
  commitMessage: text("commit_message").notNull(),
  status: text("status").notNull().default("pending"), // pending, committed, failed
  commitUrl: text("commit_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertGithubFileChangeSchema = createInsertSchema(githubFileChanges).pick({
  repositoryId: true,
  path: true,
  content: true,
  commitMessage: true
});

export type InsertGithubFileChange = z.infer<typeof insertGithubFileChangeSchema>;
export type GithubFileChange = typeof githubFileChanges.$inferSelect;
