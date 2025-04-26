import { Express, Request, Response } from 'express';
import { githubService } from './github';
import { storage } from './storage';
import { insertGithubCredentialsSchema, insertGithubRepositorySchema, insertGithubFileChangeSchema } from '@shared/schema';
import { z } from 'zod';
import OpenAI from 'openai';

// Initialize OpenAI client for code analysis
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_development" });

export function registerGithubRoutes(app: Express) {
  // GitHub credentials
  app.post('/api/github/credentials', async (req: Request, res: Response) => {
    try {
      const validatedData = insertGithubCredentialsSchema.parse(req.body);
      
      // Test the credentials with the GitHub API
      const initialized = await githubService.initialize({
        username: validatedData.username,
        token: validatedData.token
      });
      
      if (!initialized) {
        return res.status(401).json({ message: "Invalid GitHub credentials" });
      }
      
      // Save to database
      const credentials = await storage.createGithubCredentials(validatedData);
      
      return res.status(201).json({ 
        id: credentials.id,
        username: credentials.username,
        createdAt: credentials.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid credentials data", errors: error.errors });
      }
      console.error("Error saving GitHub credentials:", error);
      return res.status(500).json({ message: "Failed to save GitHub credentials" });
    }
  });
  
  app.get('/api/github/credentials', async (req: Request, res: Response) => {
    try {
      const credentials = await storage.getAllGithubCredentials();
      
      // Don't expose tokens in the response
      const safeCredentials = credentials.map(cred => ({
        id: cred.id,
        username: cred.username,
        createdAt: cred.createdAt,
        updatedAt: cred.updatedAt
      }));
      
      return res.status(200).json(safeCredentials);
    } catch (error) {
      console.error("Error getting GitHub credentials:", error);
      return res.status(500).json({ message: "Failed to get GitHub credentials" });
    }
  });
  
  app.delete('/api/github/credentials/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid credential ID" });
      }
      
      await storage.deleteGithubCredentials(id);
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting GitHub credentials:", error);
      return res.status(500).json({ message: "Failed to delete GitHub credentials" });
    }
  });
  
  // GitHub repositories
  app.post('/api/github/repositories', async (req: Request, res: Response) => {
    try {
      const validatedData = insertGithubRepositorySchema.parse(req.body);
      
      // Get the credentials
      const credentials = await storage.getGithubCredentials(validatedData.credentialsId);
      if (!credentials) {
        return res.status(404).json({ message: "GitHub credentials not found" });
      }
      
      // Initialize GitHub service with credentials
      const initialized = await githubService.initialize({
        username: credentials.username,
        token: credentials.token
      });
      
      if (!initialized) {
        return res.status(401).json({ message: "Invalid GitHub credentials" });
      }
      
      // Set repository info
      githubService.setRepository({
        owner: validatedData.owner,
        repo: validatedData.repo,
        branch: validatedData.defaultBranch
      });
      
      try {
        // Verify repository exists
        await githubService.getRepositoryInfo();
      } catch (error) {
        return res.status(404).json({ message: "Repository not found or access denied" });
      }
      
      // Save to database
      const repository = await storage.createGithubRepository(validatedData);
      
      return res.status(201).json(repository);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid repository data", errors: error.errors });
      }
      console.error("Error adding GitHub repository:", error);
      return res.status(500).json({ message: "Failed to add GitHub repository" });
    }
  });
  
  app.get('/api/github/repositories', async (req: Request, res: Response) => {
    try {
      const credentialsId = req.query.credentialsId ? parseInt(req.query.credentialsId as string) : undefined;
      
      let repositories;
      if (credentialsId) {
        repositories = await storage.getGithubRepositoriesByCredentials(credentialsId);
      } else {
        // Get all repositories
        const allCredentials = await storage.getAllGithubCredentials();
        repositories = [];
        
        for (const cred of allCredentials) {
          const repos = await storage.getGithubRepositoriesByCredentials(cred.id);
          repositories.push(...repos);
        }
      }
      
      return res.status(200).json(repositories);
    } catch (error) {
      console.error("Error getting GitHub repositories:", error);
      return res.status(500).json({ message: "Failed to get GitHub repositories" });
    }
  });
  
  app.get('/api/github/repositories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid repository ID" });
      }
      
      const repository = await storage.getGithubRepository(id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      return res.status(200).json(repository);
    } catch (error) {
      console.error("Error getting GitHub repository:", error);
      return res.status(500).json({ message: "Failed to get GitHub repository" });
    }
  });
  
  app.delete('/api/github/repositories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid repository ID" });
      }
      
      await storage.deleteGithubRepository(id);
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting GitHub repository:", error);
      return res.status(500).json({ message: "Failed to delete GitHub repository" });
    }
  });
  
  // Repository analysis
  app.post('/api/github/repositories/:id/analyze', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid repository ID" });
      }
      
      const repository = await storage.getGithubRepository(id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Get credentials
      const credentials = await storage.getGithubCredentials(repository.credentialsId);
      if (!credentials) {
        return res.status(404).json({ message: "GitHub credentials not found" });
      }
      
      // Initialize GitHub service
      const initialized = await githubService.initialize({
        username: credentials.username,
        token: credentials.token
      });
      
      if (!initialized) {
        return res.status(401).json({ message: "Invalid GitHub credentials" });
      }
      
      // Set repository
      githubService.setRepository({
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.defaultBranch
      });
      
      // Generate summary
      const repoData = await githubService.generateRepositorySummary();
      
      // Process with OpenAI for a comprehensive summary
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model
        messages: [
          { 
            role: 'system', 
            content: `You are a code analysis expert. Analyze the following GitHub repository data and provide a comprehensive summary of the project structure, purpose, main features, and technologies used. Format your response as JSON with the following fields:
            {
              "projectName": "Name of the project",
              "purpose": "A brief description of what the project does",
              "technologies": ["List", "of", "technologies", "used"],
              "mainFeatures": ["List", "of", "main", "features"],
              "fileStructure": "A brief description of how the project is organized",
              "developmentStatus": "Active/Inactive/Archived/etc.",
              "suggestedImprovements": ["List", "of", "potential", "improvements"]
            }`
          },
          { role: 'user', content: repoData }
        ],
        response_format: { type: "json_object" }
      });
      
      let aiSummary = repoData;
      if (completion.choices && completion.choices.length > 0 && completion.choices[0].message.content) {
        aiSummary = completion.choices[0].message.content;
      }
      
      // Update repository with summary
      const updatedRepository = await storage.updateGithubRepositorySummary(id, aiSummary);
      
      return res.status(200).json(updatedRepository);
    } catch (error) {
      console.error("Error analyzing GitHub repository:", error);
      return res.status(500).json({ message: "Failed to analyze GitHub repository" });
    }
  });
  
  // File changes
  app.post('/api/github/repositories/:id/files', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid repository ID" });
      }
      
      const repository = await storage.getGithubRepository(id);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const validatedData = insertGithubFileChangeSchema.parse({
        ...req.body,
        repositoryId: id
      });
      
      // Save to database
      const fileChange = await storage.createGithubFileChange(validatedData);
      
      return res.status(201).json(fileChange);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid file change data", errors: error.errors });
      }
      console.error("Error creating file change:", error);
      return res.status(500).json({ message: "Failed to create file change" });
    }
  });
  
  app.get('/api/github/repositories/:id/files', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid repository ID" });
      }
      
      const fileChanges = await storage.getGithubFileChangesByRepository(id);
      return res.status(200).json(fileChanges);
    } catch (error) {
      console.error("Error getting file changes:", error);
      return res.status(500).json({ message: "Failed to get file changes" });
    }
  });
  
  app.post('/api/github/files/:id/commit', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file change ID" });
      }
      
      const fileChange = await storage.getGithubFileChange(id);
      if (!fileChange) {
        return res.status(404).json({ message: "File change not found" });
      }
      
      const repository = await storage.getGithubRepository(fileChange.repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const credentials = await storage.getGithubCredentials(repository.credentialsId);
      if (!credentials) {
        return res.status(404).json({ message: "GitHub credentials not found" });
      }
      
      // Initialize GitHub service
      const initialized = await githubService.initialize({
        username: credentials.username,
        token: credentials.token
      });
      
      if (!initialized) {
        return res.status(401).json({ message: "Invalid GitHub credentials" });
      }
      
      // Set repository
      githubService.setRepository({
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.defaultBranch
      });
      
      // Commit the file
      const result = await githubService.commitFile({
        path: fileChange.path,
        content: fileChange.content,
        message: fileChange.commitMessage
      });
      
      if (!result.success) {
        await storage.updateGithubFileChangeStatus(id, 'failed');
        return res.status(500).json({ message: "Failed to commit file change" });
      }
      
      // Update file change status
      const updatedFileChange = await storage.updateGithubFileChangeStatus(
        id, 
        'committed', 
        result.url
      );
      
      return res.status(200).json(updatedFileChange);
    } catch (error) {
      console.error("Error committing file change:", error);
      return res.status(500).json({ message: "Failed to commit file change" });
    }
  });
  
  app.delete('/api/github/files/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file change ID" });
      }
      
      await storage.deleteGithubFileChange(id);
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting file change:", error);
      return res.status(500).json({ message: "Failed to delete file change" });
    }
  });
  
  // Code assistance with OpenAI
  app.post('/api/github/assist', async (req: Request, res: Response) => {
    try {
      const { repositoryId, prompt, fileContext, targetPath } = req.body;
      
      if (!repositoryId || !prompt) {
        return res.status(400).json({ message: "Repository ID and prompt are required" });
      }
      
      const repository = await storage.getGithubRepository(parseInt(repositoryId));
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Initialize GitHub service to get repository context
      const credentials = await storage.getGithubCredentials(repository.credentialsId);
      if (!credentials) {
        return res.status(404).json({ message: "GitHub credentials not found" });
      }
      
      const initialized = await githubService.initialize({
        username: credentials.username,
        token: credentials.token
      });
      
      if (!initialized) {
        return res.status(401).json({ message: "Invalid GitHub credentials" });
      }
      
      // Set repository
      githubService.setRepository({
        owner: repository.owner,
        repo: repository.repo,
        branch: repository.defaultBranch
      });
      
      // Get file content if fileContext is provided
      let fileContents: Record<string, string | undefined> = {};
      if (fileContext && Array.isArray(fileContext)) {
        for (const file of fileContext) {
          try {
            const content = await githubService.getFileContent(file);
            fileContents[file] = content;
          } catch (error) {
            console.warn(`Could not get content for file ${file}:`, error);
            fileContents[file] = undefined;
          }
        }
      }
      
      // Generate code assistance with OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using the latest model
        messages: [
          { 
            role: 'system', 
            content: `You are an expert software developer helping to improve code in a GitHub repository. 
            The repository is ${repository.owner}/${repository.repo} and you are looking at branch ${repository.defaultBranch || 'main'}.
            
            You have been asked to help with the following request: "${prompt}".
            
            ${targetPath ? `You should focus on the file at path: ${targetPath}` : ''}
            
            Analyze the repository structure and provided file context, then generate the appropriate code solution.
            If you're suggesting changes to existing files, clearly indicate which parts should be changed.
            If you're creating new files, provide the full content for each file.
            
            Format your response as JSON with the following structure:
            {
              "analysis": "Your analysis of the repository and the task",
              "changes": [
                {
                  "path": "path/to/file",
                  "content": "Full content of the file or the changes to be made",
                  "changeType": "create|modify",
                  "commitMessage": "Brief description of what this change does"
                }
              ],
              "explanation": "Explanation of your solution and how it addresses the request"
            }`
          },
          { 
            role: 'user', 
            content: JSON.stringify({
              repository: {
                owner: repository.owner,
                repo: repository.repo,
                branch: repository.defaultBranch,
                summary: repository.summary
              },
              fileContext: fileContents,
              prompt: prompt,
              targetPath: targetPath
            })
          }
        ],
        response_format: { type: "json_object" }
      });
      
      if (completion.choices && completion.choices.length > 0 && completion.choices[0].message.content) {
        try {
          const response = JSON.parse(completion.choices[0].message.content);
          return res.status(200).json(response);
        } catch (error) {
          console.error("Error parsing OpenAI response:", error);
          return res.status(500).json({ 
            message: "Failed to parse code assistance response",
            rawResponse: completion.choices[0].message.content
          });
        }
      } else {
        return res.status(500).json({ message: "No response from AI assistant" });
      }
    } catch (error) {
      console.error("Error getting code assistance:", error);
      return res.status(500).json({ message: "Failed to get code assistance" });
    }
  });
}