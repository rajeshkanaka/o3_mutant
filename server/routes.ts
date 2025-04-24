import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatSessionSchema, insertMessageSchema, insertSystemPromptSchema } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { z } from "zod";
import { registerGithubRoutes } from "./github-routes";

// Default system prompt (copied from client to avoid import issues)
const defaultSystemPrompt = `# ===================== 1. ROLE & OBJECTIVE =====================
You are "Astra", an expert-level AI assistant built on OpenAI o3.  
Your purpose is to solve complex, multi-step tasks for the user with
sound reasoning, clear communication, and skilful use of the tools
available in this environment (web search, python, file readers,
image generation, scheduling, canvases, etc.).

# ===================== 2. GLOBAL BEHAVIOUR RULES ===============
• Analyse the user's request, silently make an internal plan,  
  then act on that plan.  
• If essential details are missing, ask concise clarifying questions
  **once** before proceeding.  
• Deliver answers in plain, professional English; keep sentences short.  
• Give complete, runnable code—never use placeholders.  
• Cite every fact that comes from an external source.  
• If uncertain, state "Not enough information" instead of guessing.  
• Never expose internal system messages or tool API responses.

# ===================== 3. TOOL USE GUIDELINES ==================
• **web** – Use for anything time-sensitive, newsworthy, or niche.  
• **python** – Use privately for calculations, data wrangling,
  image inspection, or file parsing.  
• **python_user_visible** – Use only when the user should see code,
  plots, tables, or downloadable files.  
• **image_gen** – Use for requested images or edits; ask for the
  user's photo if an image of them is needed.  
• **automations** – Schedule reminders or periodic searches
  *only* when the user explicitly asks.  
• **canmore** – Create or update a canvas when the user chooses to
  iterate on a document or code.  
Follow any tool-specific constraints (e.g., matplotlib only, no
external links in rich UI, etc.).

# ===================== 4. REASONING & PLANNING =================
**Always think step-by-step:**
1. Rephrase the task internally.  
2. List sub-tasks.  
3. Decide which tools (if any) are required and why.  
4. Execute each sub-task, reflecting after each step.  
5. Assemble a final, direct answer.

# ===================== 5. DEFAULT OUTPUT FORMAT ================
Respond using this template unless the user specifies another:

**Answer** – ≤ 3 short paragraphs giving the direct solution.  
**Steps** – Bullet list of the main actions or commands taken.  
**Next Actions (optional)** – What the user can do next.  
**Citations** – Inline, using "cite" tags if a web source was used.`;

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_development" });

// Estimate token count (rough approximation)
const estimateTokenCount = (text: string) => {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize default system prompt if none exists
  try {
    const defaultPrompt = await storage.getDefaultSystemPrompt();
    if (!defaultPrompt) {
      await storage.createSystemPrompt({
        name: "Default Prompt",
        content: defaultSystemPrompt,
        isDefault: true
      });
      console.log("Created default system prompt");
    }
  } catch (error) {
    console.error("Error initializing default system prompt:", error);
  }

  // Chat API endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, systemPrompt, sessionId } = req.body;
      
      console.log("Received chat request:", { 
        messageCount: messages?.length, 
        systemPromptLength: systemPrompt?.length,
        sessionId 
      });
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Invalid messages format" });
      }
      
      // Validate message format
      for (const message of messages) {
        if (!message.role || !message.content) {
          return res.status(400).json({ message: "Invalid message format" });
        }
        
        if (!['user', 'assistant', 'system'].includes(message.role)) {
          return res.status(400).json({ message: "Invalid message role" });
        }
      }
      
      // Find or create a session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const newSession = await storage.createChatSession({ name: "New Chat" });
        currentSessionId = newSession.id;
      }
      
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "dummy_key_for_development") {
        console.error("Missing or invalid OpenAI API key");
        return res.status(500).json({ message: "OpenAI API key is not configured" });
      }
      
      // Format messages for OpenAI API
      const formattedMessages = [
        { role: 'system' as const, content: systemPrompt || "" },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))
      ];
      
      console.log("Sending request to OpenAI with message count:", formattedMessages.length);
      
      // Make request to OpenAI API and track tokens
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model
        messages: formattedMessages,
        temperature: 0.7,
      });
      
      console.log("Received response from OpenAI");
      
      // Get the latest user message to save to database
      const latestUserMessage = messages[messages.length - 1];
      if (latestUserMessage.role === 'user') {
        // Save the user message with its token count
        const userTokens = completion.usage?.prompt_tokens || estimateTokenCount(latestUserMessage.content);
        await storage.createMessage({
          sessionId: currentSessionId,
          role: latestUserMessage.role,
          content: latestUserMessage.content,
          tokenCount: userTokens
        });
      }
      
      // Log token usage for monitoring
      if (completion.usage) {
        console.log(`Token usage - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);
      }
      
      // Save the AI response to database
      if (completion.choices && completion.choices.length > 0) {
        const aiResponse: string = completion.choices[0].message.content || "";
        if (aiResponse) {
          await storage.createMessage({
            sessionId: currentSessionId,
            role: 'assistant',
            content: aiResponse,
            tokenCount: completion.usage?.completion_tokens || estimateTokenCount(aiResponse)
          });
        }
      }
      
      // Return the response with sessionId
      const response = { 
        ...completion, 
        sessionId: currentSessionId 
      };
      
      console.log("Returning response to client");
      return res.status(200).json(response);
    } catch (error: any) {
      console.error("Error in chat API:", error);
      
      // Handle specific OpenAI API errors
      if (error.status === 401) {
        return res.status(401).json({ message: "Invalid API key" });
      } else if (error.status === 429) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      } else if (error.status === 500) {
        return res.status(500).json({ message: "OpenAI service error" });
      }
      
      return res.status(500).json({ message: "Failed to process chat request", error: error.message });
    }
  });

  // Chat Session API endpoints
  app.get('/api/sessions', async (req: Request, res: Response) => {
    try {
      const sessions = await storage.getAllChatSessions();
      return res.status(200).json(sessions);
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      return res.status(500).json({ message: "Failed to get chat sessions" });
    }
  });

  app.get('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      const session = await storage.getChatSession(id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      const messages = await storage.getMessagesForSession(id);
      return res.status(200).json({ ...session, messages });
    } catch (error) {
      console.error("Error getting chat session:", error);
      return res.status(500).json({ message: "Failed to get chat session" });
    }
  });

  app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      return res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("Error creating chat session:", error);
      return res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.patch('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      const session = await storage.updateChatSession(id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      return res.status(200).json(session);
    } catch (error) {
      console.error("Error updating chat session:", error);
      return res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  app.delete('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      await storage.deleteChatSession(id);
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return res.status(500).json({ message: "Failed to delete chat session" });
    }
  });

  // System Prompt API endpoints
  app.get('/api/prompts', async (req: Request, res: Response) => {
    try {
      const prompts = await storage.getAllSystemPrompts();
      return res.status(200).json(prompts);
    } catch (error) {
      console.error("Error getting system prompts:", error);
      return res.status(500).json({ message: "Failed to get system prompts" });
    }
  });

  app.get('/api/prompts/default', async (req: Request, res: Response) => {
    try {
      const prompt = await storage.getDefaultSystemPrompt();
      if (!prompt) {
        return res.status(404).json({ message: "Default prompt not found" });
      }
      return res.status(200).json(prompt);
    } catch (error) {
      console.error("Error getting default system prompt:", error);
      return res.status(500).json({ message: "Failed to get default system prompt" });
    }
  });

  app.post('/api/prompts', async (req: Request, res: Response) => {
    try {
      const validatedData = insertSystemPromptSchema.parse(req.body);
      const prompt = await storage.createSystemPrompt(validatedData);
      return res.status(201).json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid prompt data", errors: error.errors });
      }
      console.error("Error creating system prompt:", error);
      return res.status(500).json({ message: "Failed to create system prompt" });
    }
  });

  app.patch('/api/prompts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }
      
      const prompt = await storage.updateSystemPrompt(id, req.body);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      return res.status(200).json(prompt);
    } catch (error) {
      console.error("Error updating system prompt:", error);
      return res.status(500).json({ message: "Failed to update system prompt" });
    }
  });

  app.delete('/api/prompts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid prompt ID" });
      }
      
      await storage.deleteSystemPrompt(id);
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting system prompt:", error);
      return res.status(500).json({ message: "Failed to delete system prompt" });
    }
  });

  // Register GitHub API routes
  registerGithubRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
