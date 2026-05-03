import { getStorageKey } from "./utils";
import { LLMClient, type LLMConfig as ClientLLMConfig, getOllamaModels as fetchOllamaModels } from "./llm-client";

export type LLMProviderType = 
  | "openai" 
  | "anthropic" 
  | "groq" 
  | "gemini" 
  | "cohere" 
  | "ollama" 
  | "openrouter" 
  | "mistral" 
  | "together";

export interface LLMConfig extends ClientLLMConfig {
  provider: LLMProviderType;
}

// Define PROVIDER_MODELS locally to avoid circular reference
export const PROVIDER_MODELS: Record<LLMProviderType, { id: string; name: string; context: string }[]> = {
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

export const PROVIDERS = [
  { id: "ollama" as LLMProviderType, name: "Ollama (Local)", tier: "Free", defaultModel: "gemma3:4b", link: "https://ollama.ai", placeholder: "http://localhost:11434" },
  { id: "gemini" as LLMProviderType, name: "Google Gemini", tier: "Free", defaultModel: "gemini-1.5-flash", link: "https://aistudio.google.com/app/apikey", placeholder: "AIza..." },
  { id: "groq" as LLMProviderType, name: "Groq", tier: "Free", defaultModel: "llama-3.1-8b-instant", link: "https://console.groq.com/keys", placeholder: "gsk_..." },
  { id: "openai" as LLMProviderType, name: "OpenAI", tier: "Paid", defaultModel: "gpt-4o-mini", link: "https://platform.openai.com/api-keys", placeholder: "sk-..." },
  { id: "anthropic" as LLMProviderType, name: "Claude", tier: "Paid", defaultModel: "claude-3-haiku-20240307", link: "https://console.anthropic.com/settings/keys", placeholder: "sk-ant-..." },
  { id: "openrouter" as LLMProviderType, name: "OpenRouter", tier: "Free+", defaultModel: "meta-llama/llama-3.1-8b-instruct:free", link: "https://openrouter.ai/keys", placeholder: "sk-or-..." },
  { id: "mistral" as LLMProviderType, name: "Mistral AI", tier: "Trial", defaultModel: "mistral-small-latest", link: "https://console.mistral.ai/api-keys", placeholder: "" },
  { id: "together" as LLMProviderType, name: "Together AI", tier: "Free+", defaultModel: "meta-llama/Llama-3-70b-chat-hf", link: "https://api.together.ai/settings/api-keys", placeholder: "" },
  { id: "cohere" as LLMProviderType, name: "Cohere", tier: "Free", defaultModel: "command-r", link: "https://dashboard.cohere.com/api-keys", placeholder: "" },
];

export interface LLMResponse {
  content: string;
  provider: LLMProviderType;
  error?: string;
}

// Re-export getOllamaModels
export const getOllamaModels = fetchOllamaModels;

export class FrontendLLM {
  private config: LLMConfig;
  private client: LLMClient;
  private userId: string | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.client = new LLMClient(this.config);
  }

  public setUser(userId: string | undefined) {
    if (this.userId === userId) return;
    this.userId = userId || null;
    this.config = this.loadConfig();
    this.client = new LLMClient(this.config);
  }

  private loadConfig(): LLMConfig {
    const defaultConfig: LLMConfig = { 
      provider: "ollama", 
      model: "gemma3:4b",
      baseUrl: "http://localhost:11434"
    };

    if (typeof window === "undefined") return defaultConfig;
    
    const key = this.userId ? getStorageKey("nutrisync_llm_config", this.userId) : "nutrisync_llm_config";
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...defaultConfig, ...parsed };
      } catch (e) {
        console.error("Failed to parse LLM config", e);
      }
    }
    return defaultConfig;
  }

  public saveConfig(config: LLMConfig) {
    this.config = config;
    this.client = new LLMClient(this.config);
    if (typeof window !== "undefined") {
      const key = this.userId ? getStorageKey("nutrisync_llm_config", this.userId) : "nutrisync_llm_config";
      localStorage.setItem(key, JSON.stringify(config));
      window.dispatchEvent(new Event("llm_config_updated"));
    }
  }

  public getConfig(): LLMConfig {
    return this.config;
  }

  public async generate(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    try {
      const content = await this.client.complete(prompt, systemPrompt);
      return { content, provider: this.config.provider };
    } catch (e: any) {
      console.error(`LLM Generation error (${this.config.provider}):`, e);
      return { content: "", provider: this.config.provider, error: e.message || "Unknown error" };
    }
  }

  public async testConnection(config?: LLMConfig): Promise<{ success: boolean; latency?: number; error?: string }> {
    const client = config ? new LLMClient(config) : this.client;
    return client.testConnection();
  }
}

export const frontendLLM = new FrontendLLM();
