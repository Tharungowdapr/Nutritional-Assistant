"use client";

import { useState } from "react";
import { Lock, Palette, ShieldCheck, Settings2, Brain } from "lucide-react";
import AiProviderConfig from "./components/ai-provider-config";
import PreferencesTab from "./components/preferences-tab";
import SecurityTab from "./components/security-tab";
import PrivacyTab from "./components/privacy-tab";

const TABS = [
  { id: "ai_models", label: "AI Models", icon: Brain },
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "security", label: "Security", icon: Lock },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai_models");

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Manage your application settings and preferences</p>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4 inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ai_models" && <AiProviderConfig />}
      {activeTab === "preferences" && <PreferencesTab />}
      {activeTab === "security" && <SecurityTab />}
      {activeTab === "privacy" && <PrivacyTab />}
    </div>
  );
}
