import { 
  users, chatSessions, messages, systemPrompts,
  githubCredentials, githubRepositories, githubFileChanges,
  type User, type InsertUser,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage,
  type SystemPrompt, type InsertSystemPrompt,
  type GithubCredentials, type InsertGithubCredentials,
  type GithubRepository, type InsertGithubRepository,
  type GithubFileChange, type InsertGithubFileChange
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat session operations
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getAllChatSessions(): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | undefined>;
  deleteChatSession(id: number): Promise<boolean>;
  
  // Message operations
  getMessagesForSession(sessionId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // System prompt operations
  getSystemPrompt(id: number): Promise<SystemPrompt | undefined>;
  getDefaultSystemPrompt(): Promise<SystemPrompt | undefined>;
  getAllSystemPrompts(): Promise<SystemPrompt[]>;
  createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt>;
  updateSystemPrompt(id: number, prompt: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined>;
  deleteSystemPrompt(id: number): Promise<boolean>;
  
  // GitHub credentials operations
  getGithubCredentials(id: number): Promise<GithubCredentials | undefined>;
  getAllGithubCredentials(): Promise<GithubCredentials[]>;
  createGithubCredentials(credentials: InsertGithubCredentials): Promise<GithubCredentials>;
  updateGithubCredentials(id: number, credentials: Partial<InsertGithubCredentials>): Promise<GithubCredentials | undefined>;
  deleteGithubCredentials(id: number): Promise<boolean>;
  
  // GitHub repository operations
  getGithubRepository(id: number): Promise<GithubRepository | undefined>;
  getGithubRepositoriesByCredentials(credentialsId: number): Promise<GithubRepository[]>;
  createGithubRepository(repository: InsertGithubRepository): Promise<GithubRepository>;
  updateGithubRepository(id: number, repository: Partial<InsertGithubRepository>): Promise<GithubRepository | undefined>;
  updateGithubRepositorySummary(id: number, summary: string): Promise<GithubRepository | undefined>;
  deleteGithubRepository(id: number): Promise<boolean>;
  
  // GitHub file change operations
  getGithubFileChange(id: number): Promise<GithubFileChange | undefined>;
  getGithubFileChangesByRepository(repositoryId: number): Promise<GithubFileChange[]>;
  createGithubFileChange(fileChange: InsertGithubFileChange): Promise<GithubFileChange>;
  updateGithubFileChangeStatus(id: number, status: string, commitUrl?: string): Promise<GithubFileChange | undefined>;
  deleteGithubFileChange(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Chat session operations
  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }
  
  async getAllChatSessions(): Promise<ChatSession[]> {
    return await db.select().from(chatSessions).orderBy(desc(chatSessions.updatedAt));
  }
  
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession;
  }
  
  async updateChatSession(id: number, sessionData: Partial<InsertChatSession>): Promise<ChatSession | undefined> {
    const [updatedSession] = await db
      .update(chatSessions)
      .set({ ...sessionData, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return updatedSession;
  }
  
  async deleteChatSession(id: number): Promise<boolean> {
    const result = await db.delete(chatSessions).where(eq(chatSessions.id, id));
    return true; // If no error was thrown, we assume success
  }
  
  // Message operations
  async getMessagesForSession(sessionId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.timestamp);
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Also update the session's updatedAt timestamp
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, message.sessionId));
      
    return newMessage;
  }
  
  // System prompt operations
  async getSystemPrompt(id: number): Promise<SystemPrompt | undefined> {
    const [prompt] = await db.select().from(systemPrompts).where(eq(systemPrompts.id, id));
    return prompt;
  }
  
  async getDefaultSystemPrompt(): Promise<SystemPrompt | undefined> {
    const [prompt] = await db.select().from(systemPrompts).where(eq(systemPrompts.isDefault, true));
    return prompt;
  }
  
  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    return await db.select().from(systemPrompts);
  }
  
  async createSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    // If this is set as default, unset any existing defaults
    if (prompt.isDefault) {
      await db
        .update(systemPrompts)
        .set({ isDefault: false })
        .where(eq(systemPrompts.isDefault, true));
    }
    
    const [newPrompt] = await db.insert(systemPrompts).values(prompt).returning();
    return newPrompt;
  }
  
  async updateSystemPrompt(id: number, promptData: Partial<InsertSystemPrompt>): Promise<SystemPrompt | undefined> {
    // If this is set as default, unset any existing defaults
    if (promptData.isDefault) {
      // First, unset all defaults
      await db
        .update(systemPrompts)
        .set({ isDefault: false })
        .where(eq(systemPrompts.isDefault, true));
    }
    
    const [updatedPrompt] = await db
      .update(systemPrompts)
      .set(promptData)
      .where(eq(systemPrompts.id, id))
      .returning();
    return updatedPrompt;
  }
  
  async deleteSystemPrompt(id: number): Promise<boolean> {
    // Don't allow deleting the default prompt
    const [prompt] = await db.select().from(systemPrompts).where(eq(systemPrompts.id, id));
    if (prompt?.isDefault) {
      throw new Error("Cannot delete the default system prompt");
    }
    
    const result = await db.delete(systemPrompts).where(eq(systemPrompts.id, id));
    return true; // If no error was thrown, we assume success
  }
  
  // GitHub credentials operations
  async getGithubCredentials(id: number): Promise<GithubCredentials | undefined> {
    const [credentials] = await db.select().from(githubCredentials).where(eq(githubCredentials.id, id));
    return credentials;
  }
  
  async getAllGithubCredentials(): Promise<GithubCredentials[]> {
    return await db.select().from(githubCredentials);
  }
  
  async createGithubCredentials(credentials: InsertGithubCredentials): Promise<GithubCredentials> {
    const [newCredentials] = await db.insert(githubCredentials).values({
      ...credentials,
      updatedAt: new Date()
    }).returning();
    return newCredentials;
  }
  
  async updateGithubCredentials(id: number, credentialsData: Partial<InsertGithubCredentials>): Promise<GithubCredentials | undefined> {
    const [updatedCredentials] = await db
      .update(githubCredentials)
      .set({ 
        ...credentialsData,
        updatedAt: new Date()
      })
      .where(eq(githubCredentials.id, id))
      .returning();
    return updatedCredentials;
  }
  
  async deleteGithubCredentials(id: number): Promise<boolean> {
    // This will automatically delete related repositories and file changes due to cascading
    await db.delete(githubCredentials).where(eq(githubCredentials.id, id));
    return true;
  }
  
  // GitHub repository operations
  async getGithubRepository(id: number): Promise<GithubRepository | undefined> {
    const [repository] = await db.select().from(githubRepositories).where(eq(githubRepositories.id, id));
    return repository;
  }
  
  async getGithubRepositoriesByCredentials(credentialsId: number): Promise<GithubRepository[]> {
    return await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.credentialsId, credentialsId))
      .orderBy(desc(githubRepositories.updatedAt));
  }
  
  async createGithubRepository(repository: InsertGithubRepository): Promise<GithubRepository> {
    const [newRepository] = await db.insert(githubRepositories).values({
      ...repository,
      updatedAt: new Date()
    }).returning();
    return newRepository;
  }
  
  async updateGithubRepository(id: number, repositoryData: Partial<InsertGithubRepository>): Promise<GithubRepository | undefined> {
    const [updatedRepository] = await db
      .update(githubRepositories)
      .set({ 
        ...repositoryData,
        updatedAt: new Date()
      })
      .where(eq(githubRepositories.id, id))
      .returning();
    return updatedRepository;
  }
  
  async updateGithubRepositorySummary(id: number, summary: string): Promise<GithubRepository | undefined> {
    const [updatedRepository] = await db
      .update(githubRepositories)
      .set({ 
        summary,
        lastAnalyzed: new Date(),
        updatedAt: new Date()
      })
      .where(eq(githubRepositories.id, id))
      .returning();
    return updatedRepository;
  }
  
  async deleteGithubRepository(id: number): Promise<boolean> {
    // This will automatically delete related file changes due to cascading
    await db.delete(githubRepositories).where(eq(githubRepositories.id, id));
    return true;
  }
  
  // GitHub file change operations
  async getGithubFileChange(id: number): Promise<GithubFileChange | undefined> {
    const [fileChange] = await db.select().from(githubFileChanges).where(eq(githubFileChanges.id, id));
    return fileChange;
  }
  
  async getGithubFileChangesByRepository(repositoryId: number): Promise<GithubFileChange[]> {
    return await db
      .select()
      .from(githubFileChanges)
      .where(eq(githubFileChanges.repositoryId, repositoryId))
      .orderBy(desc(githubFileChanges.updatedAt));
  }
  
  async createGithubFileChange(fileChange: InsertGithubFileChange): Promise<GithubFileChange> {
    const [newFileChange] = await db.insert(githubFileChanges).values({
      ...fileChange,
      updatedAt: new Date()
    }).returning();
    return newFileChange;
  }
  
  async updateGithubFileChangeStatus(id: number, status: string, commitUrl?: string): Promise<GithubFileChange | undefined> {
    const [updatedFileChange] = await db
      .update(githubFileChanges)
      .set({ 
        status,
        commitUrl,
        updatedAt: new Date()
      })
      .where(eq(githubFileChanges.id, id))
      .returning();
    return updatedFileChange;
  }
  
  async deleteGithubFileChange(id: number): Promise<boolean> {
    await db.delete(githubFileChanges).where(eq(githubFileChanges.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
