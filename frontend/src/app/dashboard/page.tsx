"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Target, Flame, TrendingUp, AlertTriangle,
  ChevronRight, Activity, Sparkles, Utensils, User, Brain, Plus, Loader2,
  Wheat, Apple, Milk, Beef, LeafyGreen, Coffee, Sun, Moon
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { trackerApi, apiFetch } from "@/lib/api";
import { frontendLLM } from "@/lib/llm-provider";
import { MacroRing } from "@/components/macro-ring";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

const pct = (v: number, t: number) => t ? Math.min(100, Math.round((v / t) * 100)) : 0;

const SLOTS = [
  { key: "Breakfast", label: "Breakfast", icon: Coffee },
  { key: "Lunch", label: "Lunch", icon: Sun },
  { key: "Dinner", label: "Dinner", icon: Moon },
  { key: "Snack", label: "Snack", icon: Apple },
];

const ProgressBar = React.memo(({ value, max, color = "var(--primary)", label }: { value: number; max: number; color?: string; label?: string }) => {
  const p = pct(value, max);
  return (
    <div className="space-y-2">
      {label && <div className="flex justify-between text-xs font-medium text-muted-foreground"><span>{label}</span><span>{value}/{max}</span></div>}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div style={{ width: `${p}%`, backgroundColor: color }} className="h-full rounded-full transition-all duration-700 ease-out" />
      </div>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

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
RDA Targets: Energy ${p.rda_match?.energy}kcal, Protein ${p.rda_match?.protein_g}g
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

  const targets = useMemo(() => profile?.rda_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, iron_mg: 17, calcium_mg: 600, fibre_g: 30 }, [profile]);
  const d = useMemo(() => daily || { total_calories: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_iron_mg: 0, total_calcium_mg: 0, total_fibre_g: 0, meals_by_slot: {}, meal_count: 0 }, [daily]);

  const nutritionScore = useMemo(() => {
    const scores = [];
    const energyScore = Math.min(100, (d.total_calories || 0) / targets.energy * 100);
    const proteinScore = Math.min(100, (d.total_protein_g || 0) / targets.protein_g * 100);
    const ironScore = Math.min(100, (d.total_iron_mg || 0) / targets.iron_mg * 100);
    const calciumScore = Math.min(100, (d.total_calcium_mg || 0) / targets.calcium_mg * 100);
    return [energyScore, proteinScore, ironScore, calciumScore];
  }, [d, targets]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

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

  const avgScore = nutritionScore.reduce((a, b) => a + b, 0) / nutritionScore.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">Your nutrition dashboard for {todayIST}</p>
        </div>

        {/* Nutrition Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Energy Intake</h3>
                <p className="text-xs text-muted-foreground mb-2">Daily calorie consumption vs recommended target</p>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold text-orange-600">{(d.total_calories || 0).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">/ {targets.energy} kcal</div>
                </div>
                <ProgressBar value={d.total_calories || 0} max={targets.energy} color="var(--color-calories)" label="Calories" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Protein Intake</h3>
                <p className="text-xs text-muted-foreground mb-2">Daily protein consumption vs recommended target</p>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold text-emerald-600">{(d.total_protein_g || 0).toLocaleString()}g</div>
                  <div className="text-xs text-muted-foreground">/ {targets.protein_g}g</div>
                </div>
                <ProgressBar value={d.total_protein_g || 0} max={targets.protein_g} color="var(--color-protein)" label="Protein" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Beef className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Iron Intake</h3>
                <p className="text-xs text-muted-foreground mb-2">Daily iron consumption vs recommended target</p>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold text-blue-600">{(d.total_iron_mg || 0).toLocaleString()}mg</div>
                  <div className="text-xs text-muted-foreground">/ {targets.iron_mg}mg</div>
                </div>
                <ProgressBar value={d.total_iron_mg || 0} max={targets.iron_mg} color="var(--color-iron)" label="Iron" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl p-5 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Overall Nutrition Score</h3>
                <p className="text-xs text-muted-foreground mb-2">Overall nutrition score based on key nutrients</p>
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold text-primary">{Math.round(avgScore)}</div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </div>
                <ProgressBar value={Math.round(avgScore)} max={100} color="var(--color-primary)" label="Overall Score" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Macro Ring and Analysis */}
          <div className="lg:col-span-1 space-y-6">
            {/* Macro Ring */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Nutrition Profile</h2>
              </div>
              <MacroRing
                calories={d.total_calories || 0}
                protein={d.total_protein_g || 0}
                carbs={d.total_carbs_g || 0}
                fat={d.total_fat_g || 0}
                size={240}
              />
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calories</span>
                  <span className="font-medium">{(d.total_calories || 0).toLocaleString()} kcal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Protein</span>
                  <span className="font-medium">{(d.total_protein_g || 0).toLocaleString()}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Carbs</span>
                  <span className="font-medium">{(d.total_carbs_g || 0).toLocaleString()}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fat</span>
                  <span className="font-medium">{(d.total_fat_g || 0).toLocaleString()}g</span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {llmAnalysis && (
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">AI Nutrition Analysis</h2>
                  {llmLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
                </div>
                {llmError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Error: {llmError}</span>
                  </div>
                )}
                {llmAnalysis && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{llmAnalysis}</ReactMarkdown>
                  </div>
                )}
                {!llmAnalysis && !llmLoading && !llmError && (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Generate personalized nutrition analysis</p>
                    <Button 
                      onClick={generateAnalysis}
                      disabled={llmLoading || !profile?.body_metrics}
                      className="mt-4"
                    >
                      Generate Analysis
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/meal-plan">
                  <div className="p-4 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/20 cursor-pointer transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Utensils className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Plan Meals</div>
                        <div className="text-xs text-muted-foreground">Generate daily meal plans</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/tracker">
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted/80 border border-border cursor-pointer transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Track Intake</div>
                        <div className="text-xs text-muted-foreground">Log your meals</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/analytics">
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted/80 border border-border cursor-pointer transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">View Analytics</div>
                        <div className="text-xs text-muted-foreground">Detailed insights</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/settings">
                  <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted/80 border border-border cursor-pointer transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Settings</div>
                        <div className="text-xs text-muted-foreground">Configure preferences</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Daily Intake */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Intake Card */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Today's Intake</h2>
                </div>
                <div className="text-sm text-muted-foreground">
                  {todayIST}
                </div>
              </div>

              {d.meal_count === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Utensils className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No meals logged today</h3>
                  <p className="text-muted-foreground mb-6">Start tracking your nutrition by adding meals</p>
                  <Link href="/tracker">
                    <Button>Add Your First Meal</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Macro Progress Bars */}
                  <div className="space-y-3">
                    <ProgressBar 
                      value={d.total_calories || 0} 
                      max={targets.energy} 
                      color="var(--color-calories)"
                      label="Calories"
                    />
                    <ProgressBar 
                      value={d.total_protein_g || 0} 
                      max={targets.protein_g} 
                      color="var(--color-protein)"
                      label="Protein"
                    />
                    <ProgressBar 
                      value={d.total_carbs_g || 0} 
                      max={targets.carbs_g} 
                      color="var(--color-carbs)"
                      label="Carbohydrates"
                    />
                    <ProgressBar 
                      value={d.total_fat_g || 0} 
                      max={targets.fat_g} 
                      color="var(--color-fat)"
                      label="Fat"
                    />
                    <ProgressBar 
                      value={d.total_iron_mg || 0} 
                      max={targets.iron_mg} 
                      color="var(--color-iron)"
                      label="Iron"
                    />
                    <ProgressBar 
                      value={d.total_calcium_mg || 0} 
                      max={targets.calcium_mg} 
                      color="var(--color-calcium)"
                      label="Calcium"
                    />
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/60">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{(d.meal_count || 0)}</div>
                      <div className="text-xs text-muted-foreground">Meals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{(d.total_calories || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Calories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">{(d.total_protein_g || 0).toLocaleString()}g</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{(d.total_carbs_g || 0).toLocaleString()}g</div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Meals */}
            {d.meal_count > 0 && (
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Meals</h2>
                  <Link href="/tracker">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>

                <div className="space-y-3">
                  {Object.entries(d.meals_by_slot || {}).slice(0, 3).map(([slot, items]) => {
                    const slotInfo = SLOTS.find(s => s.key === slot);
                    return (
                      <div key={slot} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {slotInfo ? React.createElement(slotInfo.icon, { className: "w-5 h-5 text-primary" }) : null}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{slotInfo?.label || slot}</div>
                          <div className="text-xs text-muted-foreground">{(items as any[]).length} items</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{(items as any[]).reduce((sum, item) => sum + (item.cal || 0), 0)} kcal</div>
                          <div className="text-xs text-muted-foreground">{(items as any[]).reduce((sum, item) => sum + (item.protein_g || 0), 0)}g protein</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Settings from "lucide-react/dist/esm/icons/settings.js";
