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

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): LLMConfig {
    if (typeof window === "undefined") return { provider: "ollama", ollamaUrl: "http://localhost:11434" };
    
    const stored = localStorage.getItem("nutrisync_llm_config");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse LLM config", e);
      }
    }
    return { provider: "ollama", ollamaUrl: "http://localhost:11434" };
  }

  public saveConfig(config: LLMConfig) {
    this.config = config;
    if (typeof window !== "undefined") {
      localStorage.setItem("nutrisync_llm_config", JSON.stringify(config));
    }
  }

  public getConfig(): LLMConfig {
    return this.config;
  }

  public async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const { provider, groqApiKey, geminiApiKey, ollamaUrl } = this.config;

    try {
      if (provider === "groq") {
        if (!groqApiKey) throw new Error("Groq API key not configured");
        return await this.generateGroq(prompt, systemPrompt, groqApiKey);
      } else if (provider === "gemini") {
        if (!geminiApiKey) throw new Error("Gemini API key not configured");
        return await this.generateGemini(prompt, systemPrompt, geminiApiKey);
      } else {
        return await this.generateOllama(prompt, systemPrompt, ollamaUrl || "http://localhost:11434");
      }
    } catch (e: any) {
      console.error(`LLM Generation error (${provider}):`, e);
      return { content: "", provider, error: e.message || "Unknown error occurred" };
    }
  }

  private updateUsage(prompt: string, response: string, provider: string) {
    if (typeof window === "undefined" || provider === "ollama") return; // Local is free
    const chars = prompt.length + response.length;
    const estTokens = Math.ceil(chars / 4);
    
    // Approximate cost per 1M tokens: Groq (Llama3-8b) ~$0.05, Gemini (Pro) ~$0.50
    let costPerToken = 0;
    if (provider === "groq") costPerToken = 0.05 / 1000000;
    if (provider === "gemini") costPerToken = 0.50 / 1000000;
    
    const currentTokens = parseInt(localStorage.getItem("llm_tokens") || "0");
    const currentCost = parseFloat(localStorage.getItem("llm_cost") || "0");
    
    localStorage.setItem("llm_tokens", (currentTokens + estTokens).toString());
    localStorage.setItem("llm_cost", (currentCost + (estTokens * costPerToken)).toFixed(6));
    
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
    this.updateUsage(prompt + systemPrompt, content, "groq");
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
    this.updateUsage(fullPrompt, content, "gemini");
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
        model: "llama3", // Adjust as necessary
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
