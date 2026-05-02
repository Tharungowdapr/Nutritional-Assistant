"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiFetch, setToken, clearToken, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  created_at?: string;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  loading: boolean;
  sessionsLoading: boolean;
  createSession: () => Promise<string | null>;
  selectSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  sendMessage: (message: string, userProfile?: any) => Promise<string>;
  refreshSessions: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const refreshSessions = useCallback(async () => {
    const token = localStorage.getItem("nutrisync_token");
    if (!token) return;
    
    setSessionsLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/chat/sessions", {});
      const sortedSessions = data.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setSessions(sortedSessions || []);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (): Promise<string | null> => {
    const token = localStorage.getItem("nutrisync_token");
    if (!token) return null;

    try {
      const newSession = await apiFetch<ChatSession>("/api/chat/sessions", { method: "POST" });
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      return newSession.id;
    } catch (err) {
      console.error("Failed to create session:", err);
      return null;
    }
  }, []);

  const selectSession = useCallback(async (id: string) => {
    const token = localStorage.getItem("nutrisync_token");
    if (!token) return;

    setLoading(true);
    try {
      const session = sessions.find(s => s.id === id);
      if (session) {
        setCurrentSession(session);
      }

      const history = await apiFetch<any[]>("/api/chat/sessions/" + id + "/history", {});
      
      const transformed: ChatMessage[] = [];
      for (const m of history) {
        if (m.user_message) {
          transformed.push({ role: "user", content: m.user_message });
        }
        if (m.assistant_message) {
          transformed.push({
            role: "assistant",
            content: m.assistant_message,
            sources: m.sources || [],
          });
        }
      }
      setMessages(transformed);
    } catch (err) {
      console.error("Failed to load session:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [sessions]);

  const deleteSession = useCallback(async (id: string) => {
    const token = localStorage.getItem("nutrisync_token");
    if (!token) return;

    try {
      await apiFetch("/api/chat/sessions/" + id, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSession?.id === id) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }, [currentSession]);

  const sendMessage = useCallback(async (message: string, userProfile?: any): Promise<string> => {
    const token = localStorage.getItem("nutrisync_token");
    let sessionId = currentSession?.id;

    if (!sessionId) {
      sessionId = await createSession() || undefined;
    }
    if (!sessionId) throw new Error("No session available");

    // Optimistically add user message
    setMessages(prev => [...prev, { role: "user", content: message }]);
    // Add empty assistant message that we'll stream into
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          user_profile: userProfile,
          session_id: sessionId,
        }),
      });

      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE lines come as: "data: {...}\n\n"
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6)); // strip "data: "
            if (json.error) throw new Error(json.error);
            if (json.token) {
              fullResponse += json.token;
              // Update the last (assistant) message in place
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullResponse,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      await refreshSessions();
      return fullResponse;
    } catch (err) {
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
      console.error("Failed to send message:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSession, createSession, refreshSessions]);

  useEffect(() => {
    if (!authLoading && user) {
      refreshSessions();
    }
  }, [authLoading, user, refreshSessions]);

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      messages,
      loading,
      sessionsLoading,
      createSession,
      selectSession,
      deleteSession,
      sendMessage,
      refreshSessions,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}