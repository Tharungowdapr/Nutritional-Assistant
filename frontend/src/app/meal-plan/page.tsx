"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, RefreshCw, History, Clock, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { FoodItem, MealPlan, SavedPlan, QuestionnaireState, DEFAULT_Q, SLOTS } from "./types";
import Questionnaire from "./components/questionnaire";
import PlanView from "./components/plan-view";
import FoodDetailModal from "@/components/food-detail-modal";

export default function MealPlanPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({});
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [slide, setSlide] = useState(0);
  const [q, setQ] = useState<QuestionnaireState>(DEFAULT_Q);
  const streamRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const totalSlides = 3;

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/meal-plan/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("nutrisync_token")}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data.plans || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [API_BASE]);

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streamText]);

  const updateQ = (field: keyof QuestionnaireState, value: string | number) => {
    setQ(prev => ({ ...prev, [field]: value }));
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setPlan(null);
    setStreamText("");
    setChecked({});
    setCollapsedDays({});
    setExpandedItems({});
    const token = localStorage.getItem("nutrisync_token");
    const suggestions = [
      q.allergies ? `Allergies: ${q.allergies}` : "", q.favoriteFoods ? `Favorite foods: ${q.favoriteFoods}` : "",
      q.dislikedFoods ? `Disliked foods: ${q.dislikedFoods}` : "", `Spice level: ${q.spiceLevel}`,
      `Cooking time per meal: ${q.cookingTime}`, `Meals per day: ${q.mealFrequency}`,
      `Snacks: ${q.snacksPreference}`, `Beverages: ${q.beverages}`,
      q.healthConditions ? `Health conditions: ${q.healthConditions}` : "", `Activity: ${q.activityLevel}`,
      `Sleep: ${q.sleepHours} hrs/night`, `Stress: ${q.stressLevel}`, `Hydration: ${q.hydrationLevel}`,
      `Exercise: ${q.exerciseFreq}`, `Weight goal: ${q.weightGoal}`,
      q.specialRequirements ? `Special requirements: ${q.specialRequirements}` : "",
      q.suggestions ? `Other: ${q.suggestions}` : "",
    ].filter(Boolean).join(". ");

    try {
      const llmConfig = (await import("@/lib/llm-provider")).frontendLLM.getConfig();
      const res = await fetch(`${API_BASE}/api/meal-plan/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          days: q.days, num_people: q.people, budget_per_day_inr: q.budget,
          suggestions: suggestions || undefined,
          user_profile: { ...user?.profile, diet_type: q.dietType, goal: q.goal, llm_provider: llmConfig.provider, llm_model: llmConfig.model },
          api_key: llmConfig.apiKey,
        }),
      });
      if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamError: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) { streamError = parsed.error; break; }
            if (parsed.token) setStreamText(prev => prev + parsed.token);
            if (parsed.final && parsed.plan) {
              setPlan(parsed.plan);
              loadHistory();
            }
          } catch (e) {
            streamError = "Failed to parse server response";
          }
        }
        if (streamError) break;
      }
      if (streamError) throw new Error(streamError);
    } catch (e: any) {
      setError(e.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleDay = (day: number) => setCollapsedDays(p => ({ ...p, [day]: !p[day] }));
  const toggleCheck = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));
  const toggleItem = (key: string) => setExpandedItems(p => ({ ...p, [key]: !p[key] }));

  const viewHistory = (savedPlan: SavedPlan) => {
    setPlan(savedPlan.plan);
    setQ(prev => ({ ...prev, days: savedPlan.days, budget: savedPlan.budget }));
    setShowHistory(false);
  };

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const exportToExcel = useCallback(async () => {
    if (!plan) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const daysData: any[] = [];
    for (const day of plan.days || []) {
      for (const slot of SLOTS) {
        const items = day[slot.key] as FoodItem[] || [];
        for (const item of items) {
          daysData.push({ Day: day.day, DayLabel: day.label, Meal: slot.label, Food: item.name, Quantity: item.qty, Calories: item.cal || 0, Protein_g: item.protein_g || 0, Carbs_g: item.carbs_g || 0, Fat_g: item.fat_g || 0 });
        }
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(daysData), "Meals");
    const groceryData: any[] = [];
    for (const cat of plan.grocery || []) {
      for (const item of cat.items || []) {
        groceryData.push({ Category: cat.category, Item: item.name, Quantity: item.qty, Cost_INR: item.cost_inr });
      }
    }
    if (groceryData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groceryData), "Grocery");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Label: "Summary", Value: plan.summary || "" }, { Label: "Total Days", Value: plan.days?.length || 0 }, { Label: "Grocery Total (INR)", Value: plan.grocery_total_inr || 0 }]), "Summary");
    XLSX.writeFile(wb, `meal-plan-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [plan]);

  const exportToPDF = useCallback(() => {
    if (!plan) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text("AaharAI Meal Plan", 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(plan.summary || "Meal plan", 180);
    doc.text(summaryLines, 14, y + 6);
    y += 20 + summaryLines.length * 4;
    for (const day of plan.days || []) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(`Day ${day.day} - ${day.label}`, 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      y += 6;
      for (const slot of SLOTS) {
        const items = day[slot.key] as FoodItem[] || [];
        if (items.length === 0) continue;
        doc.text(`${slot.label}:`, 14, y); y += 4;
        for (const item of items) {
          doc.text(`  - ${item.name} (${item.qty}) ${item.cal || 0}kcal`, 14, y); y += 4;
        }
      }
      y += 4;
    }
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("Grocery List", 14, y); y += 8; doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const cat of plan.grocery || []) {
      doc.setFont("helvetica", "bold"); doc.text(cat.category, 14, y); y += 4; doc.setFont("helvetica", "normal");
      for (const item of cat.items || []) { doc.text(`  - ${item.name}: ${item.qty} (₹${item.cost_inr})`, 14, y); y += 4; }
      y += 2;
    }
    if (plan.grocery_total_inr) { y += 4; doc.setFont("helvetica", "bold"); doc.text(`Total: ₹${plan.grocery_total_inr}`, 14, y); }
    doc.save(`meal-plan-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [plan]);

  return (
    <div className="flex-1 text-foreground">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-20 md:pt-8 min-h-screen pb-24 animate-fade-in">
        <div className="flex items-center justify-between mb-6 print-hide">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Meal Planner</h1>
            <p className="text-muted-foreground text-sm mt-1">AI-generated Indian meal plans · ICMR-NIN 2024</p>
          </div>
          <div className="flex gap-2">
            {history.length > 0 && (
              <Button onClick={() => setShowHistory(!showHistory)} variant="outline" size="sm">
                <History className="w-4 h-4 mr-1.5" /> History ({history.length})
              </Button>
            )}
            {plan && (
              <>
                <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-1"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-1"><FileText className="w-4 h-4" /> PDF</Button>
                <Button onClick={() => { setPlan(null); setStreamText(""); setSlide(0); }} variant="outline" size="sm"><RefreshCw className="w-4 h-4 mr-1.5" /> New Plan</Button>
              </>
            )}
          </div>
        </div>

        {showHistory && !plan && !generating && (
          <div className="glass-card rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Previous Meal Plans</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map(h => (
                <button key={h.id} onClick={() => viewHistory(h)} className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors text-left">
                  <div><p className="text-sm font-medium">{h.days}-Day Plan · ₹{h.budget}/day</p><p className="text-xs text-muted-foreground">{formatTimeAgo(h.created_at)}</p></div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!plan && !generating && !showHistory && (
          <Questionnaire q={q} slide={slide} totalSlides={totalSlides} generating={generating} error={error} updateQ={updateQ} setSlide={setSlide} onGenerate={generate} />
        )}

        {generating && !plan && (
          <div className="space-y-4">
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-primary/5 border-b border-border/60 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-semibold">Generating {q.days}-day meal plan...</span>
              </div>
              <div ref={streamRef} className="p-4 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-muted-foreground">
                {streamText || "Starting..."}
              </div>
            </div>
          </div>
        )}

        {plan && (
          <PlanView
            plan={plan}
            collapsedDays={collapsedDays}
            expandedItems={expandedItems}
            checked={checked}
            numPeople={q.people}
            toggleDay={toggleDay}
            toggleItem={toggleItem}
            toggleCheck={toggleCheck}
            onFoodSelect={setSelectedFood}
          />
        )}

        {selectedFood && <FoodDetailModal item={selectedFood} onClose={() => setSelectedFood(null)} />}
      </div>
    </div>
  );
}
