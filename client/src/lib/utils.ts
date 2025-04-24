import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate token cost in INR
// Based on current OpenAI pricing for gpt-4o (May 2024): $0.01/1K input tokens, $0.03/1K output tokens
// Using approximate exchange rate of 1 USD = 83 INR
export const calculateTokenCostInINR = (
  tokenCount: number, 
  isInput: boolean = false
): number => {
  const ratePerThousandTokens = isInput ? 0.01 : 0.03; // USD per 1K tokens
  const usdToInr = 83; // Approximate conversion rate
  return parseFloat(((tokenCount / 1000) * ratePerThousandTokens * usdToInr).toFixed(2));
};

// Estimate token count (rough approximation)
export const estimateTokenCount = (text: string): number => {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

// Format token cost for display
export const formatTokenCost = (cost: number): string => {
  return `₹${cost.toFixed(2)} INR`;
};
