import { Message, ParsedAIResponse } from "@/lib/types";
import { parseAIResponse } from "@/lib/openai";
import { estimateTokenCount, calculateTokenCostInINR, formatTokenCost } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import logoImage from "../assets/logo.png";

interface ChatMessageProps {
  message: Message;
}

const UserMessage = ({ message }: { message: Message }) => {
  const { content, hasImage } = message;
  
  return (
    <div className="flex justify-end">
      <div className="message-user">
        {hasImage && (
          <div className="mb-2 text-sm text-gray-600 flex items-center">
            <span className="mr-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span>Image attached</span>
          </div>
        )}
        <p>{content}</p>
      </div>
    </div>
  );
};

const AIAvatar = () => (
  <div className="w-10 h-10 rounded-full overflow-hidden bg-white p-1">
    <img 
      src={logoImage} 
      alt="Astra O3 Avatar" 
      className="w-full h-full object-contain"
    />
  </div>
);

const AIMessage = ({ message }: { message: Message }) => {
  const { content } = message;
  const parsedResponse = parseAIResponse(content);
  
  // Use token count and cost from message if available, otherwise estimate
  const tokenCount = message.tokenCount || estimateTokenCount(content);
  const costInInr = message.costInInr || calculateTokenCostInINR(tokenCount, false);
  
  const copyToClipboard = (text: string, isMarkdown: boolean = false) => {
    navigator.clipboard.writeText(text);
  };
  
  // Fallback to displaying raw content if parsing fails
  if (!parsedResponse.answer && !parsedResponse.steps?.length) {
    return (
      <div className="message-ai">
        <div className="flex">
          <div className="flex-shrink-0 mr-4">
            <AIAvatar />
          </div>
          <div className="flex-1">
            <div className="font-medium mb-2 flex items-center justify-between">
              <span>Astra O3 by Rajesh</span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => copyToClipboard(content)}
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                  title="Copy formatted text"
                >
                  Copy
                </button>
                <button 
                  onClick={() => copyToClipboard(content, true)}
                  className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                  title="Copy as markdown"
                >
                  Copy as MD
                </button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              ~{tokenCount} tokens · ₹{costInInr} INR
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Combine all content for token counting
  const fullContent = [
    parsedResponse.answer,
    parsedResponse.steps?.join(' '),
    parsedResponse.nextActions,
    parsedResponse.citations
  ].filter(Boolean).join(' ');
  
  // Use the actual token count and cost from the message or the estimated ones
  const fullTokenCount = tokenCount;
  const fullCostInInr = costInInr;
  
  return (
    <div className="message-ai">
      <div className="flex">
        <div className="flex-shrink-0 mr-4">
          <AIAvatar />
        </div>
        <div className="flex-1">
          <div className="font-medium mb-2 flex items-center justify-between">
            <span>Astra O3 by Rajesh</span>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => copyToClipboard(content)}
                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Copy formatted text"
              >
                Copy
              </button>
              <button 
                onClick={() => copyToClipboard(content, true)}
                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Copy as markdown"
              >
                Copy as MD
              </button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">
            {parsedResponse.answer && (
              <>
                <h3 className="text-lg font-semibold mt-0">Answer</h3>
                <ReactMarkdown>{parsedResponse.answer}</ReactMarkdown>
              </>
            )}
            
            {parsedResponse.steps && parsedResponse.steps.length > 0 && (
              <>
                <h3 className="text-lg font-semibold">Steps</h3>
                <ul className="list-disc pl-6">
                  {parsedResponse.steps.map((step, idx) => (
                    <li key={idx}><ReactMarkdown>{step}</ReactMarkdown></li>
                  ))}
                </ul>
              </>
            )}
            
            {parsedResponse.nextActions && (
              <>
                <h3 className="text-lg font-semibold">Next Actions</h3>
                <ReactMarkdown>{parsedResponse.nextActions}</ReactMarkdown>
              </>
            )}
            
            {parsedResponse.citations && (
              <>
                <h3 className="text-lg font-semibold">Citations</h3>
                <p className="text-sm text-gray-600">
                  <ReactMarkdown>{parsedResponse.citations}</ReactMarkdown>
                </p>
              </>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-3">
            ~{fullTokenCount} tokens · ₹{fullCostInInr} INR
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  } else {
    return <AIMessage message={message} />;
  }
}
