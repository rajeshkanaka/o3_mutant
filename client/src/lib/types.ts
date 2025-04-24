export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenCount?: number;
  costInInr?: number;
}

export interface SystemPrompt {
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  sessionId?: number;
}

export interface ParsedAIResponse {
  answer?: string;
  steps?: string[];
  nextActions?: string;
  citations?: string;
}
