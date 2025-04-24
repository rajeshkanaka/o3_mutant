import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

interface SystemPromptProps {
  isVisible: boolean;
  systemPrompt: string;
  updateSystemPrompt: (prompt: string) => void;
}

export default function SystemPrompt({ isVisible, systemPrompt, updateSystemPrompt }: SystemPromptProps) {
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);

  useEffect(() => {
    setLocalPrompt(systemPrompt);
  }, [systemPrompt]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
    updateSystemPrompt(e.target.value);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-[#F7F7F8] border-b border-border p-4 overflow-auto max-h-60">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-semibold mb-2 text-sm">System Prompt</h2>
        <Textarea
          value={localPrompt}
          onChange={handleChange}
          className="font-mono text-xs bg-white rounded p-3 border border-border h-32 overflow-auto"
        />
      </div>
    </div>
  );
}
