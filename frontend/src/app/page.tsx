"use client";

import { useEffect, useState } from "react";
import {
  Target, Flame, TrendingUp, AlertTriangle, CheckCircle,
  ChevronRight, Cpu, MapPin, FlaskConical, Pill, Plus,
  Loader2, Activity, Sparkles, Utensils, BrainCircuit
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
      <div style={{ width: `${p}%`, background: color }} className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-4 font-sans">
      {children}
    </p>
  );
}

function LuxuryCard({ icon: Icon, title, badge, children, className = "" }: {
  icon: any; title: string; badge?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`group bg-card border border-border/50 rounded-2xl p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity opacity-0 group-hover:opacity-100" />
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            {badge}
          </span>
        )}
      </div>
      <div className="relative z-10">
        {children}
      </div>
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
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const targets = profile?.icmr_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, iron_mg: 17, calcium_mg: 600, fibre_g: 30 };
  const d = daily || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_iron_mg: 0, total_calcium_mg: 0, total_fibre_g: 0, meals_by_slot: {}, meal_count: 0 };
  const bmiColor = profile?.body_metrics?.status === "Normal" ? "text-emerald-500" : profile?.body_metrics?.status === "Underweight" ? "text-blue-500" : "text-amber-500";

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 fade-in">

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">
            {user ? `Welcome back, ${user.name?.split(" ")[0]}` : "AaharAI NutriSync"}
          </h1>
          <p className="text-muted-foreground font-medium tracking-tight max-w-xl">
            {user 
              ? "Your personalized nutritional concierge, grounded in scientific precision." 
              : "Experience high-fidelity nutritional intelligence tailored for the Indian palate."}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Status</p>
            <p className="text-sm font-semibold">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          {profile?.streak_days > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/5 border border-accent/20">
              <Flame className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-sm font-bold text-accent">{profile.streak_days}-day streak</span>
            </div>
          )}
          {user && (
            <Link href="/tracker">
              <Button className="rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Log Food
              </Button>
            </Link>
          )}
        </div>
      </div>

      {user ? (
        <div className="space-y-10">
          
          {/* Main Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Macro Performance - Spans 2 cols */}
            <div className="lg:col-span-2 bg-card border border-border/50 rounded-[32px] p-8 md:p-10 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50" />
               <div className="flex items-center justify-between mb-8">
                  <SectionLabel>Today's Performance</SectionLabel>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <Activity className="w-3 h-3" /> Live Syncing
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                {[
                  { label: "Energy", current: d.total_calories, target: targets.energy, unit: "kcal", color: "var(--color-calories)" },
                  { label: "Protein",  current: d.total_protein_g, target: targets.protein_g, unit: "g",    color: "var(--color-protein)" },
                  { label: "Carbs",    current: d.total_carbs_g,   target: targets.carbs_g || 300, unit: "g", color: "var(--color-carbs)" },
                  { label: "Fat",      current: d.total_fat_g,     target: targets.fat_g || 65,  unit: "g",   color: "var(--color-fat)" },
                ].map((m) => (
                  <div key={m.label} className="flex flex-col items-center group/ring">
                    <MacroRing label={m.label} current={Math.round(m.current)} target={m.target} unit={m.unit} color={m.color} />
                  </div>
                ))}
              </div>

              <div className="border-t border-border/40 pt-8">
                <SectionLabel>Micronutrient Integrity</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Iron",    current: d.total_iron_mg,    target: targets.iron_mg,    unit: "mg", color: "var(--color-calories)" },
                    { label: "Calcium", current: d.total_calcium_mg, target: targets.calcium_mg, unit: "mg", color: "var(--color-carbs)" },
                    { label: "Fibre",   current: d.total_fibre_g,    target: targets.fibre_g,    unit: "g",  color: "var(--color-fibre)" },
                  ].map((m) => (
                    <div key={m.label} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-muted-foreground">{m.label}</span>
                        <span className="text-sm font-black tracking-tight">
                          {m.current.toFixed(1)}<span className="text-[10px] ml-0.5 text-muted-foreground font-medium">{m.unit}</span>
                          <span className="text-[10px] text-muted-foreground/50 font-medium ml-2">/ {m.target}{m.unit}</span>
                        </span>
                      </div>
                      <ProgressBar value={m.current} max={m.target} color={m.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick concierge actions */}
            <div className="space-y-6">
              <LuxuryCard icon={BrainCircuit} title="AI Intelligence" className="bg-primary/5 border-primary/10">
                <p className="text-sm font-medium mb-6">Access your scientific nutritional advisor for instant clarity.</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: "Ask Nutrition AI", href: "/chat", icon: Sparkles },
                    { label: "Generate Meal Plan", href: "/meal-plan", icon: Utensils },
                    { label: "Recipe Generator", href: "/recipes", icon: Cpu },
                  ].map((a) => (
                    <Link key={a.href} href={a.href}>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-background border border-border/50 hover:border-primary hover:shadow-md transition-all group/btn">
                        <div className="flex items-center gap-3">
                          <a.icon className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold">{a.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/btn:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </LuxuryCard>

              <LuxuryCard icon={Utensils} title="Recent Culinary Log">
                <div className="space-y-3">
                  {["Breakfast", "Lunch", "Dinner"].map((slot) => {
                    const items = d.meals_by_slot[slot] || [];
                    return (
                      <div key={slot} className="flex items-center justify-between p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                        <span className="text-xs font-bold">{slot}</span>
                        {items.length > 0 ? (
                          <span className="text-[10px] font-black text-emerald-600">{Math.round(items.reduce((s:any,f:any)=>s+f.calories,0))} kcal</span>
                        ) : (
                          <Link href="/tracker" className="text-[10px] text-primary font-bold hover:underline">Add Entry</Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </LuxuryCard>
            </div>

          </div>

          {/* Deep Analysis Section */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-serif">Personalized Analysis</h2>
              <div className="h-[1px] flex-1 bg-border/50" />
            </div>

            {loadingProfile ? (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-[32px] border border-dashed border-border">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-bold text-muted-foreground">Synthesizing clinical insights...</p>
              </div>
            ) : profile && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* ICMR Profile Card */}
                <LuxuryCard icon={Activity} title="Scientific Profile" badge={profile.icmr_match?.profile}>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Energy",   value: profile.icmr_match?.energy, unit: "kcal" },
                      { label: "Protein",  value: profile.icmr_match?.protein_g, unit: "g" },
                      { label: "Iron",     value: profile.icmr_match?.iron_mg, unit: "mg" },
                      { label: "Calcium",  value: profile.icmr_match?.calcium_mg, unit: "mg" },
                    ].map((s) => (
                      <div key={s.label} className="bg-muted/30 rounded-xl p-3 border border-border/20">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{s.label}</p>
                        <p className="text-lg font-black tracking-tighter">{s.value}<span className="text-[10px] font-medium ml-1">{s.unit}</span></p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium italic">Source: ICMR-NIN 2024 Guidelines</p>
                </LuxuryCard>

                {/* Metrics Card */}
                <LuxuryCard icon={Target} title="Body Composition">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold">CURRENT BMI</p>
                      <p className={`text-4xl font-black ${bmiColor} tracking-tighter`}>{profile.body_metrics?.bmi}</p>
                      <p className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 inline-block">
                        {profile.body_metrics?.status}
                      </p>
                    </div>
                    <div className="h-12 w-[1px] bg-border/50" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold">EST. TDEE</p>
                      <p className="text-3xl font-black text-primary tracking-tighter">{profile.body_metrics?.tdee}</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">kcal/day</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                    {profile.body_metrics?.tdee_formula}
                  </p>
                </LuxuryCard>

                {/* Risk Radar */}
                <LuxuryCard icon={AlertTriangle} title="Nutritional Risks" className="border-l-accent border-l-2">
                   <div className="space-y-3">
                    {profile.deficiency_risks?.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className={`p-4 rounded-xl text-xs ${r.severity === "high" ? "bg-red-500/5 border border-red-500/10" : "bg-accent/5 border border-accent/10"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${r.severity === "high" ? "bg-red-500" : "bg-accent"}`} />
                          <p className={`font-black uppercase tracking-widest ${r.severity === "high" ? "text-red-600" : "text-accent"}`}>{r.nutrient}</p>
                        </div>
                        <p className="text-muted-foreground font-medium leading-relaxed">{r.fix}</p>
                      </div>
                    ))}
                  </div>
                </LuxuryCard>

                {/* Regional Intelligence */}
                <LuxuryCard icon={MapPin} title="Regional Profile" badge={profile.regional_concern?.region}>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    {profile.regional_concern?.detail || "Regional diet analysis optimized for Indian culinary zones."}
                  </p>
                </LuxuryCard>

                {/* Health Protocols */}
                <LuxuryCard icon={FlaskConical} title="Clinical Protocols">
                   {profile.disease_protocol ? (
                    <div className="space-y-4 text-xs font-medium">
                      <p className="font-black text-sm uppercase tracking-tight">{profile.disease_protocol.condition}</p>
                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <p className="font-bold text-emerald-600 mb-1">OPTIMIZE</p>
                          <p className="text-muted-foreground">{profile.disease_protocol.foods_increase?.split(";")[0]}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                          <p className="font-bold text-red-600 mb-1">RESTRICT</p>
                          <p className="text-muted-foreground">{profile.disease_protocol.foods_restrict?.split(";")[0]}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-muted-foreground font-medium">
                       <p className="flex items-start gap-3"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> No chronic conditions detected. Shifting to preventive nutrition optimization.</p>
                       <p className="flex items-start gap-3"><CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Targetting cardiovascular health via IFCT-grounded lipid management.</p>
                    </div>
                  )}
                </LuxuryCard>

                 {/* Medical Context */}
                 <LuxuryCard icon={Pill} title="Medical Watch">
                   {profile.medicine_watch?.length > 0 ? (
                    <div className="space-y-3">
                      {profile.medicine_watch.slice(0, 2).map((m: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs">
                          <p className="font-black text-primary uppercase tracking-wider mb-1">{m.medication}</p>
                          <p className="text-muted-foreground font-medium leading-relaxed">{m.note}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No Drug-Nutrient Interactions</p>
                    </div>
                  )}
                </LuxuryCard>

              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-32 bg-card border border-border/50 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] -ml-48 -mb-48" />
          
          <div className="p-5 rounded-3xl bg-primary/5 mb-8">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-serif mb-6 luxury-text-gradient">Begin Your Scientific Journey</h2>
          <p className="text-muted-foreground font-medium mb-10 max-w-lg mx-auto">
            Unlock ICMR-NIN 2024 grounded targets, deep deficiency analysis, and AI-powered meal planning for a superior lifestyle.
          </p>
          <Link href="/login">
            <Button className="rounded-full px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30">
              Get Started
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
