"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiFetch, setToken, clearToken } from "@/lib/api";

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

    setLoading(true);
    setMessages(prev => [...prev, { role: "user", content: message }]);

    try {
      let response: any;
      
      if (currentSession) {
        response = await fetch("http://localhost:8000/api/chat/sessions/" + sessionId + "/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
          },
          body: JSON.stringify({
            message: message,
            session_id: sessionId,
          }),
        });
        
        if (!response.ok) throw new Error("Failed to send message");
        const data = await response.json();
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.assistant_message,
          sources: data.sources || [],
        }]);
        
        await refreshSessions();
        
        return data.assistant_message;
      } else {
        response = await fetch("http://localhost:8000/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
          },
          body: JSON.stringify({
            message: message,
            user_profile: userProfile,
            session_id: sessionId,
          }),
        });
        
        if (!response.ok) throw new Error("Failed to send message");
        const data = await response.json();
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.answer,
          sources: data.sources || [],
        }]);
        
        await refreshSessions();
        
        return data.answer;
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSession, createSession, refreshSessions]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

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