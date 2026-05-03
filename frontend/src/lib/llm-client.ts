/**
 * Unified LLM Client
 * Supports: OpenAI, Anthropic (Claude), Groq, Google Gemini, Cohere, Ollama, OpenRouter, Mistral, Together
 */

export type LLMProvider = 
  | "openai" 
  | "anthropic" 
  | "groq" 
  | "gemini" 
  | "cohere" 
  | "ollama" 
  | "openrouter" 
  | "mistral" 
  | "together";

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export const PROVIDER_DEFAULTS: Record<LLMProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-haiku-20240307",
  groq: "llama-3.1-8b-instant",
  gemini: "gemini-1.5-flash",
  cohere: "command-r",
  ollama: "gemma3:4b",
  openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  mistral: "mistral-small-latest",
  together: "meta-llama/Llama-3-70b-chat-hf",
};

export const PROVIDER_MODELS: Record<LLMProvider, { id: string; name: string; context: string }[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Best)", context: "128k" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast, Cheap)", context: "128k" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", context: "128k" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Fastest)", context: "16k" },
  ],
  anthropic: [
    { id: "claude-opus-4-5", name: "Claude Opus 4.5 (Best)", context: "200k" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5 (Balanced)", context: "200k" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku (Fast)", context: "200k" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Best)", context: "128k" },
    { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", context: "128k" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fastest)", context: "128k" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", context: "32k" },
    { id: "gemma2-9b-it", name: "Gemma2 9B", context: "8k" },
  ],
  gemini: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Best)", context: "1M" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fast)", context: "1M" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: "1M" },
  ],
  cohere: [
    { id: "command-r-plus", name: "Command R+ (Best)", context: "128k" },
    { id: "command-r", name: "Command R (Balanced)", context: "128k" },
    { id: "command", name: "Command (Fast)", context: "4k" },
  ],
  ollama: [], 
  openrouter: [
    { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B (Free)", context: "128k" },
    { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)", context: "32k" },
    { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)", context: "8k" },
    { id: "microsoft/phi-3-mini-128k-instruct:free", name: "Phi-3 Mini (Free)", context: "128k" },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large (Best)", context: "128k" },
    { id: "mistral-small-latest", name: "Mistral Small", context: "128k" },
    { id: "open-mistral-7b", name: "Mistral 7B", context: "32k" },
  ],
  together: [
    { id: "meta-llama/Llama-3-70b-chat-hf", name: "Llama 3 70B", context: "8k" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", context: "32k" },
    { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B", context: "32k" },
  ],
};

export class LLMClient {
  private provider: LLMProvider;
  private model: string;
  private apiKey?: string;
  private baseUrl: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    this.provider = config.provider;
    this.model = config.model || PROVIDER_DEFAULTS[config.provider];
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    switch (this.provider) {
      case "openai":
      case "groq":
      case "openrouter":
      case "mistral":
      case "together":
        return this.completeOpenAI(prompt, systemPrompt);
      case "anthropic":
        return this.completeAnthropic(prompt, systemPrompt);
      case "gemini":
        return this.completeGemini(prompt, systemPrompt);
      case "cohere":
        return this.completeCohere(prompt, systemPrompt);
      case "ollama":
        return this.completeOllama(prompt, systemPrompt);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const result = await this.complete("Say 'OK' in exactly one word.", "You are a helpful assistant.");
      const latency = Date.now() - start;
      return { success: result.length > 0, latency };
    } catch (error: any) {
      return { success: false, error: error.message, latency: Date.now() - start };
    }
  }

  private async completeOpenAI(prompt: string, system?: string): Promise<string> {
    const messages: any[] = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const baseUrls: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      groq: "https://api.groq.com/openai/v1",
      openrouter: "https://openrouter.ai/api/v1",
      mistral: "https://api.mistral.ai/v1",
      together: "https://api.together.xyz/v1",
    };

    const base = baseUrls[this.provider] || "https://api.openai.com/v1";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
    };
    
    if (this.provider === "openrouter") {
      headers["HTTP-Referer"] = "http://localhost:3000";
      headers["X-Title"] = "NutriSync";
    }

    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  private async completeAnthropic(prompt: string, system?: string): Promise<string> {
    const payload: any = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    };
    if (system) payload.system = system;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey || "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }

  private async completeGemini(prompt: string, system?: string): Promise<string> {
    if (!this.apiKey) throw new Error("Gemini API key not configured");
    const fullPrompt = system ? `System: ${system}\n\nUser: ${prompt}` : prompt;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: this.temperature, maxOutputTokens: this.maxTokens },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  private async completeCohere(prompt: string, system?: string): Promise<string> {
    const payload: any = {
      model: this.model,
      message: prompt,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    };
    if (system) payload.preamble = system;

    const response = await fetch("https://api.cohere.ai/v1/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Cohere API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  }

  private async completeOllama(prompt: string, system?: string): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/generate`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        system: system || "",
        stream: false,
        options: { temperature: this.temperature, num_predict: this.maxTokens },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.status}. Is Ollama running at ${this.baseUrl}?`);
    }

    const data = await response.json();
    return data.response || "";
  }
}

export async function getOllamaModels(baseUrl: string = "http://localhost:11434"): Promise<{ id: string; name: string; context: string }[]> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.models || []).map((m: any) => ({ 
      id: m.name, 
      name: m.name, 
      context: "varies" 
    }));
  } catch {
    return [];
  }
}
