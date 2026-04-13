"use client";

import { useState, useEffect } from "react";
import { FileText, Bot, Loader2, Calendar, ChevronRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { mealPlanApi } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

const MEAL_HEAVINESS = ["Light", "Medium", "Heavy"];
const SPICE_LEVELS = ["Mild", "Medium", "Spicy", "Very Spicy"];
const CUISINES = ["North Indian", "South Indian", "East Indian", "West Indian", "Central", "Fusion"];
const COMMON_ALLERGIES = ["Peanuts", "Dairy", "Gluten", "Soy", "Sesame", "Shellfish", "Nuts"];
const MEAL_TIMINGS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

type StepType = 1 | 2 | 3 | 4;

export default function MealPlanPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<StepType>(1);
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Preferences form
  const [prefs, setPrefs] = useState({
    duration: 7,
    budget: 300,
    health_goal: "Weight Loss",
    meal_heaviness: "Medium",
    spice_tolerance: "Medium",
    cook_time_available: 30,
    meal_timings: ["Breakfast", "Lunch", "Dinner"],
    preferred_cuisines: ["North Indian"],
    allergies: [] as string[],
    foods_to_avoid: "",
  });

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

  const handleGenerateClick = async () => {
    if (!user) {
      toast.error("Please log in and complete your profile to generate meal plans.");
      return;
    }
    setIsGenerating(true);
    toast.info("AI is analyzing IFCT data and your preferences. This may take a minute...");

    try {
      const res: any = await mealPlanApi.generate({
        user_profile: { ...user.profile, ...prefs },
        days: prefs.duration,
        budget_per_day_inr: prefs.budget,
      });

      const newPlan = {
        plan_text: res.meal_plan?.plan_text || "",
        targets: res.targets || {},
        created_at: new Date().toISOString(),
      };

      setActivePlan(newPlan);
      await loadHistory();
      toast.success("Meal plan generated successfully!");
      setStep(1);
      setPrefs({
        duration: 7, budget: 300, health_goal: "Weight Loss",
        meal_heaviness: "Medium", spice_tolerance: "Medium",
        cook_time_available: 30, meal_timings: ["Breakfast", "Lunch", "Dinner"],
        preferred_cuisines: ["North Indian"], allergies: [], foods_to_avoid: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate meal plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAllergyToggle = (allergy: string) => {
    setPrefs((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const handleCuisineToggle = (cuisine: string) => {
    setPrefs((prev) => ({
      ...prev,
      preferred_cuisines: prev.preferred_cuisines.includes(cuisine)
        ? prev.preferred_cuisines.filter((c) => c !== cuisine)
        : [...prev.preferred_cuisines, cuisine],
    }));
  };

  const handleMealTimingToggle = (timing: string) => {
    setPrefs((prev) => ({
      ...prev,
      meal_timings: prev.meal_timings.includes(timing)
        ? prev.meal_timings.filter((t) => t !== timing)
        : [...prev.meal_timings, timing],
    }));
  };

  if (!activePlan) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto pb-20 fade-in">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">AI Meal Planner</h1>
          </div>
          <p className="text-muted-foreground">Let&apos;s customize your perfect meal plan</p>
        </header>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex gap-2 justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s < step
                      ? "bg-primary text-primary-foreground"
                      : s === step
                      ? "bg-primary/10 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Duration, Budget, Health Goal */}
        {step === 1 && (
          <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">Required</span>
                How many days do you want your meal plan for?
              </label>
              <select
                value={prefs.duration}
                onChange={(e) => setPrefs({ ...prefs, duration: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days (Recommended)</option>
                <option value={14}>14 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">Required</span>
                Budget per day (₹)
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={prefs.budget}
                  onChange={(e) => setPrefs({ ...prefs, budget: Number(e.target.value) })}
                  min="100"
                  step="50"
                  className="flex-1"
                />
                <span className="text-muted-foreground text-sm py-3">₹{prefs.budget}/day</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Health Goal</label>
              <select
                value={prefs.health_goal}
                onChange={(e) => setPrefs({ ...prefs, health_goal: e.target.value })}
                className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="Weight Loss">Weight Loss</option>
                <option value="Weight Gain">Weight Gain</option>
                <option value="Muscle Build">Muscle Build</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Athletic">Athletic Performance</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Cancel
                </Button>
              </Link>
              <Button onClick={() => setStep(2)} className="flex-1 flex gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Meal Preferences */}
        {step === 2 && (
          <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">Required</span>
                Meal heaviness preference
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MEAL_HEAVINESS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setPrefs({ ...prefs, meal_heaviness: h })}
                    className={`px-4 py-3 rounded-lg font-medium transition ${
                      prefs.meal_heaviness === h
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">Required</span>
                Spice tolerance
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SPICE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setPrefs({ ...prefs, spice_tolerance: level })}
                    className={`px-3 py-3 rounded-lg font-medium transition text-sm ${
                      prefs.spice_tolerance === level
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3">Cooking time available (mins)</label>
              <Input
                type="number"
                value={prefs.cook_time_available}
                onChange={(e) => setPrefs({ ...prefs, cook_time_available: Number(e.target.value) })}
                min="10"
                max="180"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-bold">Optional</span>
                Meal timings
              </label>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TIMINGS.map((timing) => (
                  <button
                    key={timing}
                    onClick={() => handleMealTimingToggle(timing)}
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                      prefs.meal_timings.includes(timing)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {timing}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                Back
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button onClick={() => setStep(3)} className="flex-1 flex gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Cuisines & Allergies */}
        {step === 3 && (
          <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
            <div>
              <label className="block text-sm font-semibold mb-3">Preferred cuisines</label>
              <div className="grid grid-cols-3 gap-2">
                {CUISINES.map((cuisine) => (
                  <button
                    key={cuisine}
                    onClick={() => handleCuisineToggle(cuisine)}
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                      prefs.preferred_cuisines.includes(cuisine)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-destructive/10 text-destructive px-2 py-1 rounded text-xs font-bold">Critical</span>
                Allergies
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COMMON_ALLERGIES.map((allergy) => (
                  <button
                    key={allergy}
                    onClick={() => handleAllergyToggle(allergy)}
                    className={`px-3 py-2 rounded-lg font-medium transition text-sm ${
                      prefs.allergies.includes(allergy)
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {allergy}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3 flex gap-2">
                <span className="bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-bold">Optional</span>
                Foods to avoid
              </label>
              <Input
                value={prefs.foods_to_avoid}
                onChange={(e) => setPrefs({ ...prefs, foods_to_avoid: e.target.value })}
                placeholder="e.g., Onion, Garlic, Mushroom"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1 flex gap-2">
                Review <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Generate */}
        {step === 4 && (
          <div className="space-y-6 bg-card p-6 rounded-lg border border-border">
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Your Preferences</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold"> {prefs.duration} days</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-semibold"> ₹{prefs.budget}/day</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Goal:</span>
                  <span className="font-semibold"> {prefs.health_goal}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Heaviness:</span>
                  <span className="font-semibold"> {prefs.meal_heaviness}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Spice:</span>
                  <span className="font-semibold"> {prefs.spice_tolerance}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cook time:</span>
                  <span className="font-semibold"> {prefs.cook_time_available} mins</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Cuisines:</span>
                  <span className="font-semibold"> {prefs.preferred_cuisines.join(", ")}</span>
                </div>
                {prefs.allergies.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Allergies:</span>
                    <span className="font-semibold text-destructive"> {prefs.allergies.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                Back
              </Button>
              <Link href="/" className="flex-1">
                <Button variant="ghost" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="flex-[2] flex gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Display active plan
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-20 fade-in">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Your Meal Plan</h1>
        </div>
        <p className="text-muted-foreground">Generated on {new Date(activePlan.created_at).toLocaleDateString()}</p>
      </header>

      <Button onClick={() => setActivePlan(null)} className="mb-6">
        Generate New Plan
      </Button>

      <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 rounded-xl border border-border">
                <table className="w-full text-sm border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
            th: ({ children }) => <th className="p-3 text-left font-bold text-foreground border-b border-border">{children}</th>,
            td: ({ children }) => <td className="p-3 border-b border-border text-muted-foreground">{children}</td>,
            h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4">{children}</h1>,
            h2: ({ children }) => <h2 className="text-xl font-bold mt-8 mb-4 text-primary">{children}</h2>,
            h3: ({ children }) => <h3 className="text-lg font-bold mt-6 mb-3">{children}</h3>,
            p: ({ children }) => <p className="leading-relaxed mb-4 text-muted-foreground">{children}</p>,
          }}
        >
          {activePlan.plan_text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
