"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface RAGChatSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
}

export function RAGChatSidebar({ currentSessionId, onSessionSelect }: RAGChatSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const data = await apiFetch("/api/chat/sessions", { method: "GET" });
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch chat sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const data = await apiFetch("/api/chat/sessions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSessions([data, ...sessions]);
      onSessionSelect(data.id);
      router.push(`/chat?session=${data.id}`);
      toast.success("New chat created");
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create new chat");
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success("Chat deleted");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  const updateSessionTitle = async (sessionId: string) => {
    try {
      await apiFetch(`/api/chat/sessions/${sessionId}/title`, {
        method: "PUT",
        body: JSON.stringify({ title: editTitle }),
      });
      setSessions(sessions.map(s => 
        s.id === sessionId ? { ...s, title: editTitle } : s
      ));
      setEditingId(null);
      toast.success("Chat title updated");
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("Failed to update chat title");
    }
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button onClick={createNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading chats...</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No chats yet. Create one to start!</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={cn(
                  "group relative p-3 rounded-lg cursor-pointer transition-all hover:bg-accent",
                  currentSessionId === session.id ? "bg-primary/10 border-primary/30 border" : ""
                )}
                onClick={() => onSessionSelect(session.id)}
              >
                {editingId === session.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => updateSessionTitle(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateSessionTitle(session.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="w-full text-sm px-2 py-1 rounded border border-primary bg-background"
                  />
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(session.id);
                          setEditTitle(session.title);
                        }}
                        className="p-1 hover:bg-primary/20 rounded"
                        title="Edit title"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="p-1 hover:bg-red-500/20 rounded"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
