export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
}

export interface ParsedAIResponse {
  answer?: string;
  steps?: string[];
  nextActions?: string;
  citations?: string;
}
