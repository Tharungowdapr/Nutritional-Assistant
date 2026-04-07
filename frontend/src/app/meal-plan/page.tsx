"use client";

import { useState, useEffect } from "react";
import { FileText, Bot, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { mealPlanApi } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function MealPlanPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState(300);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const data: any = await mealPlanApi.history();
      setPlans(data.plans || []);
      if (data.plans?.length > 0 && !activePlan) {
        setActivePlan(data.plans[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast.error("Please log in and complete your profile to generate meal plans.");
      return;
    }
    setIsGenerating(true);
    toast.info("AI is analyzing IFCT data and your profile to craft a plan. This may take a minute...");
    
    try {
      const res: any = await mealPlanApi.generate({
        user_profile: user.profile,
        days,
        budget_per_day_inr: budget
      });
      
      const newPlan = {
        plan_text: res.meal_plan?.plan_text || "",
        targets: res.targets || {},
        created_at: new Date().toISOString()
      };
      
      setActivePlan(newPlan);
      await loadHistory();
      toast.success("Meal plan generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate meal plan");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col gap-8 fade-in h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">AI Meal Planner</h1>
            <p className="text-sm text-muted-foreground">Personalized to your life stage and conditions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border">
          <div className="flex items-center px-3 border-r">
            <span className="text-xs text-muted-foreground mr-2">Days</span>
            <select 
              value={days} onChange={e => setDays(Number(e.target.value))}
              className="bg-transparent text-sm font-medium outline-none"
            >
              <option value={1}>1 Day</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days</option>
            </select>
          </div>
          <div className="flex items-center px-3">
            <span className="text-xs text-muted-foreground mr-2">₹/Day</span>
            <input 
              type="number" value={budget} onChange={e => setBudget(Number(e.target.value))}
              className="bg-transparent text-sm font-medium outline-none w-16"
              min="100" step="50"
            />
          </div>
          <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="rounded-lg ml-2">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
            Generate New
          </Button>
        </div>
      </header>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Main Content */}
        <div className="md:col-span-8 space-y-6">
          {activePlan ? (
            <div className="glass-card p-6 md:p-8">
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>{activePlan.plan_text}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium mb-2">No Meal Plan Yet</h2>
              <p className="text-muted-foreground max-w-md">
                Click "Generate New" to create your first personalized AI meal plan based on your nutritional profile.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-4 space-y-6">
          {activePlan && activePlan.targets && Object.keys(activePlan.targets).length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4 border-b pb-2">Computed Daily Targets</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Calories</span>
                  <span className="text-sm font-semibold">{Math.round(activePlan.targets.energy_kcal || 0)} kcal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Protein</span>
                  <span className="text-sm font-semibold">{Math.round(activePlan.targets.protein_g || 0)}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fat</span>
                  <span className="text-sm font-semibold">{Math.round(activePlan.targets.fat_g || 0)}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Carbs</span>
                  <span className="text-sm font-semibold">{Math.round(activePlan.targets.carbs_g || 0)}g</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Iron</span>
                  <span className="text-sm font-semibold text-primary">{Math.round(activePlan.targets.iron_mg || 0)}mg</span>
                </div>
              </div>
            </div>
          )}

          {plans.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-medium text-foreground mb-4">Past Plans</h3>
              <div className="space-y-2">
                {plans.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePlan(p)}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                      activePlan?.id === p.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    Plan from {new Date(p.created_at).toLocaleDateString()}
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.days} Days • ₹{p.budget}/day
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
