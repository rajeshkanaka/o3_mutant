import { 
  users, chatSessions, messages, systemPrompts,
  type User, type InsertUser,
  type ChatSession, type InsertChatSession,
  type Message, type InsertMessage,
  type SystemPrompt, type InsertSystemPrompt
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
}

export const storage = new DatabaseStorage();
