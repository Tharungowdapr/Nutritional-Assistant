"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Target, Flame, TrendingUp, AlertTriangle, CheckCircle,
  ChevronRight, MapPin, FlaskConical, Pill, Plus,
  Loader2, Activity, Sparkles, Utensils, User, Brain
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { trackerApi, apiFetch } from "@/lib/api";
import { frontendLLM } from "@/lib/llm-provider";
import { MacroRing } from "@/components/macro-ring";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";

const AnalysisSection = dynamic(() => import("@/components/analysis-section").then(m => m.AnalysisSection), { ssr: false });

const pct = (v: number, t: number) => t ? Math.min(100, Math.round((v / t) * 100)) : 0;

const ProgressBar = React.memo(({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) => {
  const p = pct(value, max);
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div style={{ width: `${p}%`, background: color }} className="h-full rounded-full transition-all duration-700 ease-out" />
    </div>
  );
});

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [llmAnalysis, setLlmAnalysis] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return; }
    apiFetch<any>("/api/analysis/customer-profile")
      .then((data) => {
        setProfile(data);
        return data;
      })
      .then((data) => {
        // Generate LLM analysis based on profile
        const p = data;
        if (p?.body_metrics) {
          setLlmLoading(true);
          const prompt = `As a clinical nutritionist, analyze this Indian user's profile and provide a concise health summary (max 150 words):
Age: ${p.profile_summary?.age}, Gender: ${p.profile_summary?.gender}
BMI: ${p.body_metrics?.bmi} (${p.body_metrics?.status}), Weight: ${p.body_metrics?.weight_kg}kg, Height: ${p.body_metrics?.height_cm}cm
TDEE: ${p.body_metrics?.tdee} kcal/day, BMR: ${p.body_metrics?.bmr}
Diet: ${p.profile_summary?.diet_type}, Activity: ${p.profile_summary?.activity_level}
RDA Targets: Energy ${p.rda_match?.energy}kcal, Protein ${p.rda_match?.protein_g}g
Top Risks: ${(p.deficiency_risks || []).slice(0,2).map((r: any) => r.nutrient).join(", ")}
${p.disease_protocol ? `Condition: ${p.disease_protocol.condition}` : ""}
${p.regional_concern ? `Region: ${p.regional_concern.region} — ${p.regional_concern.detail}` : ""}

Include: 1) Overall health assessment 2) Top 2 priorities 3) One actionable tip.`;
          frontendLLM.generate(prompt, "You are an Indian clinical nutritionist. Give concise, actionable advice.", user.id)
            .then((res) => {
              if (res.content) setLlmAnalysis(res.content);
            })
            .catch(console.error)
            .finally(() => setLlmLoading(false));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
    trackerApi.getDailySummary(todayIST).then(setDaily).catch(console.error);
  }, [user, todayIST]);

  const targets = useMemo(() => profile?.rda_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, iron_mg: 17, calcium_mg: 600, fibre_g: 30 }, [profile]);
  const d = useMemo(() => daily || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_iron_mg: 0, total_calcium_mg: 0, total_fibre_g: 0, meals_by_slot: {}, meal_count: 0 }, [daily]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {user ? `Hey, ${user.name?.split(" ")[0]} 👋` : "NutriSync"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user
              ? `${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} — here's your nutrition overview.`
              : "AI-powered nutrition assistant built on IFCT 2017 data."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.profile_completion !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/10 text-accent text-xs font-medium">
              <Flame className="w-3.5 h-3.5" /> {user.profile_completion}% complete
            </div>
          )}
          {user && (
            <Link href="/tracker">
              <Button size="sm" className="rounded-md">
                <Plus className="w-4 h-4 mr-1.5" /> Log Meal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {user ? (
        <div className="space-y-8">

          {/* Macro Rings + Micros */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground">Today's Intake</h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md font-medium">
                  <Activity className="w-3 h-3" /> Live
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Energy", current: d.total_calories, target: targets.energy, unit: "kcal", color: "var(--color-calories)" },
                  { label: "Protein", current: d.total_protein_g, target: targets.protein_g, unit: "g", color: "var(--color-protein)" },
                  { label: "Carbs", current: d.total_carbs_g, target: targets.carbs_g || 300, unit: "g", color: "var(--color-carbs)" },
                  { label: "Fat", current: d.total_fat_g, target: targets.fat_g || 65, unit: "g", color: "var(--color-fat)" },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col items-center">
                    <MacroRing label={m.label} current={Math.round(m.current)} target={m.target} unit={m.unit} color={m.color} />
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-xs font-semibold text-muted-foreground mb-4">Micronutrients</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Iron", current: d.total_iron_mg, target: targets.iron_mg, unit: "mg", color: "var(--color-calories)" },
                    { label: "Calcium", current: d.total_calcium_mg, target: targets.calcium_mg, unit: "mg", color: "var(--color-carbs)" },
                    { label: "Fibre", current: d.total_fibre_g, target: targets.fibre_g, unit: "g", color: "var(--color-fibre)" },
                  ].map((m) => (
                    <div key={m.label} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                        <span className="text-sm font-semibold">
                          {m.current.toFixed(1)}<span className="text-xs text-muted-foreground ml-0.5">{m.unit}</span>
                          <span className="text-xs text-muted-foreground/50 ml-1">/ {m.target}{m.unit}</span>
                        </span>
                      </div>
                      <ProgressBar value={m.current} max={m.target} color={m.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions + Meals */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { label: "Chat with AI", href: "/chat", icon: Sparkles },
                  { label: "Generate Meal Plan", href: "/meal-plan", icon: Utensils },
                  { label: "Browse Foods", href: "/explore", icon: Target },
                ].map((a) => (
                  <Link key={a.href} href={a.href}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-2.5">
                        <a.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{a.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Today's Meals</h3>
              <div className="space-y-2">
                {["Breakfast", "Lunch", "Dinner"].map((slot) => {
                  const items = d.meals_by_slot[slot] || [];
                  return (
                    <div key={slot} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60">
                      <span className="text-sm font-medium">{slot}</span>
                      {items.length > 0 ? (
                        <span className="text-xs font-semibold text-emerald-600">{Math.round((items || []).reduce((s:any,f:any)=>s+(f.calories||0),0))} kcal</span>
                      ) : (
                        <Link href="/tracker" className="text-xs text-primary font-medium hover:underline">+ Add</Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Analysis Cards - Lazy Loaded */}
          <AnalysisSection profile={profile} loadingProfile={loadingProfile} />

          {/* User Profile Summary */}
          {profile && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Your Profile</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: "Age", v: profile.profile_summary?.age || "—" },
                  { l: "Gender", v: profile.profile_summary?.gender || "—" },
                  { l: "Weight", v: profile.body_metrics?.weight_kg ? `${profile.body_metrics.weight_kg} kg` : "—" },
                  { l: "Height", v: profile.body_metrics?.height_cm ? `${profile.body_metrics.height_cm} cm` : "—" },
                  { l: "Diet", v: profile.profile_summary?.diet_type || "—" },
                  { l: "Activity", v: profile.profile_summary?.activity_level || "—" },
                  { l: "Region", v: profile.profile_summary?.region || "—" },
                  { l: "Conditions", v: (profile.profile_summary?.conditions || []).length > 0 ? profile.profile_summary?.conditions?.join(", ") : "None" },
                ].map(m => (
                  <div key={m.l} className="bg-muted/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground font-medium">{m.l}</p>
                    <p className="text-sm font-semibold">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LLM AI Analysis - Now with proper markdown rendering */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-primary/5 border-b border-border flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">AI Health Analysis</h2>
              {llmLoading && <Loader2 className="w-3 h-3 animate-spin text-primary ml-auto" />}
            </div>
            <div className="p-5">
              {llmLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                  <p className="text-sm text-muted-foreground">Analyzing your profile...</p>
                </div>
              ) : llmAnalysis ? (
                <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{llmAnalysis}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Click to generate AI-powered health analysis based on your profile.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Logged-out landing */
        <div className="flex flex-col items-center text-center py-20 bg-card border border-border rounded-xl">
          <div className="p-4 rounded-xl bg-primary/10 mb-6">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Track your nutrition with AI</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
            Get ICMR-NIN 2024 targets, deficiency analysis, and AI-powered meal plans — all grounded in Indian food data.
          </p>
          <Link href="/login">
            <Button className="px-8 py-5 text-sm font-semibold">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
