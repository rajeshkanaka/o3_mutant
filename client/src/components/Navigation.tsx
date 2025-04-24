import { Link, useLocation } from "wouter";
import { Github, MessageSquare } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();
  
  return (
    <div className="fixed top-0 left-0 w-full bg-background z-10 shadow-sm border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="font-bold text-xl text-primary">Astra o3 by Rajesh</h1>
        </div>
        
        <div className="flex space-x-4">
          <Link href="/">
            <a className={`flex items-center space-x-1 px-3 py-2 rounded-md ${
              location === "/" ? "bg-secondary font-medium" : "hover:bg-secondary/50"
            }`}>
              <MessageSquare className="h-4 w-4" />
              <span>Chat</span>
            </a>
          </Link>
          
          <Link href="/github">
            <a className={`flex items-center space-x-1 px-3 py-2 rounded-md ${
              location === "/github" ? "bg-secondary font-medium" : "hover:bg-secondary/50"
            }`}>
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}