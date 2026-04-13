"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Target, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MacroRing } from "@/components/macro-ring";
import { useAuth } from "@/lib/auth-context";
import { healthApi, analysisApi, trackerApi } from "@/lib/api";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loadingIntel, setLoadingIntel] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    healthApi.check().then(setStats).catch(console.error);
    analysisApi.getIntelligence().then(setIntel).finally(() => setLoadingIntel(false));
    
    if (user) {
      trackerApi.getDailySummary(today)
        .then(setDailySummary)
        .catch(console.error);
    }
  }, [user]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen"><div className="shimmer w-32 h-8 rounded"></div></div>;
  }

  // Helper for progress calculation
  const getProgress = (current: number, target: number) => {
    if (!target || target === 0) return 0;
    return Math.min(current, target);
  };

  const targets = user?.profile?.targets || { calories: 2000, protein: 75, carbs: 275, fat: 65 };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 pb-20 fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">
          {user ? `Hello, ${user.name.split(" ")[0]}` : "Welcome to NutriSync"}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Your AI-powered Indian nutritional assistant, grounded in IFCT & ICMR-NIN 2024 guidelines.
        </p>
      </header>

      {/* Stats row - Minimal Luxury Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Food Database", value: stats?.db_stats?.foods || "7,000+", total: "IFCT Items" },
          { label: "RDA Profiles", value: stats?.db_stats?.rda_profiles || "400+", total: "ICMR 2024" },
          { label: "AI Backend", value: "Active", total: "LLM + RAG" },
          { label: "Personalized", value: user ? "Enabled" : "Guest", total: "Health Profile" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 group transition-all hover:border-primary/30">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</h3>
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider opacity-60">{stat.total}</p>
          </div>
        ))}
      </div>

      {/* Macro Rings - Today's Progress */}
      {user && (
        <section className="glass-card p-6 md:p-10 border-none shadow-2xl bg-gradient-to-br from-card to-background relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 text-foreground">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                <Target className="w-5 h-5 text-primary" />
              </div>
              Daily Insight
            </h2>
            <Link href="/tracker">
              <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/5">
                Log Meals <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 relative z-10">
            <MacroRing
              label="Energy"
              current={dailySummary?.total_calories || 0}
              target={targets.calories}
              color="var(--color-calories)"
              unit="kcal"
            />
            <MacroRing
              label="Protein"
              current={dailySummary?.total_protein_g || 0}
              target={targets.protein}
              color="var(--color-protein)"
              unit="g"
            />
            <MacroRing
              label="Carbs"
              current={dailySummary?.total_carbs_g || 0}
              target={targets.carbs}
              color="var(--color-carbs)"
              unit="g"
            />
            <MacroRing
              label="Fat"
              current={dailySummary?.total_fat_g || 0}
              target={targets.fat}
              color="var(--color-fat)"
              unit="g"
            />
          </div>
          
          <div className="mt-10 pt-8 border-t border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Real-time synchronization active
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Based on your {dailySummary?.meal_count || 0} logged entries today
            </p>
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Your Profile</h2>
            </div>
            <Link href={user ? "/profile" : "/onboarding"}>
              <Button variant="outline" size="sm">
                {user ? "Edit Profile" : "Get Started"}
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {user ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Diet Type</p>
                  <p className="font-medium">{user.profile.diet_type || "Not set"}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Life Stage</p>
                  <p className="font-medium">{user.profile.life_stage || "Not set"}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Health Conditions</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.profile.conditions?.length ? (
                      user.profile.conditions.map((c: string) => (
                        <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-foreground/60">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-xl p-6 text-center border border-primary/10">
                <p className="text-muted-foreground mb-4">Complete your nutritional profile to get personalized targets and meal plans.</p>
                <Link href="/onboarding">
                  <Button>Start Onboarding <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6">
          <Link href="/chat">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Knowledge Chat</h3>
                  <p className="text-sm text-muted-foreground">Ask questions backed by IFCT & ICMR</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/meal-plan">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Meal Planner</h3>
                  <p className="text-sm text-muted-foreground">Generate hyper-personalized meal plans</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          
          <Link href="/recipes">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Recipe Crafter</h3>
                  <p className="text-sm text-muted-foreground">Turn ingredients into healthy meals</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/tracker">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Health Tracker</h3>
                  <p className="text-sm text-muted-foreground">Log meals and track your progress</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
      {/* Intelligence Hub Section */}
      <section className="space-y-6 pt-10 border-t border-border">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Scientific Intelligence Hub</h2>
          <p className="text-muted-foreground">Deep analytical insights derived from 12+ verified nutritional datasets</p>
        </div>

        {loadingIntel ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 shimmer rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold">Regional Culture</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Analyzing diet patterns across <span className="text-foreground font-semibold">{intel?.region?.zones} geographic zones</span> and {intel?.region?.states} states. Grounded in traditional culinary wisdom.
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-red-500">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-red-500" />
                <h3 className="font-bold">Clinical Precision</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Active protocols for <span className="text-foreground font-semibold">{intel?.disease?.conditions_count} conditions</span>, including {intel?.disease?.top_conditions?.join(", ")}.
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold">Medicine Impacts</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tracking <span className="text-foreground font-semibold">{intel?.medicine?.interactions} specific interactions</span> between nutrition and Indian medication brands.
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-green-500">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-green-500" />
                <h3 className="font-bold">Lifecycle Specifics</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Data-driven priorities for <span className="text-foreground font-semibold">{intel?.life_stages} life stages</span> and {intel?.physio_states} physiological states (Pregnancy, Lactation, etc).
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-purple-500">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold">ICMR-NIN Targets</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Referencing {intel?.rda?.profiles} unique RDA profiles spanning all demographics according to 2024 guidelines.
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold">Occupational Calorie Needs</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Precision calorie mappings for {intel?.profession?.categories} professions. Active variance of up to {intel?.profession?.diff_kcal} Kcal/day based on labor intensity.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
