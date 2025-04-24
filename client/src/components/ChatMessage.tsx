import { Message, ParsedAIResponse } from "@/lib/types";
import { parseAIResponse } from "@/lib/openai";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: Message;
}

const UserMessage = ({ content }: { content: string }) => (
  <div className="flex justify-end">
    <div className="message-user">
      <p>{content}</p>
    </div>
  </div>
);

const AIAvatar = () => (
  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  </div>
);

const AIMessage = ({ content }: { content: string }) => {
  const parsedResponse = parseAIResponse(content);
  
  // Fallback to displaying raw content if parsing fails
  if (!parsedResponse.answer && !parsedResponse.steps?.length) {
    return (
      <div className="message-ai">
        <div className="flex">
          <div className="flex-shrink-0 mr-4">
            <AIAvatar />
          </div>
          <div className="flex-1">
            <div className="font-medium mb-2">Astra (O3)</div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="message-ai">
      <div className="flex">
        <div className="flex-shrink-0 mr-4">
          <AIAvatar />
        </div>
        <div className="flex-1">
          <div className="font-medium mb-2">Astra (O3)</div>
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
        </div>
      </div>
    </div>
  );
};

export default function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage content={message.content} />;
  } else {
    return <AIMessage content={message.content} />;
  }
}
