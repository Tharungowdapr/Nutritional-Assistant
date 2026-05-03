"use client";

import { useState, useEffect } from "react";
import { Lock, Palette, ShieldCheck, Settings2, Loader2, Sun, Moon, Monitor, Globe, Download, Save, Eye, EyeOff, Brain, AlertTriangle, CheckCircle, ExternalLink, TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { frontendLLM, LLMConfig, LLMProviderType, PROVIDER_MODELS, PROVIDERS, getOllamaModels } from "@/lib/llm-provider";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिंदी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "bn", name: "বাংলা" },
  { code: "mr", name: "मराठी" },
];

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("ai_models");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.profile?.language || "en");

  // AI Config Form
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

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    const config = frontendLLM.getConfig();
    setLlmConfig(config);
    setOllamaUrl(config.baseUrl || "http://localhost:11434");
    setSelectedModel(config.model || "gemma3:4b");
    if (config.apiKey) {
      setApiKey(config.apiKey);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setSelectedLanguage(user.profile?.language || "en");
    }
  }, [user]);

  // Fetch Ollama models when provider is ollama
  useEffect(() => {
    if (llmConfig.provider === "ollama") {
      fetchOllamaModels();
    }
  }, [llmConfig.provider, ollamaUrl]);

  const fetchOllamaModels = async () => {
    setLoadingModels(true);
    try {
      const models = await getOllamaModels(ollamaUrl);
      setOllamaModels(models.length > 0 ? models : []);
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
      toast.success("AI Configuration saved");
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
      const config: LLMConfig = {
        provider: llmConfig.provider,
        model: selectedModel,
        apiKey: llmConfig.provider !== "ollama" ? apiKey : undefined,
        baseUrl: llmConfig.provider === "ollama" ? ollamaUrl : undefined,
      };
      const result = await frontendLLM.testConnection(config);
      setTestResult(result);
      if (result.success) {
        toast.success(`Connection successful (${result.latency}ms)`);
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error(err.message || "Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setIsLoading(true);
    try {
      await authApi.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const data = { user, exported_at: new Date().toISOString() };
    const jsonString = JSON.stringify(data, null, 2);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(jsonString));
    element.setAttribute("download", `nutrisync-data-${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Data exported successfully");
  };

  const currentProvider = PROVIDERS.find(p => p.id === llmConfig.provider);
  const currentModels = llmConfig.provider === "ollama" && ollamaModels.length > 0 
    ? ollamaModels 
    : PROVIDER_MODELS[llmConfig.provider] || [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">Manage your application settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: "ai_models", label: "AI Models", icon: Brain },
          { id: "preferences", label: "Preferences", icon: Palette },
          { id: "security", label: "Security", icon: Lock },
          { id: "privacy", label: "Privacy", icon: ShieldCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI MODELS */}
      {activeTab === "ai_models" && (
        <Card>
          <CardHeader>
            <CardTitle>AI Provider Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <strong>Keys are stored locally.</strong> Your API keys never touch our backend. They are stored securely in your browser's localStorage.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select AI Provider</label>
              <div className="grid grid-cols-3 gap-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setLlmConfig({...llmConfig, provider: p.id as LLMProviderType});
                      setSelectedModel(p.defaultModel);
                      setTestResult(null);
                    }}
                    className={cn(
                      "p-3 rounded-xl border-2 text-sm font-semibold transition-all",
                      llmConfig.provider === p.id 
                        ? "border-primary bg-primary/5 text-primary" 
                        : "border-border hover:border-primary/40 bg-card text-muted-foreground"
                    )}
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
                  <select 
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background"
                    value={selectedModel}
                    onChange={(e) => { setSelectedModel(e.target.value); setTestResult(null); }}
                  >
                    {currentModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.context})</option>
                    ))}
                  </select>
                  {llmConfig.provider === "ollama" && (
                    <button 
                      onClick={fetchOllamaModels}
                      className="text-xs text-primary hover:underline mt-1"
                    >
                      Refresh Ollama models
                    </button>
                  )}
                </>
              )}
            </div>

            {llmConfig.provider !== "ollama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                    placeholder={currentProvider?.placeholder || ""}
                    className="h-12 pr-10"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a href={currentProvider?.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {currentProvider?.name} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
            )}

            {llmConfig.provider === "ollama" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Ollama Base URL</label>
                <Input 
                  value={ollamaUrl} 
                  onChange={(e) => { setOllamaUrl(e.target.value); setTestResult(null); }}
                  placeholder="http://localhost:11434"
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">Make sure Ollama is running locally with OLLAMA_ORIGINS="*".</p>
              </div>
            )}

            {testResult && (
              <div className={`p-4 rounded-xl flex gap-3 text-sm ${
                testResult.success 
                  ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" 
                  : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
              }`}>
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
                Save Configuration
              </Button>
              <Button 
                onClick={handleTestConnection} 
                disabled={isTesting || (llmConfig.provider !== "ollama" && !apiKey.trim())} 
                variant="outline"
                className="px-6 h-12"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TestTube className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PREFERENCES */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                      theme === t.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 bg-card"
                    )}
                  >
                    <t.icon className={cn("w-6 h-6", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-bold", theme === t.id ? "text-primary" : "text-muted-foreground")}>{t.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-background"
              >
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => updateProfile({ language: selectedLanguage })}
              >
                Save Language Preference
              </Button>
              <p className="text-xs text-muted-foreground">Localized content for regional dialects is updated weekly.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECURITY */}
      {activeTab === "security" && (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Password</label>
                  <div className="relative">
                    <Input 
                      type={showPwd.current ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="h-12 pr-12"
                    />
                    <button type="button" onClick={() => setShowPwd({...showPwd, current: !showPwd.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">New Password</label>
                    <div className="relative">
                      <Input 
                        type={showPwd.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="h-12 pr-12"
                      />
                      <button type="button" onClick={() => setShowPwd({...showPwd, new: !showPwd.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPwd.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Confirm Password</label>
                    <div className="relative">
                      <Input 
                        type={showPwd.confirm ? "text" : "password"}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="h-12 pr-12"
                      />
                      <button type="button" onClick={() => setShowPwd({...showPwd, confirm: !showPwd.confirm})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPwd.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="h-12 px-8">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* PRIVACY */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
                {[
                  "Health data is encrypted at rest",
                  "Personal info is never sold to third parties",
                  "You have full control over your food logs",
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-foreground/80">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    {p}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Your Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleExportData} className="w-full h-14 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all">
                <Download className="w-5 h-5 mr-3" />
                Download My NutriSync Data
              </Button>
            </CardContent>
          </Card>

          <div className="pt-10 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-[0.2em]">Danger Zone</p>
            <Button variant="ghost" className="text-destructive hover:bg-destructive/5 hover:text-destructive text-xs font-bold uppercase tracking-widest px-8">
              Delete NutriSync Account
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
