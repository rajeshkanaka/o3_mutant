import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GithubCodeAssistant from '@/components/GithubCodeAssistant';
import FileChangesManager from '@/components/FileChangesManager';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Check, GitBranch, Github as GithubIcon, Code, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type GithubCredentials = {
  id: number;
  username: string;
  createdAt: string;
  updatedAt: string;
};

type GithubRepository = {
  id: number;
  credentialsId: number;
  owner: string;
  repo: string;
  defaultBranch: string;
  lastAnalyzed: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

type GithubFileChange = {
  id: number;
  repositoryId: number;
  path: string;
  content: string;
  commitMessage: string;
  status: 'pending' | 'committed' | 'failed';
  commitUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// Component to manage GitHub credentials
const GithubCredentialsManager = () => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const queryClient = useQueryClient();

  const { data: credentials, isLoading, error } = useQuery({
    queryKey: ['/api/github/credentials'],
    queryFn: () => apiRequest<GithubCredentials[]>('/api/github/credentials')
  });

  const createCredentialsMutation = useMutation({
    mutationFn: (data: { username: string; token: string }) => 
      apiRequest('/api/github/credentials', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/credentials'] });
      toast({
        title: 'Credentials added',
        description: 'GitHub credentials have been successfully added.',
      });
      setUsername('');
      setToken('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding credentials',
        description: error.message || 'Failed to add GitHub credentials.',
        variant: 'destructive',
      });
    }
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/github/credentials/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/credentials'] });
      toast({
        title: 'Credentials removed',
        description: 'GitHub credentials have been successfully removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing credentials',
        description: error.message || 'Failed to remove GitHub credentials.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !token) {
      toast({
        title: 'Missing information',
        description: 'Please provide both a username and token.',
        variant: 'destructive',
      });
      return;
    }

    createCredentialsMutation.mutate({ username, token });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>GitHub Credentials</CardTitle>
          <CardDescription>
            Connect to GitHub using your username and personal access token.
            <br />
            <a 
              href="https://github.com/settings/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Create a personal access token
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">GitHub Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your GitHub username"
              />
            </div>
            <div>
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your GitHub personal access token"
              />
            </div>
            <Button 
              type="submit" 
              disabled={createCredentialsMutation.isPending}
              className="w-full"
            >
              {createCredentialsMutation.isPending ? 'Adding...' : 'Add GitHub Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected GitHub Accounts</CardTitle>
          <CardDescription>
            Manage your connected GitHub accounts and repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load GitHub credentials
              </AlertDescription>
            </Alert>
          ) : credentials && credentials.length > 0 ? (
            <div className="space-y-4">
              {credentials.map((cred) => (
                <div 
                  key={cred.id} 
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="flex items-center space-x-2">
                    <GithubIcon className="h-5 w-5" />
                    <span className="font-medium">{cred.username}</span>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={deleteCredentialsMutation.isPending}
                    onClick={() => deleteCredentialsMutation.mutate(cred.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No GitHub accounts connected
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component to manage GitHub repositories
const GithubRepositoriesManager = () => {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [selectedCredential, setSelectedCredential] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: credentials, isLoading: isLoadingCredentials } = useQuery({
    queryKey: ['/api/github/credentials'],
    queryFn: () => apiRequest<GithubCredentials[]>('/api/github/credentials')
  });

  const { data: repositories, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['/api/github/repositories'],
    queryFn: () => apiRequest<GithubRepository[]>('/api/github/repositories')
  });

  const addRepositoryMutation = useMutation({
    mutationFn: (data: { owner: string; repo: string; defaultBranch: string; credentialsId: number }) => 
      apiRequest('/api/github/repositories', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/repositories'] });
      toast({
        title: 'Repository added',
        description: 'GitHub repository has been successfully added.',
      });
      setOwner('');
      setRepo('');
      setBranch('main');
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding repository',
        description: error.message || 'Failed to add GitHub repository.',
        variant: 'destructive',
      });
    }
  });

  const deleteRepositoryMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/github/repositories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/repositories'] });
      toast({
        title: 'Repository removed',
        description: 'GitHub repository has been successfully removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing repository',
        description: error.message || 'Failed to remove GitHub repository.',
        variant: 'destructive',
      });
    }
  });

  const analyzeRepositoryMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/github/repositories/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/repositories'] });
      toast({
        title: 'Repository analyzed',
        description: 'GitHub repository has been successfully analyzed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error analyzing repository',
        description: error.message || 'Failed to analyze GitHub repository.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner || !repo || !selectedCredential) {
      toast({
        title: 'Missing information',
        description: 'Please provide repository owner, name, and select credentials.',
        variant: 'destructive',
      });
      return;
    }

    addRepositoryMutation.mutate({ 
      owner, 
      repo, 
      defaultBranch: branch,
      credentialsId: selectedCredential
    });
  };

  // Format the repository summary for display
  const formatSummary = (summary: string | null) => {
    if (!summary) return null;
    
    try {
      const parsed = JSON.parse(summary);
      return parsed;
    } catch (e) {
      return summary;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add GitHub Repository</CardTitle>
          <CardDescription>
            Add a GitHub repository to analyze and make code improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="github-account">GitHub Account</Label>
              <select 
                id="github-account"
                className="w-full px-3 py-2 border rounded-md"
                value={selectedCredential || ''}
                onChange={(e) => setSelectedCredential(parseInt(e.target.value) || null)}
                disabled={isLoadingCredentials || !credentials || credentials.length === 0}
              >
                <option value="">Select GitHub Account</option>
                {credentials && credentials.map(cred => (
                  <option key={cred.id} value={cred.id}>
                    {cred.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="owner">Repository Owner</Label>
              <Input
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g., facebook"
              />
            </div>
            <div>
              <Label htmlFor="repo">Repository Name</Label>
              <Input
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="e.g., react"
              />
            </div>
            <div>
              <Label htmlFor="branch">Default Branch</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g., main"
              />
            </div>
            <Button 
              type="submit" 
              disabled={addRepositoryMutation.isPending || !selectedCredential}
              className="w-full"
            >
              {addRepositoryMutation.isPending ? 'Adding...' : 'Add Repository'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Repositories</CardTitle>
          <CardDescription>
            Manage your connected GitHub repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRepos ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : reposError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load GitHub repositories
              </AlertDescription>
            </Alert>
          ) : repositories && repositories.length > 0 ? (
            <div className="space-y-4">
              {repositories.map((repo) => {
                const summary = formatSummary(repo.summary);
                
                return (
                  <div 
                    key={repo.id} 
                    className="p-4 border rounded-md space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <GithubIcon className="h-5 w-5" />
                        <span className="font-medium">
                          {repo.owner}/{repo.repo}
                        </span>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded flex items-center">
                          <GitBranch className="h-3 w-3 mr-1" />
                          {repo.defaultBranch}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={analyzeRepositoryMutation.isPending}
                          onClick={() => analyzeRepositoryMutation.mutate(repo.id)}
                        >
                          {analyzeRepositoryMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Code className="h-4 w-4 mr-1" />
                          )}
                          Analyze
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={deleteRepositoryMutation.isPending}
                          onClick={() => deleteRepositoryMutation.mutate(repo.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    {repo.lastAnalyzed && (
                      <div className="text-xs text-muted-foreground">
                        Last analyzed: {new Date(repo.lastAnalyzed).toLocaleString()}
                      </div>
                    )}
                    
                    {summary && typeof summary === 'object' && (
                      <div className="bg-secondary/50 p-3 rounded-md text-sm mt-2">
                        <h4 className="font-medium mb-1">Project Summary</h4>
                        {summary.projectName && (
                          <p><strong>Name:</strong> {summary.projectName}</p>
                        )}
                        {summary.purpose && (
                          <p><strong>Purpose:</strong> {summary.purpose}</p>
                        )}
                        {summary.technologies && Array.isArray(summary.technologies) && (
                          <p>
                            <strong>Technologies:</strong>{' '}
                            {summary.technologies.join(', ')}
                          </p>
                        )}
                        {summary.developmentStatus && (
                          <p>
                            <strong>Status:</strong>{' '}
                            <span className={
                              summary.developmentStatus.toLowerCase() === 'active' 
                                ? 'text-green-500' 
                                : 'text-yellow-500'
                            }>
                              {summary.developmentStatus}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No GitHub repositories connected
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main GitHub page component
export default function Github() {
  return (
    <div className="container py-6 space-y-8">
      <div className="flex items-center space-x-2">
        <GithubIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">GitHub Integration</h1>
      </div>
      
      <p className="text-muted-foreground">
        Connect Astra o3 to your GitHub repositories to analyze code and make improvements.
      </p>
      
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials">GitHub Accounts</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="assistant">Code Assistant</TabsTrigger>
          <TabsTrigger value="changes">Pending Changes</TabsTrigger>
        </TabsList>
        <TabsContent value="credentials" className="mt-6">
          <GithubCredentialsManager />
        </TabsContent>
        <TabsContent value="repositories" className="mt-6">
          <GithubRepositoriesManager />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6">
          <GithubCodeAssistant />
        </TabsContent>
        <TabsContent value="changes" className="mt-6">
          <FileChangesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}