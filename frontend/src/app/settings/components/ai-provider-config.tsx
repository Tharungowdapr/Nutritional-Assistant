"use client";

import { useState, useEffect } from "react";
import { Brain, Loader2, Save, Eye, EyeOff, ExternalLink, TestTube, ShieldCheck, AlertTriangle, CheckCircle, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { frontendLLM, LLMConfig, LLMProviderType, PROVIDER_MODELS, PROVIDERS } from "@/lib/llm-provider";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AiProviderConfig() {
  const { user } = useAuth();
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ provider: "ollama" });
  const [apiKey, setApiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [selectedModel, setSelectedModel] = useState("gemma3:4b");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<{ id: string; name: string; context: string }[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [backendProviders, setBackendProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    const config = frontendLLM.getConfig();
    setLlmConfig(config);
    setOllamaUrl(config.baseUrl || "http://localhost:11434");
    setSelectedModel(config.model || "gemma3:4b");
    if (config.apiKey) setApiKey(config.apiKey);
    fetchBackendProviders();
  }, []);

  const fetchBackendProviders = async () => {
    if (!user) return;
    setLoadingProviders(true);
    try {
      const data = await settingsApi.listProviders();
      setBackendProviders(data.providers || []);
    } catch (err) {
      console.error("Failed to load providers", err);
      toast.error("Failed to load saved providers");
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (llmConfig.provider === "ollama") fetchOllamaModels();
  }, [llmConfig.provider, ollamaUrl]);

  const fetchOllamaModels = async () => {
    setLoadingModels(true);
    try {
      const data = await settingsApi.getOllamaModels();
      setOllamaModels((data.models || []).map((m: string) => ({ id: m, name: m, context: "Local" })));
    } catch {
      setOllamaModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveLlmConfig = async () => {
    setIsSaving(true);
    try {
      const config: LLMConfig = {
        provider: llmConfig.provider,
        model: selectedModel,
        apiKey: llmConfig.provider !== "ollama" ? apiKey : undefined,
        baseUrl: llmConfig.provider === "ollama" ? ollamaUrl : undefined,
      };
      frontendLLM.saveConfig(config);

      if (user && user.id) {
        try {
          await settingsApi.saveProvider({ provider: llmConfig.provider, api_key: apiKey, base_url: llmConfig.provider === "ollama" ? ollamaUrl : undefined, model: selectedModel });
          await settingsApi.activateProvider(llmConfig.provider);
          fetchBackendProviders();
        } catch (backendErr) {
          console.warn("Could not sync to cloud, saved locally only", backendErr);
          toast.info("Saved locally (cloud sync failed)");
          return;
        }
      }
      toast.success("AI Configuration saved and activated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await settingsApi.testProvider({ provider: llmConfig.provider, api_key: apiKey, base_url: llmConfig.provider === "ollama" ? ollamaUrl : undefined, model: selectedModel });
      setTestResult({ success: result.valid, latency: result.latency_ms, error: result.error });
      if (result.valid) toast.success(`Connection successful (${result.latency_ms}ms)`);
      else toast.error(result.error || "Connection failed");
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error(err.message || "Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === llmConfig.provider);
  const currentModels = llmConfig.provider === "ollama" && ollamaModels.length > 0 ? ollamaModels : PROVIDER_MODELS[llmConfig.provider] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex gap-3 text-primary">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div className="text-sm">
            <strong>Enterprise-Grade Security.</strong> Your API keys are encrypted server-side using AES-256 (Fernet) encryption.
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select AI Provider</label>
          <div className="grid grid-cols-3 gap-4">
            {PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => { setLlmConfig({ ...llmConfig, provider: p.id as LLMProviderType }); setSelectedModel(p.defaultModel); setTestResult(null); }}
                className={cn("p-3 rounded-xl border-2 text-sm font-semibold transition-all", llmConfig.provider === p.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 bg-card text-muted-foreground")}
              >
                <div>{p.name}</div>
                <div className="text-[10px] font-normal text-muted-foreground mt-1">{p.tier}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          {loadingModels ? (
            <div className="h-12 flex items-center text-sm text-muted-foreground">Loading models...</div>
          ) : (
            <>
              <select className="w-full h-12 px-4 rounded-xl border border-border bg-background" value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); setTestResult(null); }}>
                {currentModels.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.context})</option>))}
              </select>
              {llmConfig.provider === "ollama" && (
                <button onClick={fetchOllamaModels} className="text-xs text-primary hover:underline mt-1">Refresh Ollama models</button>
              )}
            </>
          )}
        </div>

        {llmConfig.provider !== "ollama" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <div className="relative">
              <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }} placeholder={currentProvider?.placeholder || ""} className="h-12 pr-10" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a href={currentProvider?.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{currentProvider?.name} <ExternalLink className="w-3 h-3 inline" /></a>
            </p>
          </div>
        )}

        {llmConfig.provider === "ollama" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Ollama Base URL</label>
            <Input value={ollamaUrl} onChange={(e) => { setOllamaUrl(e.target.value); setTestResult(null); }} placeholder="http://localhost:11434" className="h-12" />
            <p className="text-xs text-muted-foreground">Make sure Ollama is running locally with OLLAMA_ORIGINS="*".</p>
          </div>
        )}

        {testResult && (
          <div className={`p-4 rounded-xl flex gap-3 text-sm ${testResult.success ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"}`}>
            {testResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <div>
              <strong>{testResult.success ? "Connection Successful" : "Connection Failed"}</strong>
              {testResult.latency && <span className="ml-2">({testResult.latency}ms)</span>}
              {testResult.error && <p className="mt-1 text-xs">{testResult.error}</p>}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSaveLlmConfig} disabled={isSaving} className="px-6 h-12">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save & Set Active
          </Button>
          <Button onClick={handleTestConnection} disabled={isTesting || (llmConfig.provider !== "ollama" && !apiKey.trim())} variant="outline" className="px-6 h-12">
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
            Test Connection
          </Button>
        </div>

        {loadingProviders ? (
          <div className="pt-6 border-t">
            <label className="text-sm font-medium mb-4 block">Securely Saved Providers</label>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-border bg-card/50 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : backendProviders.length > 0 && (
          <div className="pt-6 border-t">
            <label className="text-sm font-medium mb-4 block">Securely Saved Providers</label>
            <div className="space-y-3">
              {backendProviders.map((bp) => (
                <div key={bp.provider} className={cn("p-4 rounded-2xl border flex items-center justify-between", bp.is_active ? "border-primary bg-primary/5" : "border-border bg-card/50")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", bp.is_active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold capitalize flex items-center gap-2">
                        {bp.provider}
                        {bp.is_active && <Badge className="bg-primary text-[10px] h-4">Active</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{bp.model}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!bp.is_active && (
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await settingsApi.activateProvider(bp.provider);
                        frontendLLM.saveConfig({ provider: bp.provider as LLMProviderType, model: bp.model });
                        setLlmConfig({ provider: bp.provider as LLMProviderType, model: bp.model });
                        setSelectedModel(bp.model);
                        setApiKey("********");
                        setTestResult(null);
                        fetchBackendProviders();
                        toast.success(`${bp.provider} set as active`);
                      }}>Activate</Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                      await settingsApi.deleteProvider(bp.provider);
                      fetchBackendProviders();
                      toast.success(`${bp.provider} removed`);
                    }}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
