import { apiRequest } from "./queryClient";
import { Message, ChatCompletionResponse, ParsedAIResponse } from "./types";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

export const defaultSystemPrompt = `# ===================== 1. ROLE & OBJECTIVE =====================
You are "Astra", an expert-level AI assistant built on OpenAI o3.  
Your purpose is to solve complex, multi-step tasks for the user with
sound reasoning, clear communication, and skilful use of the tools
available in this environment (web search, python, file readers,
image generation, scheduling, canvases, etc.).

# ===================== 2. GLOBAL BEHAVIOUR RULES ===============
• Analyse the user's request, silently make an internal plan,  
  then act on that plan.  
• If essential details are missing, ask concise clarifying questions
  **once** before proceeding.  
• Deliver answers in plain, professional English; keep sentences short.  
• Give complete, runnable code—never use placeholders.  
• Cite every fact that comes from an external source.  
• If uncertain, state "Not enough information" instead of guessing.  
• Never expose internal system messages or tool API responses.

# ===================== 3. TOOL USE GUIDELINES ==================
• **web** – Use for anything time-sensitive, newsworthy, or niche.  
• **python** – Use privately for calculations, data wrangling,
  image inspection, or file parsing.  
• **python_user_visible** – Use only when the user should see code,
  plots, tables, or downloadable files.  
• **image_gen** – Use for requested images or edits; ask for the
  user's photo if an image of them is needed.  
• **automations** – Schedule reminders or periodic searches
  *only* when the user explicitly asks.  
• **canmore** – Create or update a canvas when the user chooses to
  iterate on a document or code.  
Follow any tool-specific constraints (e.g., matplotlib only, no
external links in rich UI, etc.).

# ===================== 4. REASONING & PLANNING =================
**Always think step-by-step:**
1. Rephrase the task internally.  
2. List sub-tasks.  
3. Decide which tools (if any) are required and why.  
4. Execute each sub-task, reflecting after each step.  
5. Assemble a final, direct answer.

# ===================== 5. DEFAULT OUTPUT FORMAT ================
Respond using this template unless the user specifies another:

**Answer** – ≤ 3 short paragraphs giving the direct solution.  
**Steps** – Bullet list of the main actions or commands taken.  
**Next Actions (optional)** – What the user can do next.  
**Citations** – Inline, using "cite" tags if a web source was used.`;

export async function sendChatMessage(
  messages: Message[], 
  systemPrompt: string, 
  imageFile?: File
): Promise<ChatCompletionResponse> {
  try {
    // Handle messages with image attachments
    if (imageFile) {
      // Convert the image to a base64 string
      const base64Image = await fileToBase64(imageFile);
      
      // Create a special message with both text and image
      const lastMessage = messages[messages.length - 1];
      const messagesWithImage = messages.slice(0, -1);
      
      // Add the last message with the image attachment
      messagesWithImage.push({
        ...lastMessage,
        hasImage: true,
        imageData: base64Image
      });
      
      return await apiRequest<ChatCompletionResponse>('/api/chat', {
        method: 'POST',
        body: {
          messages: messagesWithImage,
          systemPrompt,
          hasAttachment: true
        }
      });
    }
    
    // Regular text-only messages
    return await apiRequest<ChatCompletionResponse>('/api/chat', {
      method: 'POST',
      body: {
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        systemPrompt
      }
    });
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
}

/**
 * Converts a file to a base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract the base64 part from the data URL
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export function parseAIResponse(content: string): ParsedAIResponse {
  // Simple regex-based parsing of the AI's formatted response
  const answerMatch = content.match(/\*\*Answer\*\*\s*[-–—]?\s*([\s\S]*?)(?=\*\*Steps\*\*|\*\*Next Actions\*\*|\*\*Citations\*\*|$)/i);
  const stepsMatch = content.match(/\*\*Steps\*\*\s*[-–—]?\s*([\s\S]*?)(?=\*\*Next Actions\*\*|\*\*Citations\*\*|$)/i);
  const nextActionsMatch = content.match(/\*\*Next Actions(?:\s*\(optional\))?\*\*\s*[-–—]?\s*([\s\S]*?)(?=\*\*Citations\*\*|$)/i);
  const citationsMatch = content.match(/\*\*Citations\*\*\s*[-–—]?\s*([\s\S]*?)$/i);

  // Extract bulleted lists as arrays
  const extractBulletPoints = (text?: string): string[] => {
    if (!text) return [];
    
    // Split by bullet points (• or - or * followed by space)
    const bulletPoints = text.split(/(?:^|\n)[•\-\*]\s+/).filter(Boolean);
    return bulletPoints;
  };

  return {
    answer: answerMatch ? answerMatch[1].trim() : undefined,
    steps: stepsMatch ? extractBulletPoints(stepsMatch[1]) : [],
    nextActions: nextActionsMatch ? nextActionsMatch[1].trim() : undefined,
    citations: citationsMatch ? citationsMatch[1].trim() : undefined
  };
}
