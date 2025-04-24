import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaPaperPlane, FaTimes } from "react-icons/fa";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px"; // Reset height to calculate properly
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 144) + "px"; // Max height of 36px * 4 = 144px
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
      
      // Reset height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = "60px";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearInput = () => {
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "60px";
      textareaRef.current.focus();
    }
  };

  return (
    <div className="border-t border-border p-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Astra..."
              className="w-full border border-border rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[60px] max-h-36"
              disabled={disabled}
            />
            {message && (
              <button
                type="button"
                onClick={clearInput}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                disabled={disabled}
              >
                <FaTimes />
              </button>
            )}
          </div>
          <Button 
            type="submit"
            className="bg-primary text-white rounded-lg px-4 py-3 font-medium hover:bg-primary/90 flex-shrink-0 flex items-center justify-center min-w-[60px] h-[60px]"
            disabled={!message.trim() || disabled}
          >
            <FaPaperPlane />
          </Button>
        </form>
        <div className="text-xs text-gray-500 mt-2 flex justify-between">
          <span>O3 models may produce inaccurate information or display harmful content.</span>
          <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Pricing</a>
        </div>
      </div>
    </div>
  );
}
