import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Check, Code, GitCommit, RefreshCw, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [targetPath, setTargetPath] = useState('');
  const [fileContext, setFileContext] = useState('');
  const [assistanceResponse, setAssistanceResponse] = useState<CodeAssistanceResponse | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<number[]>([]);
  
  const queryClient = useQueryClient();

  const { data: repositories, isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ['/api/github/repositories'],
    queryFn: () => apiRequest<GithubRepository[]>('/api/github/repositories')
  });

  // Get code assistance from AI
  const codeAssistanceMutation = useMutation({
    mutationFn: (data: { 
      repositoryId: number; 
      prompt: string; 
      fileContext?: string[]; 
      targetPath?: string;
    }) => 
      apiRequest<CodeAssistanceResponse>('/api/github/assist', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: (data) => {
      setAssistanceResponse(data);
      toast({
        title: 'Code assistance generated',
        description: 'AI has analyzed your repository and generated suggestions.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error generating code assistance',
        description: error.message || 'Failed to generate code assistance.',
        variant: 'destructive',
      });
    }
  });

  // Save file changes to database
  const saveFileChangeMutation = useMutation({
    mutationFn: (data: { 
      repositoryId: number; 
      path: string; 
      content: string; 
      commitMessage: string;
    }) => 
      apiRequest<GithubFileChange>(`/api/github/repositories/${data.repositoryId}/files`, {
        method: 'POST',
        body: JSON.stringify({
          path: data.path,
          content: data.content,
          commitMessage: data.commitMessage
        }),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/github/repositories'] });
      toast({
        title: 'Changes saved',
        description: 'Code changes have been saved for review.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error saving changes',
        description: error.message || 'Failed to save code changes.',
        variant: 'destructive',
      });
    }
  });

  // Commit file changes to GitHub
  const commitFileChangeMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest<GithubFileChange>(`/api/github/files/${id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: (data) => {
      toast({
        title: 'Changes committed',
        description: 'Code changes have been committed to GitHub.',
      });

      // Open the GitHub commit URL in a new tab if available
      if (data.commitUrl) {
        window.open(data.commitUrl, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error committing changes',
        description: error.message || 'Failed to commit code changes to GitHub.',
        variant: 'destructive',
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepository || !prompt) {
      toast({
        title: 'Missing information',
        description: 'Please select a repository and enter a prompt.',
        variant: 'destructive',
      });
      return;
    }

    // Prepare file context array if provided
    const fileContextArray = fileContext.trim() 
      ? fileContext.split('\n').map(f => f.trim()).filter(Boolean)
      : undefined;

    codeAssistanceMutation.mutate({
      repositoryId: selectedRepository,
      prompt,
      fileContext: fileContextArray,
      targetPath: targetPath || undefined
    });
  };

  const handleSaveChanges = () => {
    if (!selectedRepository || !assistanceResponse) return;

    // Filter selected changes
    const changesToApply = selectedChanges.map(index => assistanceResponse.changes[index]);
    
    // Save each change to database
    changesToApply.forEach(change => {
      saveFileChangeMutation.mutate({
        repositoryId: selectedRepository,
        path: change.path,
        content: change.content,
        commitMessage: change.commitMessage
      });
    });
  };

  const toggleChangeSelection = (index: number) => {
    setSelectedChanges(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
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
          <CardTitle>GitHub Code Assistant</CardTitle>
          <CardDescription>
            Ask Astra o3 to analyze your repository and suggest code improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="repository">Repository</Label>
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
              <Label htmlFor="prompt">What would you like Astra to do?</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Add proper error handling to the database connection code, or Refactor the user authentication system to use JWT tokens instead of sessions..."
                className="h-24"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="targetPath">Target File Path (optional)</Label>
                <Input
                  id="targetPath"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="E.g., src/database.js"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Specify a file path if you want to focus on a specific file
                </p>
              </div>

              <div>
                <Label htmlFor="fileContext">File Context (optional)</Label>
                <Textarea
                  id="fileContext"
                  value={fileContext}
                  onChange={(e) => setFileContext(e.target.value)}
                  placeholder="Enter paths to files for additional context, one per line"
                  className="h-20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  List file paths to provide context, one per line
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={codeAssistanceMutation.isPending || !selectedRepository}
              className="w-full"
            >
              {codeAssistanceMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Code Suggestions
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {assistanceResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Analysis Results
              <span className="text-sm font-normal text-muted-foreground ml-2">
                for {getSelectedRepo()?.owner}/{getSelectedRepo()?.repo}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Analysis</h3>
              <div className="bg-secondary/50 p-3 rounded-md text-sm">
                {assistanceResponse.analysis}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Explanation</h3>
              <div className="bg-secondary/50 p-3 rounded-md text-sm">
                {assistanceResponse.explanation}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Suggested Changes</h3>
              <div className="space-y-4">
                {assistanceResponse.changes.map((change, index) => (
                  <div key={index} className="border rounded-md overflow-hidden">
                    <div className="bg-secondary p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`change-${index}`}
                          checked={selectedChanges.includes(index)}
                          onChange={() => toggleChangeSelection(index)}
                          className="mr-2 h-4 w-4"
                        />
                        <Label htmlFor={`change-${index}`} className="cursor-pointer flex items-center">
                          <span className="font-medium">{change.path}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            change.changeType === 'create' ? 'bg-green-500/20 text-green-700' : 'bg-blue-500/20 text-blue-700'
                          }`}>
                            {change.changeType === 'create' ? 'Create' : 'Modify'}
                          </span>
                        </Label>
                      </div>
                      <span className="text-xs text-muted-foreground">{change.commitMessage}</span>
                    </div>
                    <ScrollArea className="h-60">
                      <pre className="p-3 text-xs bg-black text-white overflow-auto">
                        <code>{change.content}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSaveChanges}
              disabled={saveFileChangeMutation.isPending || selectedChanges.length === 0}
              className="w-full"
            >
              {saveFileChangeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Saving changes...
                </>
              ) : (
                <>
                  <GitCommit className="h-4 w-4 mr-2" />
                  Save Selected Changes ({selectedChanges.length})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}