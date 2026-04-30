"use client";
import { useState } from "react";
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Cpu, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ProviderConfig {
  provider: string;
  model: string;
  api_key: string;
  is_active: boolean;
  latency_ms?: number;
}

const PROVIDERS = [
  { id: "groq",       name: "Groq",         tier: "Free",   models: ["llama3-70b-8192","llama3-8b-8192","mixtral-8x7b-32768","gemma2-9b-it"], link: "https://console.groq.com/keys",        placeholder: "gsk_..." },
  { id: "gemini",     name: "Gemini",        tier: "Free",   models: ["gemini-1.5-flash","gemini-1.5-pro","gemini-2.0-flash"],                 link: "https://aistudio.google.com/app/apikey", placeholder: "AIza..." },
  { id: "anthropic",  name: "Claude",        tier: "Paid",   models: ["claude-haiku-4-5","claude-sonnet-4-5","claude-opus-4"],                 link: "https://console.anthropic.com/settings/keys", placeholder: "sk-ant-..." },
  { id: "openrouter", name: "OpenRouter",    tier: "Free+",  models: ["meta-llama/llama-3.1-8b-instruct:free","mistralai/mistral-7b-instruct:free","qwen/qwen-2-7b-instruct:free"], link: "https://openrouter.ai/keys", placeholder: "sk-or-..." },
  { id: "mistral",    name: "Mistral AI",    tier: "Trial",  models: ["mistral-small-latest","mixtral-8x22b-instruct","open-mistral-7b"],       link: "https://console.mistral.ai/api-keys",    placeholder: "..." },
  { id: "together",   name: "Together AI",   tier: "Free+",  models: ["meta-llama/Llama-3-70b-chat-hf","Qwen/Qwen2.5-72B-Instruct"],            link: "https://api.together.ai/settings/api-keys", placeholder: "..." },
  { id: "cohere",     name: "Cohere",        tier: "Free",   models: ["command-r","command-r-plus"],                                             link: "https://dashboard.cohere.com/api-keys", placeholder: "..." },
  { id: "ollama",     name: "Ollama (local)",tier: "Free",   models: ["gemma3:4b","llama3.2:3b","phi4-mini","mistral:7b","deepseek-r1:7b"],      link: "https://ollama.ai",                     placeholder: "http://localhost:11434" },
];

const TIER_COLORS: Record<string, string> = {
  "Free":  "bg-green-500/10 text-green-700 dark:text-green-400",
  "Free+": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  "Paid":  "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  "Trial": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function LLMProvidersSettings({ savedConfigs = [] }: { savedConfigs?: ProviderConfig[] }) {
  const [configs, setConfigs] = useState<Record<string, { key: string; model: string; show: boolean }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latency?: number; error?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(
    savedConfigs.find(c => c.is_active)?.provider || null
  );

  const cfg = (id: string) => configs[id] || { key: "", model: PROVIDERS.find(p => p.id === id)?.models[0] || "", show: false };

  const updateCfg = (id: string, updates: Partial<{ key: string; model: string; show: boolean }>) => {
    setConfigs(prev => ({ ...prev, [id]: { ...cfg(id), ...updates } }));
  };

  const testConnection = async (providerId: string) => {
    const { key, model } = cfg(providerId);
    if (!key.trim() && providerId !== "ollama") return;
    setTesting(providerId);
    try {
      const result = await apiFetch<{ valid: boolean; latency_ms: number; error?: string }>("/api/settings/llm-providers/test", {
        method: "POST",
        body: JSON.stringify({ provider: providerId, api_key: key, model }),
      });
      setTestResults(prev => ({ ...prev, [providerId]: { ok: result.valid, latency: result.latency_ms, error: result.error } }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [providerId]: { ok: false, error: e.message } }));
    } finally {
      setTesting(null);
    }
  };

  const saveProvider = async (providerId: string) => {
    const { key, model } = cfg(providerId);
    setSaving(providerId);
    try {
      await apiFetch("/api/settings/llm-providers", {
        method: "PUT",
        body: JSON.stringify({ provider: providerId, api_key: key, model }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const setActive = async (providerId: string) => {
    try {
      await apiFetch(`/api/settings/llm-providers/${providerId}/activate`, { method: "PUT" });
      setActiveProvider(providerId);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-base mb-1">AI Provider</h3>
        <p className="text-sm text-muted-foreground mb-4">Configure which LLM powers your chat, meal plans, and recipe generation. Your API keys are encrypted at rest.</p>
      </div>

      {PROVIDERS.map(p => {
        const c = cfg(p.id);
        const saved = savedConfigs.find(s => s.provider === p.id);
        const result = testResults[p.id];
        const isActive = activeProvider === p.id;

        return (
          <div key={p.id} className={`border rounded-xl p-4 transition-all ${isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier]}`}>{p.tier}</span>
                    {isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">Active</span>}
                    {saved && !isActive && <span className="text-[10px] text-green-600 font-medium">Saved</span>}
                  </div>
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    Get API key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
              {result && (
                <div className="flex items-center gap-1 text-xs shrink-0">
                  {result.ok ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-green-600">{result.latency}ms</span></>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-red-500">Failed</span></>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                  {p.id === "ollama" ? "Base URL" : "API Key"}
                </label>
                <div className="relative">
                  <input
                    type={c.show ? "text" : "password"}
                    value={c.key}
                    onChange={e => updateCfg(p.id, { key: e.target.value })}
                    placeholder={saved ? "••••••••••••••••" : p.placeholder}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background pr-9 outline-none focus:border-primary"
                  />
                  <button onClick={() => updateCfg(p.id, { show: !c.show })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {c.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Model</label>
                <select value={c.model} onChange={e => updateCfg(p.id, { model: e.target.value })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background outline-none focus:border-primary">
                  {p.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => testConnection(p.id)}
                disabled={testing === p.id || (!c.key.trim() && p.id !== "ollama")}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {testing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Test Connection
              </button>
              <button
                onClick={() => saveProvider(p.id)}
                disabled={saving === p.id || !c.key.trim()}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save
              </button>
              {(saved || result?.ok) && !isActive && (
                <button
                  onClick={() => setActive(p.id)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Set as Default
                </button>
              )}
              {isActive && (
                <span className="flex items-center gap-1 text-xs text-primary font-medium px-2">
                  <CheckCircle className="w-3 h-3" /> Currently active
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
