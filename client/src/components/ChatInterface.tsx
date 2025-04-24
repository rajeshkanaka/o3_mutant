import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, defaultSystemPrompt } from "@/lib/openai";
import { Message } from "@/lib/types";
import { estimateTokenCount, calculateTokenCostInINR } from "@/lib/utils";
import ChatHeader from "./ChatHeader";
import SystemPrompt from "./SystemPrompt";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import LoadingIndicator from "./LoadingIndicator";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I'm Astra o3 by Rajesh, built on OpenAI's O3 model. I'm designed to solve complex, multi-step tasks with clear reasoning and effective tool use. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [systemPromptVisible, setSystemPromptVisible] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom of messages container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Define a type for the mutation input
  type SendMessageInput = {
    content: string;
    imageFile?: File;
  };

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const { content, imageFile } = input;
      
      // First add the user message to the UI
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: new Date(),
        hasImage: !!imageFile
      };
      
      setMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Then send messages to API and get response
      const messagesForAPI = [...messages, userMessage];
      const response = await sendChatMessage(messagesForAPI, systemPrompt, imageFile);
      
      // Add AI response to messages with token usage information
      const completionTokens = response.usage?.completion_tokens || estimateTokenCount(response.choices[0].message.content);
      const promptTokens = response.usage?.prompt_tokens || estimateTokenCount(content);
      
      const aiMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.choices[0].message.content,
        timestamp: new Date(),
        tokenCount: completionTokens,
        costInInr: calculateTokenCostInINR(completionTokens, false)
      };
      
      setMessages(prevMessages => [...prevMessages, aiMessage]);
      return aiMessage;
    },
    onError: (error) => {
      console.error('Error in chat completion:', error);
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const handleSendMessage = (content: string, imageFile?: File) => {
    if (imageFile) {
      setSelectedImage(imageFile);
      sendMessage({ content, imageFile }, { 
        onSuccess: () => {
          console.log("Message with image sent successfully");
        }
      });
    } else {
      setSelectedImage(null);
      sendMessage({ content });
    }
  };

  const toggleSystemPrompt = () => {
    setSystemPromptVisible(!systemPromptVisible);
  };

  const updateSystemPrompt = (prompt: string) => {
    setSystemPrompt(prompt);
  };

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader toggleSystemPrompt={toggleSystemPrompt} />
      
      <SystemPrompt 
        isVisible={systemPromptVisible} 
        systemPrompt={systemPrompt} 
        updateSystemPrompt={updateSystemPrompt} 
      />
      
      <div className="flex-1 overflow-y-auto p-4 bg-white" id="chat-container">
        <div className="max-w-5xl mx-auto space-y-6" id="messages-container">
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isPending && <LoadingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} disabled={isPending} />
    </div>
  );
}
