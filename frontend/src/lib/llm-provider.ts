import { getStorageKey } from "./utils";

export type LLMProviderType = "groq" | "gemini" | "ollama";

export interface LLMConfig {
  provider: LLMProviderType;
  groqApiKey?: string;
  geminiApiKey?: string;
  ollamaUrl?: string; // e.g. http://localhost:11434
}

export interface LLMResponse {
  content: string;
  provider: LLMProviderType;
  error?: string;
}

export class FrontendLLM {
  private config: LLMConfig;
  private userId: string | null = null;

  constructor() {
    this.config = this.loadConfig();
  }

  public setUser(userId: string | undefined) {
    if (this.userId === userId) return;
    this.userId = userId || null;
    this.config = this.loadConfig();
  }

  private loadConfig(): LLMConfig {
    const defaultConfig: LLMConfig = { 
      provider: "ollama", 
      ollamaUrl: "http://localhost:11434",
      geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY
    };

    if (typeof window === "undefined") return defaultConfig;
    
    // Check for user-scoped config first
    const key = this.userId ? getStorageKey("nutrisync_llm_config", this.userId) : "nutrisync_llm_config";
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...defaultConfig,
          ...parsed,
          geminiApiKey: parsed.geminiApiKey || defaultConfig.geminiApiKey,
          groqApiKey: parsed.groqApiKey || defaultConfig.groqApiKey,
        };
      } catch (e) {
        console.error("Failed to parse LLM config", e);
      }
    }
    return defaultConfig;
  }

  public saveConfig(config: LLMConfig) {
    this.config = config;
    if (typeof window !== "undefined") {
      const key = this.userId ? getStorageKey("nutrisync_llm_config", this.userId) : "nutrisync_llm_config";
      localStorage.setItem(key, JSON.stringify(config));
      // Dispatch event to update UI (like sidebar)
      window.dispatchEvent(new Event("llm_config_updated"));
    }
  }

  public getConfig(): LLMConfig {
    return this.config;
  }

  public async generate(prompt: string, systemPrompt?: string, userId?: string | number): Promise<LLMResponse> {
    const { provider, groqApiKey, geminiApiKey, ollamaUrl } = this.config;

    try {
      if (provider === "groq") {
        if (!groqApiKey?.trim()) throw new Error("Groq API key not configured. Please add it in Settings > AI Models.");
        const res = await this.generateGroq(prompt, systemPrompt, groqApiKey);
        this.updateUsage(prompt + (systemPrompt || ""), res.content, "groq", userId);
        return res;
      } else if (provider === "gemini") {
        if (!geminiApiKey?.trim()) throw new Error("Gemini API key not configured. Please add it in Settings > AI Models.");
        const res = await this.generateGemini(prompt, systemPrompt, geminiApiKey);
        this.updateUsage(prompt + (systemPrompt || ""), res.content, "gemini", userId);
        return res;
      } else {
        return await this.generateOllama(prompt, systemPrompt, ollamaUrl || "http://localhost:11434");
      }
    } catch (e: any) {
      console.error(`LLM Generation error (${provider}):`, e);
      return { content: "", provider, error: e.message || "Unknown error occurred" };
    }
  }

  private updateUsage(prompt: string, response: string, provider: string, userId?: string | number) {
    if (typeof window === "undefined" || provider === "ollama") return; // Local is free
    const chars = prompt.length + response.length;
    const estTokens = Math.ceil(chars / 4);
    
    // Approximate cost per 1M tokens: Groq (Llama3-8b) ~$0.05, Gemini (Pro) ~$0.50
    let costPerToken = 0;
    if (provider === "groq") costPerToken = 0.05 / 1000000;
    if (provider === "gemini") costPerToken = 0.50 / 1000000;
    
    const tokensKey = getStorageKey("llm_tokens", userId);
    const costKey = getStorageKey("llm_cost", userId);
    
    const currentTokens = parseInt(localStorage.getItem(tokensKey) || "0");
    const currentCost = parseFloat(localStorage.getItem(costKey) || "0");
    
    localStorage.setItem(tokensKey, (currentTokens + estTokens).toString());
    localStorage.setItem(costKey, (currentCost + (estTokens * costPerToken)).toFixed(6));
    
    window.dispatchEvent(new Event("llm_usage_updated"));
  }

  private async generateGroq(prompt: string, systemPrompt: string = "", apiKey: string): Promise<LLMResponse> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Default lightweight model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API Error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    return {
      content,
      provider: "groq"
    };
  }

  private async generateGemini(prompt: string, systemPrompt: string = "", apiKey: string): Promise<LLMResponse> {
    // Note: Gemini API format uses contents array
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    // Simplistic system prompt implementation for Gemini (by prepending)
    const fullPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;
    
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7 }
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.candidates[0].content.parts[0].text;
    return {
      content,
      provider: "gemini"
    };
  }

  private async generateOllama(prompt: string, systemPrompt: string = "", baseUrl: string): Promise<LLMResponse> {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3:4b",
        prompt: prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama API Error: ${res.status}. Is Ollama running locally?`);
    }

    const data = await res.json();
    return {
      content: data.response,
      provider: "ollama"
    };
  }
}

// Export a singleton instance for frontend use
export const frontendLLM = new FrontendLLM();
