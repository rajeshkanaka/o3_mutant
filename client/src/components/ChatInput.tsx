import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaPaperPlane, FaTimes, FaImage } from "react-icons/fa";
import FileUpload from "./FileUpload";

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      onSendMessage(message.trim(), selectedFile || undefined);
      setMessage("");
      setSelectedFile(null);
      setShowFileUpload(false);
      
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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload);
    if (showFileUpload) {
      setSelectedFile(null);
    }
  };

  return (
    <div className="border-t border-border p-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {showFileUpload && (
          <div className="mb-4">
            <FileUpload onFileSelect={handleFileSelect} accept="image/*" maxSizeMB={5} />
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Selected file:</span> {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <Button
            type="button"
            variant="outline"
            className={`flex-shrink-0 h-[60px] w-[60px] p-0 ${selectedFile ? 'text-primary border-primary' : ''}`}
            onClick={toggleFileUpload}
            title={showFileUpload ? "Hide image upload" : "Upload image for analysis"}
          >
            <FaImage />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedFile ? "Ask about this image..." : "Message Astra..."}
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
          <div className="flex space-x-3">
            <span>Pricing: ~₹0.83 INR per 1K input tokens, ~₹2.49 INR per 1K output tokens</span>
            <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">API Pricing</a>
          </div>
        </div>
      </div>
    </div>
  );
}
