import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_development" });

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat API endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { messages, systemPrompt } = req.body;
      
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
      
      // Format messages for OpenAI API
      const formattedMessages = [
        { role: 'system', content: systemPrompt || "" },
        ...messages
      ];
      
      // Make request to OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model
        messages: formattedMessages,
        temperature: 0.7,
      });
      
      // Return the response
      return res.status(200).json(completion);
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
      
      return res.status(500).json({ message: "Failed to process chat request" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
