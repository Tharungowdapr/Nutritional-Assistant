"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User as UserIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { chatApi } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load history
    chatApi.history().then((data: any) => {
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([{
          role: "assistant",
          content: "Hello! I'm your IFCT-grounded nutrition assistant. How can I help you today?"
        }]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await chatApi.send(userMsg, user?.profile);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.answer,
        sources: res.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error processing your request."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen lg:max-w-4xl mx-auto p-4 md:p-8 fade-in">
      <header className="mb-6 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Knowledge Chat</h1>
          <p className="text-sm text-muted-foreground">Answers grounded in Indian Food Composition Tables</p>
        </div>
      </header>

      <div className="flex-1 glass-card overflow-hidden flex flex-col mb-4">
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div className={`p-4 rounded-2xl ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted/50 rounded-tl-sm text-foreground prose prose-sm dark:prose-invert max-w-none"
                  }`}>
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    )}
                  </div>
                  
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {msg.sources.slice(0, 3).map((source: any, idx: number) => (
                        <div key={idx} className="text-[10px] uppercase font-semibold text-primary px-2 py-1 bg-primary/5 rounded border border-primary/10">
                          {source.source}
                          {source.identifier && ` • ${source.identifier}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-sm bg-muted/50 w-24">
                  <div className="flex justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-background/50 border-t border-border">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about protein sources, specific diseases, or meal ideas..."
              className="pr-12 py-6 rounded-xl bg-card border-border/50 text-base"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 h-9 w-9 rounded-lg"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
