import { Octokit } from '@octokit/rest';
import { storage } from './storage';

interface GithubCredentials {
  username: string;
  token: string;
}

interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

interface FileChange {
  path: string;
  content: string;
  message: string;
}

export class GithubService {
  private octokit: Octokit | null = null;
  private credentials: GithubCredentials | null = null;
  private currentRepo: RepoInfo | null = null;

  constructor() {}

  /**
   * Initialize GitHub client with user credentials
   */
  async initialize(credentials: GithubCredentials): Promise<boolean> {
    try {
      this.credentials = credentials;
      this.octokit = new Octokit({
        auth: credentials.token
      });
      
      // Verify token by getting authenticated user
      const { data } = await this.octokit.users.getAuthenticated();
      console.log(`GitHub authentication successful for user: ${data.login}`);
      
      return true;
    } catch (error) {
      console.error('GitHub authentication failed:', error);
      this.octokit = null;
      this.credentials = null;
      return false;
    }
  }

  /**
   * Set the current repository to work with
   */
  setRepository(repoInfo: RepoInfo): void {
    this.currentRepo = repoInfo;
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(): Promise<any> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      const { data: repo } = await this.octokit.repos.get({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo
      });

      return repo;
    } catch (error) {
      console.error('Failed to get repository info:', error);
      throw error;
    }
  }

  /**
   * Get repository contents (files and directories)
   */
  async getRepositoryContents(path = ''): Promise<any> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        path,
        ref: this.currentRepo.branch || 'main'
      });

      return data;
    } catch (error) {
      console.error(`Failed to get repository contents for path ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get content of a specific file
   */
  async getFileContent(path: string): Promise<string> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        path,
        ref: this.currentRepo.branch || 'main'
      });

      if (Array.isArray(data) || !('content' in data)) {
        throw new Error(`Path ${path} does not point to a file`);
      }

      // Decode base64 content
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      console.error(`Failed to get file content for ${path}:`, error);
      throw error;
    }
  }

  /**
   * Commit changes to a file in the repository
   */
  async commitFile(fileChange: FileChange): Promise<{ success: boolean; url?: string }> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      // First, get the current file (to get the SHA)
      let sha: string | undefined;
      
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.currentRepo.owner,
          repo: this.currentRepo.repo,
          path: fileChange.path,
          ref: this.currentRepo.branch || 'main'
        });
        
        if (!Array.isArray(data) && 'sha' in data) {
          sha = data.sha;
        }
      } catch (error) {
        // File doesn't exist yet, which is fine for new files
        console.log(`Creating new file: ${fileChange.path}`);
      }

      // Commit the file
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        path: fileChange.path,
        message: fileChange.message,
        content: Buffer.from(fileChange.content).toString('base64'),
        sha,
        branch: this.currentRepo.branch || 'main'
      });

      return { 
        success: true, 
        url: data.commit.html_url 
      };
    } catch (error) {
      console.error(`Failed to commit file ${fileChange.path}:`, error);
      return { success: false };
    }
  }

  /**
   * Get repository branches
   */
  async getBranches(): Promise<string[]> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      const { data } = await this.octokit.repos.listBranches({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo
      });

      return data.map(branch => branch.name);
    } catch (error) {
      console.error('Failed to list branches:', error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(title: string, body: string, head: string, base = 'main'): Promise<{ url: string }> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      const { data } = await this.octokit.pulls.create({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        title,
        body,
        head,
        base
      });

      return { url: data.html_url };
    } catch (error) {
      console.error('Failed to create pull request:', error);
      throw error;
    }
  }

  /**
   * Generate repository summary using AI analysis
   */
  async generateRepositorySummary(): Promise<string> {
    if (!this.octokit || !this.currentRepo) {
      throw new Error('GitHub client not initialized or repository not set');
    }

    try {
      // Get basic repo info
      const repoInfo = await this.getRepositoryInfo();
      
      // Get root directory structure
      const rootContents = await this.getRepositoryContents();
      
      // Extract directories to analyze
      const directories = Array.isArray(rootContents) 
        ? rootContents.filter(item => item.type === 'dir').map(dir => dir.path)
        : [];
      
      // For each major directory, get contents
      const structureMap: Record<string, any[]> = {};
      for (const dir of directories) {
        try {
          const contents = await this.getRepositoryContents(dir);
          if (Array.isArray(contents)) {
            structureMap[dir] = contents.map(item => ({
              name: item.name,
              type: item.type,
              path: item.path
            }));
          }
        } catch (error) {
          console.error(`Error analyzing directory ${dir}:`, error);
        }
      }
      
      // Get README content if available
      let readmeContent = '';
      try {
        readmeContent = await this.getFileContent('README.md');
      } catch (error) {
        try {
          readmeContent = await this.getFileContent('readme.md');
        } catch (innerError) {
          console.log('No README found');
        }
      }
      
      // Get package.json if available (for JS/TS projects)
      let packageJson = null;
      try {
        const packageJsonContent = await this.getFileContent('package.json');
        packageJson = JSON.parse(packageJsonContent);
      } catch (error) {
        console.log('No package.json found or invalid format');
      }

      // Build repository summary
      const summary = {
        name: repoInfo.name,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        issues: repoInfo.open_issues_count,
        created: repoInfo.created_at,
        updated: repoInfo.updated_at,
        structure: structureMap,
        readme: readmeContent,
        dependencies: packageJson?.dependencies || {},
        devDependencies: packageJson?.devDependencies || {}
      } as Record<string, any>;
      
      // TODO: In a real implementation, we would use OpenAI to analyze this data
      // and generate a comprehensive summary

      return JSON.stringify(summary, null, 2);
    } catch (error) {
      console.error('Failed to generate repository summary:', error);
      throw error;
    }
  }
}

export const githubService = new GithubService();