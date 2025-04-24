import { Button } from "@/components/ui/button";
import { FaCog } from "react-icons/fa";

interface ChatHeaderProps {
  toggleSystemPrompt: () => void;
}

export default function ChatHeader({ toggleSystemPrompt }: ChatHeaderProps) {
  return (
    <header className="border-b border-border px-4 py-3 flex justify-between items-center bg-white shadow-sm z-10">
      <div className="flex items-center">
        <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="hsl(var(--primary))" />
          <path d="M12 17V15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 13C12 11.9 12.9 11 14 11C15.1 11 16 10.1 16 9C16 7.9 15.1 7 14 7H10C8.9 7 8 7.9 8 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h1 className="text-lg font-semibold">O3 Chat Interface</h1>
      </div>
      <Button 
        variant="ghost" 
        onClick={toggleSystemPrompt}
        className="text-primary hover:text-primary/90 hover:bg-primary/10 text-sm font-medium"
      >
        <FaCog className="mr-1 h-4 w-4" />
        System Prompt
      </Button>
    </header>
  );
}
