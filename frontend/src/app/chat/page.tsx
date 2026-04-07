"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Send, Bot, User, Sparkles, PlusCircle, 
  Trash2, Copy, RefreshCw, MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
  sources?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Namaste! I'm your AaharAI NutriSync assistant. How can I help you today with your nutritional goals?",
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          user_profile: {
             gender: "MALE", // Mock — in real app use session state
             age: 30,
             weight_kg: 70,
             height_cm: 170,
             profession: "Sedentary",
             region_zone: "South",
             diet_type: "VEG"
          }
        }),
      })

      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()

      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.answer,
        sources: data.sources
      }])
    } catch (error) {
      toast.error("Connection failed", {
        description: "Make sure the backend is running on port 8000.",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-primary/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">RAG Nutrition Assistant</h1>
            <Badge variant="outline" className="mt-1 text-[10px] uppercase font-bold text-primary border-primary/30">
              Grounded in IFCT 2017
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMessages([messages[0]])}>
          <Trash2 className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 glass-card border-primary/20 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <Avatar className={`w-10 h-10 border shadow-sm ${m.role === "user" ? "bg-primary text-white" : "bg-white"}`}>
                  <AvatarFallback className={m.role === "user" ? "bg-primary text-white" : ""}>
                    {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-primary" />}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === "user" ? "items-end" : ""}`}>
                  <div className={`
                    p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                    ${m.role === "user" 
                      ? "bg-primary text-white rounded-tr-none" 
                      : "bg-muted/50 border rounded-tl-none"}
                  `}>
                    {m.content}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                       {m.sources.map((s, idx) => (
                         <Badge key={idx} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-[10px]">
                           Source: {s.split("/").pop()}
                         </Badge>
                       ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <Avatar className="w-10 h-10 border bg-white">
                  <AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback>
                </Avatar>
                <div className="bg-muted/50 border p-4 rounded-2xl rounded-tl-none animate-pulse flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t glass bg-background/50">
          <div className="flex gap-2 relative group">
            <Input 
              placeholder="Ask about nutrients in Ragi, Curd, or Moong dal..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="pr-12 py-6 rounded-2xl border-primary/20 shadow-inner group-focus-within:border-primary/50 transition-all"
            />
            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1.5 bottom-1.5 h-auto w-10 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-center mt-3 text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> Grounded in IFCT 2017 & ICMR-NIN RDA 2024
          </p>
        </div>
      </Card>

      {/* Suggested Topics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          "Nutrient density in Ragi?",
          "PCOS low-GI staples",
          "GLP-1 titration diet",
          "Iron rich veg foods"
        ].map((topic) => (
          <Button 
            key={topic} 
            variant="outline" 
            onClick={() => setInput(topic)}
            className="glass hover:bg-primary/10 text-xs border-primary/20 py-6"
          >
            {topic}
          </Button>
        ))}
      </div>
    </div>
  )
}
