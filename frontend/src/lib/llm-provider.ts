import { getStorageKey } from "./utils";
import { LLMClient, type LLMConfig as ClientLLMConfig, type LLMProvider, getOllamaModels as fetchOllamaModels, PROVIDER_MODELS } from "./llm-client";

export type LLMProviderType = LLMProvider;

export interface LLMConfig extends ClientLLMConfig {
  provider: LLMProviderType;
}

export { PROVIDER_MODELS } from "./llm-client";

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
