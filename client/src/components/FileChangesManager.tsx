import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Check, Code, ExternalLink, GitCommit, RefreshCw, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

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

export default function FileChangesManager() {
  const [selectedRepository, setSelectedRepository] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: repositories, isLoading: isLoadingRepos } = useQuery({
    queryKey: ['/api/github/repositories'],
    queryFn: () => apiRequest<GithubRepository[]>('/api/github/repositories')
  });

  const { data: fileChanges, isLoading: isLoadingChanges, error: changesError } = useQuery({
    queryKey: ['/api/github/repositories', selectedRepository, 'files'],
    queryFn: async () => selectedRepository 
      ? await apiRequest<GithubFileChange[]>(`/api/github/repositories/${selectedRepository}/files`)
      : [],
    enabled: !!selectedRepository
  });

  // Commit file changes to GitHub
  const commitFileChangeMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest<GithubFileChange>(`/api/github/files/${id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/github/repositories', selectedRepository, 'files'] 
      });
      
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

  // Delete file change
  const deleteFileChangeMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/github/files/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/github/repositories', selectedRepository, 'files'] 
      });
      
      toast({
        title: 'Change deleted',
        description: 'File change has been deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting change',
        description: error.message || 'Failed to delete file change.',
        variant: 'destructive',
      });
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700">Pending</Badge>;
      case 'committed':
        return <Badge variant="outline" className="bg-green-500/20 text-green-700">Committed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/20 text-red-700">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSelectedRepo = () => {
    if (!selectedRepository || !repositories) return null;
    return repositories.find(repo => repo.id === selectedRepository);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Code Changes</CardTitle>
          <CardDescription>
            Review, commit, or discard code changes suggested by Astra o3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            {selectedRepository && (
              <div className="mt-4">
                {isLoadingChanges ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : changesError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load file changes
                    </AlertDescription>
                  </Alert>
                ) : fileChanges && fileChanges.length > 0 ? (
                  <div className="space-y-4">
                    {fileChanges.map((change) => (
                      <div key={change.id} className="border rounded-md overflow-hidden">
                        <div className="bg-secondary p-3 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium">{change.path}</span>
                            <span className="text-xs text-muted-foreground">{change.commitMessage}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(change.status)}
                            
                            {change.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={commitFileChangeMutation.isPending}
                                onClick={() => commitFileChangeMutation.mutate(change.id)}
                              >
                                {commitFileChangeMutation.isPending ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <GitCommit className="h-4 w-4" />
                                )}
                                <span className="ml-1">Commit</span>
                              </Button>
                            )}
                            
                            {change.status === 'committed' && change.commitUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(change.commitUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span className="ml-1">View Commit</span>
                              </Button>
                            )}
                            
                            {change.status !== 'committed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteFileChangeMutation.mutate(change.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="ml-1">Delete</span>
                              </Button>
                            )}
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
                  <div className="text-center py-6 text-muted-foreground">
                    No pending code changes for this repository.
                    <br />
                    Use the Code Assistant to generate suggestions.
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}