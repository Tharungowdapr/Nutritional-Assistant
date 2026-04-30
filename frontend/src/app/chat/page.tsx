"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User as UserIcon, Plus, Trash2, Loader2, X, Menu, MessageSquare, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useChat, ChatSession } from "@/lib/chat-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import Link from "next/link";

export default function ChatPage() {
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
    toast.success("New chat started");
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
    if (confirm("Delete this chat?")) {
      await deleteSession(id);
      toast.success("Chat deleted");
    }
  };

  const getSessionTitle = (session: ChatSession) => session.title || "New Chat";

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] p-6">
        <MessageSquare className="w-10 h-10 text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">AI Nutrition Chat</h2>
        <p className="text-muted-foreground text-sm mb-6">Sign in to chat with our AI assistant.</p>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed bottom-20 right-4 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Chat History</h2>
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={handleNewChat} variant="outline" className="w-full text-sm h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessionsLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No chats yet</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors text-sm
                  ${currentSession?.id === session.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
              >
                <p className="font-medium truncate pr-6">{getSessionTitle(session)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">

        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-semibold">
              {currentSession ? getSessionTitle(currentSession) : "Nutrition Chat"}
            </h1>
            <p className="text-[11px] text-muted-foreground">Powered by IFCT 2017 & ICMR-NIN data</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
              <MessageSquare className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">How can I help?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Ask about Indian foods, nutrients, meal plans, or health protocols.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                {[
                  "High-protein vegetarian options?",
                  "Analyze my regional diet risks",
                  "Help with low iron levels",
                  "Explain ICMR 2024 guidelines"
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="p-3 text-left rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} fade-in`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`flex flex-col gap-1.5 max-w-[80%] md:max-w-[70%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-4 py-3 rounded-xl text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm"
                }`}>
                  {msg.role === "user" ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {msg.content ? (
                        <>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          {loading && i === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-4 bg-primary/40 animate-pulse ml-0.5 align-middle" />
                          )}
                        </>
                      ) : (
                        <div className="flex gap-1.5 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((source: any, idx: number) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {source.source}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          <div ref={scrollEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-4 border-t border-border bg-card">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about nutrition, foods, or health..."
              className="flex-1 h-10"
              disabled={loading}
            />
            <Button type="submit" disabled={!input.trim() || loading} size="icon" className="h-10 w-10 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}