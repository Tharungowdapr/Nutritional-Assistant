"use client";

import { Sun, Moon, Monitor, Globe } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English" }, { code: "hi", name: "हिंदी" }, { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" }, { code: "bn", name: "বাংলা" }, { code: "mr", name: "मराठी" },
];

export default function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile } = useAuth();
  const selectedLanguage = user?.profile?.language || "en";

  const saveLanguage = async (lang: string) => {
    try {
      await updateProfile({ language: lang });
      toast.success("Language preference saved");
    } catch {
      toast.error("Failed to save language");
    }
  };

  return (
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
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={cn("p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3", theme === t.id ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40 bg-card")}
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
          <select value={selectedLanguage} onChange={(e) => saveLanguage(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-background"
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Localized content for regional dialects is updated weekly.</p>
        </CardContent>
      </Card>
    </div>
  );
}
