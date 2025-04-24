import { Button } from "@/components/ui/button";
import { FaCog } from "react-icons/fa";
import logoImage from "../assets/logo.png";

interface ChatHeaderProps {
  toggleSystemPrompt: () => void;
}

export default function ChatHeader({ toggleSystemPrompt }: ChatHeaderProps) {
  return (
    <header className="border-b border-border px-4 py-3 flex justify-between items-center bg-white shadow-sm z-10">
      <div className="flex items-center">
        <img 
          src={logoImage} 
          alt="Astra O3 Logo" 
          className="h-12 mr-2"
        />
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
