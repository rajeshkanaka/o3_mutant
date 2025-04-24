import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Code, GitBranch, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';

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

type CodeAssistanceResponse = {
  analysis: string;
  changes: {
    path: string;
    content: string;
    changeType: 'create' | 'modify';
    commitMessage: string;
  }[];
  explanation: string;
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

export default function GithubCodeAssistant() {
  const [selectedRepository, setSelectedRepository] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<CodeAssistanceResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: repositories, isLoading: isLoadingRepos } = useQuery({
    queryKey: ['/api/github/repositories'],
    queryFn: () => apiRequest<GithubRepository[]>('/api/github/repositories')
  });

  // Function to generate AI assistance
  const generateAssistanceMutation = useMutation({
    mutationFn: (data: { repositoryId: number; prompt: string }) => 
      apiRequest<CodeAssistanceResponse>('/api/github/assist', {
        method: 'POST',
        body: data
      }),
    onMutate: () => {
      setIsGenerating(true);
      setAiResponse(null);
    },
    onSuccess: (data) => {
      setAiResponse(data);
      
      toast({
        title: 'Analysis complete',
        description: 'AI has generated code suggestions for your repository.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating suggestions',
        description: error.message || 'Failed to analyze repository and generate suggestions.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  // Function to save file changes to database
  const saveFileChangesMutation = useMutation({
    mutationFn: (data: { repositoryId: number; changes: { path: string; content: string; commitMessage: string }[] }) => 
      apiRequest<GithubFileChange[]>(`/api/github/repositories/${data.repositoryId}/files`, {
        method: 'POST',
        body: { changes: data.changes }
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/github/repositories', selectedRepository, 'files'] 
      });
      
      toast({
        title: 'Changes saved',
        description: 'Code changes have been saved. You can review and commit them in the Pending Changes tab.',
      });
      
      // If the first file change exists and has a commit URL, open it
      if (data && data.length > 0 && typeof data[0] === 'object' && 'commitUrl' in data[0] && typeof data[0].commitUrl === 'string') {
        window.open(data[0].commitUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving changes',
        description: error.message || 'Failed to save code changes.',
        variant: 'destructive',
      });
    }
  });

  // Handle form submission for AI assistance
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRepository) {
      toast({
        title: 'Repository required',
        description: 'Please select a repository to analyze.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Please provide a description of what you want to improve or fix.',
        variant: 'destructive',
      });
      return;
    }
    
    generateAssistanceMutation.mutate({
      repositoryId: selectedRepository,
      prompt: prompt.trim()
    });
  };

  // Handle saving suggested changes
  const handleSaveChanges = () => {
    if (!selectedRepository || !aiResponse || !aiResponse.changes || aiResponse.changes.length === 0) {
      return;
    }
    
    const formattedChanges = aiResponse.changes.map(change => ({
      path: change.path,
      content: change.content,
      commitMessage: change.commitMessage
    }));
    
    saveFileChangesMutation.mutate({
      repositoryId: selectedRepository,
      changes: formattedChanges
    });
  };

  const getSelectedRepo = () => {
    if (!selectedRepository || !repositories) return null;
    return repositories.find(repo => repo.id === selectedRepository);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Code Assistant</CardTitle>
          <CardDescription>
            Let Astra o3 analyze your code and suggest improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium mb-1">
                Select Repository
              </label>
              <select 
                id="repository"
                className="w-full px-3 py-2 border rounded-md"
                value={selectedRepository || ''}
                onChange={(e) => setSelectedRepository(parseInt(e.target.value) || null)}
                disabled={isLoadingRepos || !repositories || repositories.length === 0}
              >
                <option value="">Select Repository</option>
                {repositories && repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.owner}/{repo.repo} ({repo.defaultBranch})
                  </option>
                ))}
              </select>
              {isLoadingRepos && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center">
                  <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  Loading repositories...
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-1">
                What would you like to improve or fix?
              </label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Refactor the login component to use React hooks, Optimize database queries in user service, Add pagination to product list, Fix memory leak in audio player..."
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                type="submit"
                disabled={isGenerating || !selectedRepository || !prompt.trim()}
                className="flex items-center"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {aiResponse && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Code Analysis</CardTitle>
              <CardDescription>
                AI analysis of repository {getSelectedRepo()?.owner}/{getSelectedRepo()?.repo}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {aiResponse.analysis}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Suggested Changes</CardTitle>
                  <CardDescription>
                    Review the suggested code changes
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveChanges}
                  disabled={saveFileChangesMutation.isPending || !aiResponse.changes || aiResponse.changes.length === 0}
                >
                  {saveFileChangesMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4 mr-2" />
                      Save All Changes
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiResponse.changes && aiResponse.changes.length > 0 ? (
                <div className="space-y-6">
                  {aiResponse.changes.map((change, index) => (
                    <div key={index} className="border rounded-md overflow-hidden">
                      <div className="bg-secondary p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{change.path}</h4>
                            <p className="text-xs text-muted-foreground">{change.commitMessage}</p>
                          </div>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {change.changeType === 'create' ? 'New File' : 'Modify'}
                          </span>
                        </div>
                      </div>
                      <ScrollArea className="h-60">
                        <pre className="p-3 text-xs bg-black text-white overflow-auto">
                          <code>{change.content}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No changes suggested</AlertTitle>
                  <AlertDescription>
                    The AI did not suggest any specific code changes for this request.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mt-6 prose dark:prose-invert max-w-none">
                <h3>Explanation</h3>
                <ReactMarkdown>
                  {aiResponse.explanation}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}