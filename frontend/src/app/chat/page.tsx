"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User as UserIcon, Sparkles, Plus, Trash2, Loader2, X, Menu, MessageSquare, BrainCircuit, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useChat, ChatSession } from "@/lib/chat-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import Link from "next/link";

export default function LuxuryChatPage() {
  const { user } = useAuth();
  const { 
    sessions, 
    currentSession, 
    messages, 
    loading, 
    sessionsLoading,
    createSession, 
    selectSession, 
    deleteSession, 
    sendMessage,
  } = useChat();
  
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      selectSession(sessions[0].id);
    }
  }, [sessions, currentSession, selectSession]);

  const handleNewChat = async () => {
    await createSession();
    toast.success("New consultation initiated");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !user) return;

    const userMsg = input.trim();
    setInput("");

    try {
      await sendMessage(userMsg, user.profile);
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSelectSession = async (id: string) => {
    await selectSession(id);
    setSidebarOpen(false);
  };

  const handleDeleteSession = async (e: React.FormEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this consultation history?")) {
      await deleteSession(id);
      toast.success("History removed");
    }
  };

  const getSessionTitle = (session: ChatSession) => {
    return session.title || "New Consultation";
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="p-6 rounded-[32px] bg-primary/5 border border-primary/10 inline-block">
            <MessageSquare className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-serif luxury-text-gradient">Scientific Consultations</h2>
          <p className="text-muted-foreground font-medium">Please sign in to access your personalized nutritional advisor.</p>
          <Link href="/login">
            <Button className="rounded-full px-10 py-6 font-bold shadow-xl">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background overflow-hidden font-sans">
      
      {/* Mobile Sidebar Toggle */}
      <button 
        className="md:hidden fixed bottom-24 right-6 z-50 p-4 rounded-full bg-primary text-primary-foreground shadow-2xl"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar - Luxury Emerald */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-80 bg-[#0A2E28] text-white transform transition-transform duration-500 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col border-r border-white/5 shadow-2xl
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-accent">History</h2>
            <Button variant="ghost" size="icon" className="md:hidden text-white/50 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <Button onClick={handleNewChat} className="w-full rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-6">
            <Plus className="w-4 h-4 mr-2" />
            New Consultation
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {sessionsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent/50" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-10 opacity-30">
               <BrainCircuit className="w-12 h-12 mx-auto mb-4" />
               <p className="text-xs font-bold uppercase tracking-widest">No History</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`
                  group relative p-4 rounded-2xl cursor-pointer transition-all duration-300
                  ${currentSession?.id === session.id 
                    ? "bg-white/10 border border-white/10 shadow-lg" 
                    : "hover:bg-white/5 border border-transparent"}
                `}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${currentSession?.id === session.id ? 'text-accent' : 'text-white/80'}`}>
                      {getSessionTitle(session)}
                    </p>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/5 bg-black/10">
           <Link href="/" className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-accent transition-colors">
             <ChevronLeft className="w-4 h-4" /> Return to Concierge
           </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[#FDFCF8]">
        
        {/* Chat Header */}
        <div className="shrink-0 p-6 border-b border-border/40 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/5 text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif text-foreground">
                {currentSession ? getSessionTitle(currentSession) : "Nutritional Consultation"}
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">IFCT 2017 & ICMR-NIN Grounded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 scrollbar-thin">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-2xl mx-auto">
              <div className="p-6 rounded-[40px] bg-primary/5 border border-primary/10">
                <BrainCircuit className="w-12 h-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-serif luxury-text-gradient">How can I guide you today?</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  I am trained on clinical datasets to provide precise guidance on Indian diets, macro-nutrient optimization, and health protocols.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {[
                  "What are high-protein vegetarian options?",
                  "Analyze my regional diet risks.",
                  "Create a protocol for low Iron levels.",
                  "Explain ICMR 2024 guidelines."
                ].map((prompt) => (
                  <button 
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="p-4 text-left rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm font-bold text-foreground/70"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
              {msg.role === "assistant" && (
                <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              
              <div className={`flex flex-col gap-2 max-w-[85%] md:max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`p-5 rounded-[24px] shadow-sm ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                    : "bg-white border border-border/40 text-foreground rounded-tl-none"
                }`}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose prose-emerald dark:prose-invert max-w-none prose-p:leading-relaxed prose-strong:font-black">
                      {msg.content ? (
                        <>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          {loading && i === messages.length - 1 && (
                            <span className="inline-block w-2 h-4 bg-primary/40 animate-pulse ml-1 align-middle" />
                          )}
                        </>
                      ) : (
                        <div className="flex gap-2 py-2">
                          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/5 border border-accent/20 text-[10px] font-black text-accent uppercase tracking-widest">
                        <Activity className="w-3 h-3" /> {source.source}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-10 h-10 rounded-2xl bg-white border border-border/40 flex items-center justify-center shrink-0 shadow-sm">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
              )}
            </div>
          ))}

          <div ref={scrollEndRef} />
        </div>

        {/* Input Area - Floating Glassmorphism */}
        <div className="shrink-0 p-6 md:p-10">
          <form 
            onSubmit={handleSend} 
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-2 p-2 rounded-[32px] bg-white border border-border shadow-2xl focus-within:border-primary/40 transition-all">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your advisor about protein, vitamins, or meal protocols..."
                className="flex-1 border-none bg-transparent focus-visible:ring-0 text-base py-8 px-6 font-medium placeholder:text-muted-foreground/50"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex-shrink-0"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </Button>
            </div>
          </form>
          <p className="text-center mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Clinical AI Advisor — Grounded in ICMR-NIN 2024
          </p>
        </div>
      </div>
    </div>
  );
}