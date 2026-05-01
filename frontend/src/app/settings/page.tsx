"use client";

import { useState, useEffect } from "react";
import { User, Lock, Palette, ShieldCheck, Settings2, Loader2, Sun, Moon, Monitor, Globe, Download, Save, Eye, EyeOff, Brain, Leaf, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { SettingsLayout, SettingsCard } from "@/components/settings-layout";
import { cn } from "@/lib/utils";

import { frontendLLM, LLMConfig } from "@/lib/llm-provider";

const SIDEBAR_ITEMS = [
  { id: "account", label: "Account", icon: User },
  { id: "diet_profile", label: "Diet Profile", icon: Leaf },
  { id: "security", label: "Security", icon: Lock },
  { id: "ai_models", label: "AI Models", icon: Brain },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "privacy", label: "Privacy & Data", icon: ShieldCheck },
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "हिंदी" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "bn", name: "বাংলা" },
  { code: "mr", name: "मराठी" },
];

export default function RebuiltSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.profile?.language || "en");
  
  // Account Form
  const [nameForm, setNameForm] = useState(user?.name || "");

  // Diet Profile Form
  const [dietForm, setDietForm] = useState({
    diet_type: user?.profile?.diet_type || "VEG",
    goal: user?.profile?.goal || "Maintenance",
    allergies: user?.profile?.conditions?.join(", ") || "",
  });

  // AI Config Form
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ provider: "ollama" });
  
  // Load initial LLM config on mount
  useEffect(() => {
    setLlmConfig(frontendLLM.getConfig());
  }, []);

  const handleSaveLlmConfig = () => {
    frontendLLM.saveConfig(llmConfig);
    toast.success("AI Configuration saved locally");
  };

  const handleSaveDietProfile = async () => {
    setIsLoading(true);
    try {
      const conditions = dietForm.allergies.split(",").map((s: string) => s.trim()).filter(Boolean);
      await updateProfile({ 
        diet_type: dietForm.diet_type,
        goal: dietForm.goal,
        conditions: conditions
      });
      toast.success("Diet profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleUpdateName = async () => {
    if (!nameForm.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile({ name: nameForm });
      toast.success("Name updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setIsLoading(false);
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

  if (!user) return null;

  return (
    <SettingsLayout
      title="Settings"
      description="Manage your account settings, security, and preferences."
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* ACCOUNT */}
      {activeTab === "account" && (
        <SettingsCard title="Profile Information" description="How you appear to the system.">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Email Address</label>
              <Input value={user.email} disabled className="bg-muted text-muted-foreground h-12" />
              <p className="text-xs text-muted-foreground mt-2">Your email address is used for secure login and account recovery.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <div className="flex gap-3">
                <Input 
                  value={nameForm} 
                  onChange={(e) => setNameForm(e.target.value)} 
                  className="h-12"
                  placeholder="Enter your full name"
                />
                <Button onClick={handleUpdateName} disabled={isLoading} className="px-6 h-12">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </SettingsCard>
      )}

      {/* DIET PROFILE */}
      {activeTab === "diet_profile" && (
        <SettingsCard title="Dietary Preferences" description="Help the AI personalize your meals and recipes.">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Diet Type</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background"
                  value={dietForm.diet_type}
                  onChange={(e) => setDietForm({...dietForm, diet_type: e.target.value})}
                >
                  <option value="VEG">Vegetarian</option>
                  <option value="NON-VEG">Non-Vegetarian</option>
                  <option value="VEGAN">Vegan</option>
                  <option value="PESCATARIAN">Pescatarian</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Goal</label>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background"
                  value={dietForm.goal}
                  onChange={(e) => setDietForm({...dietForm, goal: e.target.value})}
                >
                  <option value="Maintenance">Maintain Weight</option>
                  <option value="Weight Loss">Weight Loss</option>
                  <option value="Muscle Gain">Muscle Gain</option>
                  <option value="General Health">General Health</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Allergies & Conditions</label>
              <Input 
                value={dietForm.allergies} 
                onChange={(e) => setDietForm({...dietForm, allergies: e.target.value})} 
                placeholder="e.g. Peanut allergy, Lactose intolerant, Diabetes" 
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list. Used to filter out dangerous ingredients.</p>
            </div>
            
            <Button onClick={handleSaveDietProfile} disabled={isLoading} className="px-6 h-12 w-full md:w-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </div>
        </SettingsCard>
      )}

      {/* SECURITY */}
      {activeTab === "security" && (
        <SettingsCard title="Password" description="Ensure your account is protected with a strong password.">
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
                  <button type="button" onClick={() => setShowPwd({...showPwd, current: !showPwd.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
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
                    <button type="button" onClick={() => setShowPwd({...showPwd, new: !showPwd.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                    <button type="button" onClick={() => setShowPwd({...showPwd, confirm: !showPwd.confirm})} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
        </SettingsCard>
      )}

      {/* AI MODELS */}
      {activeTab === "ai_models" && (
        <div className="space-y-6">
          <SettingsCard title="AI Provider Configuration" description="Configure which AI generates your meal plans and recipes.">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6 flex gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-sm">
                <strong>Keys are stored locally.</strong> Your API keys never touch our backend database. They are stored securely in your browser's localStorage and used directly for requests.
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Active Provider</label>
                <div className="grid grid-cols-3 gap-4">
                  {(["ollama", "groq", "gemini"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setLlmConfig({...llmConfig, provider: p})}
                      className={cn(
                        "p-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all",
                        llmConfig.provider === p 
                          ? "border-primary bg-primary/5 text-primary" 
                          : "border-border hover:border-primary/40 bg-card text-muted-foreground"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {llmConfig.provider === "ollama" && (
                <div className="space-y-2 fade-in">
                  <label className="text-sm font-medium">Ollama Base URL</label>
                  <Input 
                    value={llmConfig.ollamaUrl || ""} 
                    onChange={(e) => setLlmConfig({...llmConfig, ollamaUrl: e.target.value})} 
                    placeholder="http://localhost:11434"
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">Make sure you have started Ollama with OLLAMA_ORIGINS="*" if running locally.</p>
                </div>
              )}

              {llmConfig.provider === "groq" && (
                <div className="space-y-2 fade-in">
                  <label className="text-sm font-medium">Groq API Key</label>
                  <Input 
                    type="password"
                    value={llmConfig.groqApiKey || ""} 
                    onChange={(e) => setLlmConfig({...llmConfig, groqApiKey: e.target.value})} 
                    placeholder="gsk_..."
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">Get your free key at console.groq.com. We use the llama3-8b-8192 model.</p>
                </div>
              )}

              {llmConfig.provider === "gemini" && (
                <div className="space-y-2 fade-in">
                  <label className="text-sm font-medium">Google Gemini API Key</label>
                  <Input 
                    type="password"
                    value={llmConfig.geminiApiKey || ""} 
                    onChange={(e) => setLlmConfig({...llmConfig, geminiApiKey: e.target.value})} 
                    placeholder="AIzaSy..."
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">Get your key from Google AI Studio. Uses gemini-pro.</p>
                </div>
              )}

              <Button onClick={handleSaveLlmConfig} className="px-6 h-12">
                <Save className="w-4 h-4 mr-2" />
                Save AI Configuration
              </Button>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* PREFERENCES */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <SettingsCard title="Appearance" description="Choose how NutriSync looks for you.">
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
          </SettingsCard>

          <SettingsCard title="Language & Region" description="Select your preferred language.">
            <div className="space-y-4">
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-background"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => updateProfile({ language: selectedLanguage })}
                className="mt-2"
              >
                Save Language Preference
              </Button>
              <p className="text-xs text-muted-foreground">Localized content for regional dialects is updated weekly.</p>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* PRIVACY */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          <SettingsCard title="Data Policy" description="How we handle your personal information.">
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
          </SettingsCard>

          <SettingsCard title="Export Your Data" description="Download a copy of your records in JSON format.">
            <Button variant="outline" onClick={handleExportData} className="w-full h-14 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all">
              <Download className="w-5 h-5 mr-3" />
              Download My NutriSync Data
            </Button>
          </SettingsCard>

          <div className="pt-10 flex flex-col items-center">
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-[0.2em]">Safety</p>
            <Button variant="ghost" className="text-destructive hover:bg-destructive/5 hover:text-destructive text-xs font-bold uppercase tracking-widest px-8">
              Delete NutriSync Account
            </Button>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
