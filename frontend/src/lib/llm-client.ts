/**
 * Unified LLM Client
 * Supports: OpenAI, Anthropic (Claude), Groq, Google Gemini, Cohere, Ollama, OpenRouter, Mistral, Together
 */

import { apiFetch } from "@/lib/api";

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
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      // Use raw fetch (no auth) — this endpoint doesn't require it, and sending
      // an expired/invalid token would cause a 401 even for anonymous access.
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/v1/llm/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          systemPrompt: systemPrompt,
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`LLM request failed (${res.status}): ${err}`);
      }
      const data = await res.json();
      return data.answer || "";
    } catch (error: any) {
      console.error(`LLM Proxy Error (${this.config.provider}):`, error);
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await apiFetch("/api/v1/llm/test", {
        method: "POST",
        body: JSON.stringify({
          provider: this.config.provider,
          model: this.config.model,
          apiKey: this.config.apiKey,
          baseUrl: this.config.baseUrl,
        }),
      });
      const latency = Date.now() - start;
      if (response.success) {
        return { success: true, latency };
      } else {
        return { success: false, error: response.error, latency };
      }
    } catch (error: any) {
      return { success: false, error: error.message, latency: Date.now() - start };
    }
  }
}

export async function getOllamaModels(baseUrl?: string): Promise<{ id: string; name: string; context: string }[]> {
  try {
    // Call backend to probe Ollama models (fixes Docker network issues)
    const response = await apiFetch("/api/settings/llm-providers/ollama/models");
    return (response.models || []).map((name: string) => ({ 
      id: name, 
      name, 
      context: "local" 
    }));
  } catch (error) {
    console.warn("Failed to fetch Ollama models from backend:", error);
    return [];
  }
}
