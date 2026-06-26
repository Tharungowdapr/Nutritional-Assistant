"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Flame, AlertTriangle, ChevronRight, Activity,
  Sparkles, Utensils, User, Brain, Plus, Loader2, Settings,
  Wheat, Apple, Milk, Beef, LeafyGreen, Coffee, Sun, Moon, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { trackerApi, apiFetch } from "@/lib/api";
import { frontendLLM } from "@/lib/llm-provider";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const pct = (v: number, t: number) => t ? Math.min(100, Math.round((v / t) * 100)) : 0;

const SLOTS = [
  { key: "Breakfast", label: "Breakfast", icon: Coffee, color: "text-amber-500" },
  { key: "Lunch", label: "Lunch", icon: Sun, color: "text-orange-500" },
  { key: "Dinner", label: "Dinner", icon: Moon, color: "text-indigo-500" },
  { key: "Snack", label: "Snack", icon: Apple, color: "text-emerald-500" },
];

const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted/50 ${className}`} />
);

const NutritionSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="mb-8 space-y-3">
        <SkeletonPulse className="h-10 w-64" />
        <SkeletonPulse className="h-5 w-48" />
      </div>

      {/* Hero Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-2xl p-6">
          <div className="flex flex-col items-center space-y-4">
            <SkeletonPulse className="h-32 w-32 rounded-full" />
            <SkeletonPulse className="h-6 w-24" />
            <SkeletonPulse className="h-4 w-16" />
          </div>
        </div>
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <SkeletonPulse className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <SkeletonPulse className="h-4 w-24" />
                  <SkeletonPulse className="h-7 w-16" />
                  <SkeletonPulse className="h-2 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <SkeletonPulse className="h-6 w-32 mb-6" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonPulse key={i} className="h-16" />
              ))}
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <SkeletonPulse className="h-6 w-32 mb-6" />
            <SkeletonPulse className="h-40" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <SkeletonPulse className="h-6 w-32 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonPulse key={i} className="h-16" />
              ))}
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-6">
            <SkeletonPulse className="h-6 w-32 mb-6" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonPulse key={i} className="h-20" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const NutritionCard = ({ icon: Icon, label, sublabel, value, unit, target, color, iconBg }: {
  icon: any;
  label: string;
  sublabel?: string;
  value: number;
  unit: string;
  target: number;
  color: string;
  iconBg: string;
}) => {
  const p = pct(value, target);
  return (
    <div className="group bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg hover:border-border/80 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-0.5">{label}</h3>
          {sublabel && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{sublabel}</p>}
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={`text-xl font-bold ${color}`}>{value.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/ {target.toLocaleString()} {unit}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              style={{ width: `${p}%` }}
              className={`h-full rounded-full transition-all duration-700 ease-out ${color.replace('text-', 'bg-')}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [llmAnalysis, setLlmAnalysis] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const generateAnalysis = useCallback(() => {
    if (!profile || llmLoading) return;

    const p = profile;
    if (p?.body_metrics) {
      setLlmLoading(true);
      setLlmError(null);
      const prompt = `As a clinical nutritionist, analyze this Indian user's profile and provide a concise health summary (max 150 words):
Age: ${p.profile_summary?.age}, Gender: ${p.profile_summary?.gender}
BMI: ${p.body_metrics?.bmi} (${p.body_metrics?.status}), Weight: ${p.body_metrics?.weight_kg}kg, Height: ${p.body_metrics?.height_cm}cm
TDEE: ${p.body_metrics?.tdee} kcal/day, BMR: ${p.body_metrics?.bmr}
Diet: ${p.profile_summary?.diet_type}, Activity: ${p.profile_summary?.activity_level}
RDA Targets: Energy ${p.icmr_match?.energy}kcal, Protein ${p.icmr_match?.protein_g}g
Top Risks: ${(p.deficiency_risks || []).slice(0,2).map((r: any) => r.nutrient).join(", ")}
${p.disease_protocol ? `Condition: ${p.disease_protocol.condition}` : ""}
${p.regional_concern ? `Region: ${p.regional_concern.region} — ${p.regional_concern.detail}` : ""}

Include: 1) Overall health assessment 2) Top 2 priorities 3) One actionable tip.`;

      frontendLLM.generate(prompt, "You are an Indian clinical nutritionist. Give concise, actionable advice.")
        .then((res) => {
          if (res.error) {
            setLlmError(res.error);
          } else if (res.content) {
            setLlmAnalysis(res.content);
          }
        })
        .catch((e) => setLlmError(e.message))
        .finally(() => setLlmLoading(false));
    }
  }, [profile, llmLoading]);

  useEffect(() => {
    if (!user) { setLoadingProfile(false); return; }
    apiFetch<any>("/api/analysis/customer-profile")
      .then((data) => {
        setProfile(data);
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
    trackerApi.getDailySummary(todayIST).then(setDaily).catch(console.error);
  }, [user, todayIST]);

  const targets = useMemo(() => profile?.icmr_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, iron_mg: 17, calcium_mg: 600, fibre_g: 30 }, [profile]);
  const d = useMemo(() => daily || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_iron_mg: 0, total_calcium_mg: 0, total_fibre_g: 0, meals_by_slot: {}, meal_count: 0 }, [daily]);

  const nutritionScore = useMemo(() => {
    const scores = [];
    const energyScore = Math.min(100, (d.total_calories || 0) / targets.energy * 100);
    const proteinScore = Math.min(100, (d.total_protein_g || 0) / targets.protein_g * 100);
    const ironScore = Math.min(100, (d.total_iron_mg || 0) / targets.iron_mg * 100);
    const calciumScore = Math.min(100, (d.total_calcium_mg || 0) / targets.calcium_mg * 100);
    return [energyScore, proteinScore, ironScore, calciumScore];
  }, [d, targets]);

  if (authLoading || loadingProfile) return <NutritionSkeleton />;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-gradient-to-br from-background to-muted/20">
        <div className="bg-card border border-border/60 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to NutriSync</h1>
          <p className="text-muted-foreground mb-6">Sign in to view your personalized nutrition dashboard and track your health journey.</p>
          <Link href="/login">
            <Button className="w-full">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  const avgScore = Math.round(nutritionScore.reduce((a, b) => a + b, 0) / nutritionScore.length);
  const scoreColor = avgScore >= 75 ? "text-emerald-500" : avgScore >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, <span className="text-primary">{user.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Here's your nutrition summary for {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Kolkata" })}
          </p>
        </div>

        {/* Hero Section: Score Ring + Nutrition Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Score Ring */}
          <div className="lg:col-span-1 bg-card border border-border/60 rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="relative w-36 h-36">
              <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 144 144">
                <circle cx="72" cy="72" r="64" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="72" cy="72" r="64" fill="none"
                  stroke={avgScore >= 75 ? "var(--color-protein)" : avgScore >= 50 ? "var(--color-fat)" : "var(--color-iron)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 64}
                  strokeDashoffset={2 * Math.PI * 64 * (1 - avgScore / 100)}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${scoreColor}`}>{avgScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <h3 className="text-sm font-semibold mt-4">Nutrition Score</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {avgScore >= 75 ? "Great progress today!" : avgScore >= 50 ? "Keep going strong" : "Log meals to improve"}
            </p>
          </div>

          {/* Nutrition Cards */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <NutritionCard
              icon={Flame}
              label="Energy"
              sublabel="Calorie intake"
              value={d.total_calories || 0}
              unit="kcal"
              target={targets.energy}
              color="text-orange-500"
              iconBg="bg-orange-500/10"
            />
            <NutritionCard
              icon={Beef}
              label="Protein"
              sublabel="Essential for muscle"
              value={d.total_protein_g || 0}
              unit="g"
              target={targets.protein_g}
              color="text-emerald-500"
              iconBg="bg-emerald-500/10"
            />
            <NutritionCard
              icon={Wheat}
              label="Carbohydrates"
              sublabel="Energy source"
              value={d.total_carbs_g || 0}
              unit="g"
              target={targets.carbs_g}
              color="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <NutritionCard
              icon={LeafyGreen}
              label="Iron"
              sublabel="Blood health"
              value={d.total_iron_mg || 0}
              unit="mg"
              target={targets.iron_mg}
              color="text-rose-500"
              iconBg="bg-rose-500/10"
            />
            <NutritionCard
              icon={Milk}
              label="Calcium"
              sublabel="Bone strength"
              value={d.total_calcium_mg || 0}
              unit="mg"
              target={targets.calcium_mg}
              color="text-indigo-500"
              iconBg="bg-indigo-500/10"
            />
            <NutritionCard
              icon={Apple}
              label="Fibre"
              sublabel="Digestive health"
              value={d.total_fibre_g || 0}
              unit="g"
              target={targets.fibre_g}
              color="text-amber-500"
              iconBg="bg-amber-500/10"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile + Analysis */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            {profile?.profile_summary && (
              <div className="bg-card border border-border/60 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Your Profile</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Age", value: profile.profile_summary.age },
                    { label: "Gender", value: profile.profile_summary.gender },
                    { label: "Diet", value: profile.profile_summary.diet_type },
                    { label: "Activity", value: profile.profile_summary.activity_level },
                    { label: "BMI", value: `${profile.body_metrics?.bmi} (${profile.body_metrics?.status})` },
                    { label: "TDEE", value: `${profile.body_metrics?.tdee} kcal` },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className="text-muted-foreground text-xs">{item.label}</span>
                      <p className="font-medium capitalize">{item.value}</p>
                    </div>
                  ))}
                  {profile.profile_summary.region && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Region</span>
                      <p className="font-medium">{profile.profile_summary.region}</p>
                    </div>
                  )}
                </div>
                {profile.streak_days > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Tracking streak:</span>
                    <span className="font-bold text-primary">{profile.streak_days} days</span>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">AI Insights</h2>
                {llmLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto text-primary" />}
              </div>
              {llmError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{llmError}</span>
                </div>
              )}
              {llmAnalysis ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{llmAnalysis}</ReactMarkdown>
                </div>
              ) : !llmLoading ? (
                <div className="text-center py-6">
                  <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm mb-4">Get personalized AI nutrition analysis</p>
                  <Button
                    onClick={generateAnalysis}
                    disabled={llmLoading || !profile?.body_metrics}
                    size="sm"
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Analysis
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: Meals + Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Meals */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Today's Meals</h2>
                </div>
                {d.meal_count > 0 && (
                  <Link href="/tracker">
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      View All <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>

              {d.meal_count === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Utensils className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No meals logged yet</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                    Start tracking your nutrition by adding your first meal of the day
                  </p>
                  <Link href="/tracker">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Your First Meal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(d.meals_by_slot || {}).map(([slot, items]) => {
                    const slotInfo = SLOTS.find(s => s.key === slot);
                    const slotItems = items as any[];
                    const totalCal = slotItems.reduce((sum, item) => sum + (item.calories || 0), 0);
                    const totalProt = slotItems.reduce((sum, item) => sum + (item.protein_g || 0), 0);
                    return (
                      <div key={slot} className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {slotInfo ? React.createElement(slotInfo.icon, { className: `w-5 h-5 ${slotInfo.color}` }) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{slotInfo?.label || slot}</div>
                          <div className="text-xs text-muted-foreground">{slotItems.length} item{slotItems.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-orange-500">{totalCal.toLocaleString()} kcal</div>
                          <div className="text-xs text-emerald-500">{totalProt.toLocaleString()}g protein</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border/60 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { href: "/meal-plan", label: "Plan Meals", icon: Utensils, color: "text-primary", bg: "bg-primary/10" },
                  { href: "/tracker", label: "Track Intake", icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { href: "/analytics", label: "Analytics", icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { href: "/settings", label: "Settings", icon: Settings, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/40 cursor-pointer transition-all duration-200 group">
                      <div className="flex flex-col items-center gap-2.5 text-center">
                        <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                          <action.icon className={`w-5 h-5 ${action.color}`} />
                        </div>
                        <div className="text-sm font-medium group-hover:text-primary transition-colors">{action.label}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
