"use client";

import { useEffect, useState } from "react";
import {
  Target, Flame, TrendingUp, AlertTriangle, CheckCircle,
  ChevronRight, MapPin, FlaskConical, Pill, Plus,
  Loader2, Activity, Sparkles, Utensils
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { trackerApi, apiFetch } from "@/lib/api";
import { MacroRing } from "@/components/macro-ring";
import { Button } from "@/components/ui/button";

const pct = (v: number, t: number) => t ? Math.min(100, Math.round((v / t) * 100)) : 0;

function ProgressBar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const p = pct(value, max);
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div style={{ width: `${p}%`, background: color }} className="h-full rounded-full transition-all duration-700 ease-out" />
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return; }
    apiFetch<any>("/api/analysis/customer-profile")
      .then(setProfile).catch(console.error).finally(() => setLoadingProfile(false));
    trackerApi.getDailySummary(todayIST).then(setDaily).catch(console.error);
  }, [user, todayIST]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const targets = profile?.icmr_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, iron_mg: 17, calcium_mg: 600, fibre_g: 30 };
  const d = daily || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_iron_mg: 0, total_calcium_mg: 0, total_fibre_g: 0, meals_by_slot: {}, meal_count: 0 };

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
          {profile?.streak_days > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent/10 text-accent text-xs font-medium">
              <Flame className="w-3.5 h-3.5" /> {profile.streak_days}-day streak
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
                          <span className="text-xs font-semibold text-emerald-600">{Math.round(items.reduce((s:any,f:any)=>s+f.calories,0))} kcal</span>
                        ) : (
                          <Link href="/tracker" className="text-xs text-primary font-medium hover:underline">+ Add</Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Cards */}
          {loadingProfile ? (
            <div className="flex items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <p className="text-sm text-muted-foreground">Loading your analysis...</p>
            </div>
          ) : profile && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Your Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* ICMR Profile */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">ICMR Profile</span>
                    {profile.icmr_match?.profile && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile.icmr_match.profile}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Energy", value: profile.icmr_match?.energy, unit: "kcal" },
                      { label: "Protein", value: profile.icmr_match?.protein_g, unit: "g" },
                      { label: "Iron", value: profile.icmr_match?.iron_mg, unit: "mg" },
                      { label: "Calcium", value: profile.icmr_match?.calcium_mg, unit: "mg" },
                    ].map((s) => (
                      <div key={s.label} className="bg-muted/40 rounded-lg p-2.5">
                        <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{s.label}</p>
                        <p className="text-base font-bold">{s.value}<span className="text-xs ml-0.5 text-muted-foreground">{s.unit}</span></p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">Source: ICMR-NIN 2024</p>
                </div>

                {/* BMI */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Body Metrics</span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">BMI</p>
                      <p className={`text-3xl font-bold ${profile.body_metrics?.status === "Normal" ? "text-emerald-500" : "text-amber-500"}`}>
                        {profile.body_metrics?.bmi}
                      </p>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">{profile.body_metrics?.status}</span>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">TDEE</p>
                      <p className="text-2xl font-bold text-primary">{profile.body_metrics?.tdee}</p>
                      <p className="text-[10px] text-muted-foreground">kcal/day</p>
                    </div>
                  </div>
                </div>

                {/* Risks */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-muted-foreground">Nutritional Risks</span>
                  </div>
                  <div className="space-y-2">
                    {profile.deficiency_risks?.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg text-xs ${r.severity === "high" ? "bg-destructive/5 border border-destructive/10" : "bg-accent/5 border border-accent/10"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${r.severity === "high" ? "bg-destructive" : "bg-accent"}`} />
                          <p className="font-semibold">{r.nutrient}</p>
                        </div>
                        <p className="text-muted-foreground">{r.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regional */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Regional Diet</span>
                    {profile.regional_concern?.region && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile.regional_concern.region}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.regional_concern?.detail || "Regional diet analysis based on your location."}
                  </p>
                </div>

                {/* Health */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Health Notes</span>
                  </div>
                  {profile.disease_protocol ? (
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold">{profile.disease_protocol.condition}</p>
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                        <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Increase</p>
                        <p className="text-muted-foreground">{profile.disease_protocol.foods_increase?.split(";")[0]}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                        <p className="font-medium text-red-700 dark:text-red-400 mb-0.5">Reduce</p>
                        <p className="text-muted-foreground">{profile.disease_protocol.foods_restrict?.split(";")[0]}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> No chronic conditions detected.</p>
                      <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Preventive nutrition active.</p>
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Pill className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">Medications</span>
                  </div>
                  {profile.medicine_watch?.length > 0 ? (
                    <div className="space-y-2">
                      {profile.medicine_watch.slice(0, 2).map((m: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                          <p className="font-semibold text-primary mb-0.5">{m.medication}</p>
                          <p className="text-muted-foreground">{m.note}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-4 opacity-50">
                      <CheckCircle className="w-6 h-6 mb-1.5 text-emerald-500" />
                      <p className="text-xs font-medium">No drug-nutrient interactions</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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
