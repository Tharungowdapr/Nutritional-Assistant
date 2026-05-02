"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, RefreshCw, MessageSquare, Sparkles,
  MapPin, Cloud, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, UtensilsCrossed,
  Target, Flame, TrendingUp, ShoppingCart,
  History, Clock, X, ArrowLeft, ArrowRight,
  Heart, Zap, Droplets, Moon, Dumbbell,
  ChefHat, ThumbsUp, ThumbsDown, Coffee,
  Clock as ClockIcon, Wheat, Leaf, Scale, Download, FileSpreadsheet, FileText
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

interface FoodItem {
  name: string;
  qty: string;
  cal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  iron_mg?: number;
  calcium_mg?: number;
  note?: string;
}
interface DayPlan {
  day: number;
  label: string;
  breakfast: FoodItem[];
  mid_morning: FoodItem[];
  lunch: FoodItem[];
  snack: FoodItem[];
  dinner: FoodItem[];
  cal_approx?: number;
}
interface GroceryCategory {
  category: string;
  items: { name: string; qty: string; cost_inr: number }[];
}
interface MealPlan {
  summary: string;
  days: DayPlan[];
  grocery: GroceryCategory[];
  grocery_total_inr: number;
  parse_error?: boolean;
}
interface SavedPlan {
  id: number;
  plan: MealPlan;
  days: number;
  budget: number;
  created_at: string;
}

interface QuestionnaireState {
  days: number;
  budget: number;
  people: number;
  goal: string;
  dietType: string;
  allergies: string;
  favoriteFoods: string;
  dislikedFoods: string;
  spiceLevel: string;
  cookingTime: string;
  mealFrequency: string;
  snacksPreference: string;
  beverages: string;
  healthConditions: string;
  activityLevel: string;
  sleepHours: string;
  stressLevel: string;
  hydrationLevel: string;
  exerciseFreq: string;
  weightGoal: string;
  specialRequirements: string;
  suggestions: string;
}

const SLOTS: { key: keyof DayPlan; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "mid_morning", label: "Mid-morning", icon: "☕" },
  { key: "lunch", label: "Lunch", icon: "🍛" },
  { key: "snack", label: "Snack", icon: "🥜" },
  { key: "dinner", label: "Dinner", icon: "🌙" },
];

const NUTRI_COLORS: Record<string, string> = {
  energy: "var(--color-calories)",
  protein: "var(--color-protein)",
  carbs: "var(--color-carbs)",
  fat: "var(--color-fat)",
  iron: "#F59E0B",
  calcium: "#6366F1",
};

const DEFAULT_Q: QuestionnaireState = {
  days: 7, budget: 300, people: 1, goal: "Maintenance", dietType: "VEG",
  allergies: "", favoriteFoods: "", dislikedFoods: "", spiceLevel: "Medium",
  cookingTime: "30 min", mealFrequency: "3", snacksPreference: "Healthy",
  beverages: "Tea/Coffee", healthConditions: "", activityLevel: "Sedentary",
  sleepHours: "7", stressLevel: "Moderate", hydrationLevel: "6-8 glasses",
  exerciseFreq: "None", weightGoal: "Maintain", specialRequirements: "", suggestions: "",
};

function FoodDetail({ item, onClose }: { item: FoodItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{item.name}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{item.qty}</p>
        {item.note && <p className="text-xs text-muted-foreground italic mb-4 p-2 bg-muted/40 rounded-lg">{item.note}</p>}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { l: "Energy", v: item.cal, u: "kcal" },
            { l: "Protein", v: item.protein_g, u: "g" },
            { l: "Carbs", v: item.carbs_g, u: "g" },
            { l: "Fat", v: item.fat_g, u: "g" },
            { l: "Iron", v: item.iron_mg, u: "mg" },
            { l: "Calcium", v: item.calcium_mg, u: "mg" },
          ].filter(m => m.v !== undefined).map(m => (
            <div key={m.l} className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">{m.l}</p>
              <p className="text-xs font-bold">{m.v}<span className="text-[9px] text-muted-foreground ml-0.5">{m.u}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ label, icon: Icon, description, children }: { label: string; icon?: any; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </label>
      {description && <p className="text-[10px] text-muted-foreground/70">{description}</p>}
      {children}
    </div>
  );
}

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
  const [weatherContext, setWeatherContext] = useState("");
  const [locationName, setLocationName] = useState("");

  // Questionnaire state
  const [slide, setSlide] = useState(0);
  const [q, setQ] = useState<QuestionnaireState>(DEFAULT_Q);
  const totalSlides = 3;

  const streamRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadHistory = useCallback(async () => {
    const token = localStorage.getItem("nutrisync_token");
    try {
      const res = await fetch(`${API_BASE}/api/meal-plan/history?limit=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.plans || []);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const wData = await wRes.json();
          const temp = wData.current_weather?.temperature;
          const wcode = wData.current_weather?.weathercode;
          const condition = wcode === 0 ? "Clear" : wcode < 40 ? "Cloudy" : "Rain/Snow";
          setWeatherContext(`${temp}°C, ${condition}`);
          const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const locData = await locRes.json();
          setLocationName(locData.address?.city || locData.address?.town || locData.address?.state || "");
        } catch (e) {}
      }, () => {});
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streamText]);

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
      q.allergies ? `Allergies: ${q.allergies}` : "",
      q.favoriteFoods ? `Favorite foods: ${q.favoriteFoods}` : "",
      q.dislikedFoods ? `Disliked foods: ${q.dislikedFoods}` : "",
      `Spice level: ${q.spiceLevel}`,
      `Cooking time per meal: ${q.cookingTime}`,
      `Meals per day: ${q.mealFrequency}`,
      `Snacks: ${q.snacksPreference}`,
      `Beverages: ${q.beverages}`,
      q.healthConditions ? `Health conditions: ${q.healthConditions}` : "",
      `Activity: ${q.activityLevel}`,
      `Sleep: ${q.sleepHours} hrs/night`,
      `Stress: ${q.stressLevel}`,
      `Hydration: ${q.hydrationLevel}`,
      `Exercise: ${q.exerciseFreq}`,
      `Weight goal: ${q.weightGoal}`,
      q.specialRequirements ? `Special requirements: ${q.specialRequirements}` : "",
      q.suggestions ? `Other: ${q.suggestions}` : "",
    ].filter(Boolean).join(". ");

    try {
      const res = await fetch(`${API_BASE}/api/meal-plan/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          days: q.days, num_people: q.people, budget_per_day_inr: q.budget,
          suggestions: suggestions || undefined,
          user_profile: { ...user?.profile, diet_type: q.dietType, goal: q.goal },
        }),
      });
      if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) setStreamText(prev => prev + parsed.token);
            if (parsed.final && parsed.plan) {
              setPlan(parsed.plan);
              loadHistory();
            }
          } catch (e) {}
        }
      }
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

  const updateQ = (field: keyof QuestionnaireState, value: string | number) => {
    setQ(prev => ({ ...prev, [field]: value }));
  };

  const exportToExcel = useCallback(() => {
    if (!plan) return;
    
    const wb = XLSX.utils.book_new();
    
    // Days sheet
    const daysData = [];
    for (const day of plan.days || []) {
      for (const slot of SLOTS) {
        const items = day[slot.key] as FoodItem[] || [];
        for (const item of items) {
          daysData.push({
            Day: day.day,
            DayLabel: day.label,
            Meal: slot.label,
            Food: item.name,
            Quantity: item.qty,
            Calories: item.cal || 0,
            Protein_g: item.protein_g || 0,
            Carbs_g: item.carbs_g || 0,
            Fat_g: item.fat_g || 0,
          });
        }
      }
    }
    const daysSheet = XLSX.utils.json_to_sheet(daysData);
    XLSX.utils.book_append_sheet(wb, daysSheet, "Meals");
    
    // Grocery sheet
    const groceryData = [];
    for (const cat of plan.grocery || []) {
      for (const item of cat.items || []) {
        groceryData.push({
          Category: cat.category,
          Item: item.name,
          Quantity: item.qty,
          Cost_INR: item.cost_inr,
        });
      }
    }
    if (groceryData.length > 0) {
      const grocerySheet = XLSX.utils.json_to_sheet(groceryData);
      XLSX.utils.book_append_sheet(wb, grocerySheet, "Grocery");
    }
    
    // Summary sheet
    const summaryData = [
      { Label: "Summary", Value: plan.summary || "" },
      { Label: "Total Days", Value: plan.days?.length || 0 },
      { Label: "Grocery Total (INR)", Value: plan.grocery_total_inr || 0 },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
    
    XLSX.writeFile(wb, `meal-plan-${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [plan]);

  const exportToPDF = useCallback(() => {
    if (!plan) return;
    
    const doc = new jsPDF();
    let y = 20;
    
    // Title
    doc.setFontSize(18);
    doc.text("AaharAI Meal Plan", 105, y, { align: "center" });
    y += 10;
    
    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(plan.summary || "Meal plan", 180);
    doc.text(summaryLines, 14, y + 6);
    y += 20 + summaryLines.length * 4;
    
    // Days
    for (const day of plan.days || []) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Day ${day.day} - ${day.label}`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 6;
      
      for (const slot of SLOTS) {
        const items = day[slot.key] as FoodItem[] || [];
        if (items.length === 0) continue;
        
        doc.text(`${slot.label}:`, 14, y);
        y += 4;
        
        for (const item of items) {
          const itemText = `  - ${item.name} (${item.qty}) ${item.cal || 0}kcal`;
          doc.text(itemText, 14, y);
          y += 4;
        }
      }
      y += 4;
    }
    
    // Grocery
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Grocery List", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    for (const cat of plan.grocery || []) {
      doc.setFont("helvetica", "bold");
      doc.text(cat.category, 14, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      
      for (const item of cat.items || []) {
        doc.text(`  - ${item.name}: ${item.qty} (₹${item.cost_inr})`, 14, y);
        y += 4;
      }
      y += 2;
    }
    
    if (plan.grocery_total_inr) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ₹${plan.grocery_total_inr}`, 14, y);
    }
    
    doc.save(`meal-plan-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [plan]);

  return (
    <div className="flex-1 bg-background text-foreground md:pl-64">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-20 md:pt-8 min-h-screen pb-24">

        {/* Header */}
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
                <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-1">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-1">
                  <FileText className="w-4 h-4" /> PDF
                </Button>
                <Button onClick={() => { setPlan(null); setStreamText(""); setSlide(0); }} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> New Plan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && !plan && !generating && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Previous Meal Plans
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map(h => (
                <button
                  key={h.id}
                  onClick={() => viewHistory(h)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium">{h.days}-Day Plan · ₹{h.budget}/day</p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(h.created_at)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Questionnaire */}
        {!plan && !generating && !showHistory && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Progress Bar */}
            <div className="h-1 bg-muted">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((slide + 1) / totalSlides) * 100}%` }} />
            </div>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Step {slide + 1} of {totalSlides}</span>
              <div className="flex gap-1">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", i <= slide ? "bg-primary" : "bg-muted")} />
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Slide 1: Basics */}
              {slide === 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-bold">Plan Basics</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <QuestionCard label="Duration" icon={ClockIcon}>
                      <select value={q.days} onChange={e => updateQ("days", +e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                        {[3, 5, 7, 14].map(d => <option key={d} value={d}>{d} Days</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Budget / Day" icon={Scale}>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                        <input type="number" value={q.budget} onChange={e => updateQ("budget", +e.target.value)} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
                      </div>
                    </QuestionCard>
                    <QuestionCard label="People" icon={Heart}>
                      <input type="number" min={1} max={10} value={q.people} onChange={e => updateQ("people", +e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
                    </QuestionCard>
                    <QuestionCard label="Primary Goal" icon={Zap}>
                      <select value={q.goal} onChange={e => updateQ("goal", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                        {["Maintenance", "Weight loss", "Muscle gain", "Heart health", "Diabetes management"].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </QuestionCard>
                  </div>
                  <QuestionCard label="Diet Type">
                    <div className="flex gap-2 mt-2">
                      {["VEG", "NON-VEG", "VEGAN"].map(d => (
                        <button key={d} onClick={() => updateQ("dietType", d)}
                          className={cn("px-4 py-2 rounded-lg text-xs font-semibold border transition-colors", q.dietType === d ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{d}</button>
                      ))}
                    </div>
                  </QuestionCard>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuestionCard label="Weight Goal">
                      <select value={q.weightGoal} onChange={e => updateQ("weightGoal", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["Maintain", "Lose weight", "Gain muscle", "Improve fitness"].map(g => <option key={g}>{g}</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Activity Level" icon={Dumbbell}>
                      <select value={q.activityLevel} onChange={e => updateQ("activityLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["Sedentary", "Light", "Moderate", "Active", "Heavy"].map(a => <option key={a}>{a}</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Exercise Frequency">
                      <select value={q.exerciseFreq} onChange={e => updateQ("exerciseFreq", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["None", "1-2x/week", "3-4x/week", "5+ x/week"].map(e => <option key={e}>{e}</option>)}
                      </select>
                    </QuestionCard>
                  </div>
                </>
              )}

              {/* Slide 2: Food Preferences */}
              {slide === 1 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-bold">Food Preferences</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuestionCard label="Favorite Foods" icon={ThumbsUp} description="Foods you love and want included">
                      <Input placeholder="E.g., paneer, dal, idli, chicken biryani..." value={q.favoriteFoods} onChange={e => updateQ("favoriteFoods", e.target.value)} className="bg-background h-10" />
                    </QuestionCard>
                    <QuestionCard label="Disliked Foods" icon={ThumbsDown} description="Foods to avoid in your plan">
                      <Input placeholder="E.g., fish, bitter gourd, eggs..." value={q.dislikedFoods} onChange={e => updateQ("dislikedFoods", e.target.value)} className="bg-background h-10" />
                    </QuestionCard>
                    <QuestionCard label="Food Allergies / Intolerances" icon={AlertTriangle} description="Critical — these will be excluded">
                      <Input placeholder="E.g., peanuts, gluten, dairy, soy..." value={q.allergies} onChange={e => updateQ("allergies", e.target.value)} className="bg-background h-10" />
                    </QuestionCard>
                    <QuestionCard label="Spice Level" icon={Leaf}>
                      <div className="flex gap-2 mt-2">
                        {["Mild", "Medium", "Spicy", "Extra Spicy"].map(s => (
                          <button key={s} onClick={() => updateQ("spiceLevel", s)}
                            className={cn("px-3 py-1.5 rounded text-xs font-semibold border transition-colors", q.spiceLevel === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{s}</button>
                        ))}
                      </div>
                    </QuestionCard>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuestionCard label="Cooking Time Per Meal" icon={ClockIcon}>
                      <select value={q.cookingTime} onChange={e => updateQ("cookingTime", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["15 min", "30 min", "45 min", "1 hour+", "No cooking (ready-to-eat)"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Meals Per Day">
                      <select value={q.mealFrequency} onChange={e => updateQ("mealFrequency", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["2", "3", "4", "5 (small frequent meals)"].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Snack Preference">
                      <select value={q.snacksPreference} onChange={e => updateQ("snacksPreference", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["Healthy (nuts, fruits)", "Traditional (samosa, pakoda)", "Protein-rich", "Light (tea, biscuits)", "None"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </QuestionCard>
                  </div>
                  <QuestionCard label="Beverage Habits" icon={Coffee}>
                    <Input placeholder="E.g., tea 2x/day, black coffee, buttermilk, fresh juice..." value={q.beverages} onChange={e => updateQ("beverages", e.target.value)} className="bg-background h-10" />
                  </QuestionCard>
                </>
              )}

              {/* Slide 3: Health & Lifestyle */}
              {slide === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-bold">Health & Lifestyle</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <QuestionCard label="Health Conditions" icon={Heart} description="Any diagnosed conditions">
                      <Input placeholder="E.g., diabetes, PCOS, thyroid, hypertension..." value={q.healthConditions} onChange={e => updateQ("healthConditions", e.target.value)} className="bg-background h-10" />
                    </QuestionCard>
                    <QuestionCard label="Special Requirements" icon={Wheat} description="Fasting, religious diets, etc.">
                      <Input placeholder="E.g., Jain diet, intermittent fasting..." value={q.specialRequirements} onChange={e => updateQ("specialRequirements", e.target.value)} className="bg-background h-10" />
                    </QuestionCard>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <QuestionCard label="Sleep Hours / Night" icon={Moon}>
                      <select value={q.sleepHours} onChange={e => updateQ("sleepHours", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["< 5", "5-6", "7", "8", "9+"].map(s => <option key={s}>{s} hours</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Stress Level">
                      <select value={q.stressLevel} onChange={e => updateQ("stressLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["Low", "Moderate", "High", "Very High"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </QuestionCard>
                    <QuestionCard label="Daily Water Intake" icon={Droplets}>
                      <select value={q.hydrationLevel} onChange={e => updateQ("hydrationLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                        {["< 4 glasses", "4-6 glasses", "6-8 glasses", "8+ glasses"].map(h => <option key={h}>{h}</option>)}
                      </select>
                    </QuestionCard>
                  </div>
                  <QuestionCard label="Additional Suggestions" icon={MessageSquare}>
                    <Input placeholder="Anything else we should know..." value={q.suggestions} onChange={e => updateQ("suggestions", e.target.value)} className="bg-background h-10" />
                  </QuestionCard>
                </>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setSlide(s => Math.max(0, s - 1))}
                  disabled={slide === 0}
                  className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors", slide === 0 ? "text-muted-foreground/30 cursor-not-allowed" : "text-primary hover:bg-primary/5")}
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button key={i} onClick={() => setSlide(i)} className={cn("w-2 h-2 rounded-full transition-colors", i === slide ? "bg-primary" : "bg-muted hover:bg-primary/30")} />
                  ))}
                </div>
                {slide < totalSlides - 1 ? (
                  <button
                    onClick={() => setSlide(s => Math.min(totalSlides - 1, s + 1))}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-primary hover:bg-primary/5 transition-colors"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button onClick={generate} disabled={generating} className="gap-2">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Generate {q.days}-Day Plan
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 border-t border-border bg-destructive/5 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Streaming Indicator */}
        {generating && !plan && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-semibold">Generating {q.days}-day meal plan...</span>
              </div>
              <div ref={streamRef} className="p-4 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto text-muted-foreground">
                {streamText || "Starting..."}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {plan && (
          <div className="space-y-6">

            {/* Summary */}
            {plan.summary && (
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold">Your Personalized Plan</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.summary}</p>
              </div>
            )}

            {plan.parse_error && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4 shrink-0" /> The AI response could not be fully parsed. Showing available data.
              </div>
            )}

            {/* Day Plans */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">{(plan.days || []).length}-Day Meal Plan</h2>
              </div>
              <div className="space-y-3">
                {plan.days?.map((day) => {
                  const collapsed = collapsedDays[day.day];
                  const totalCal = day.cal_approx || 0;
                  const totalProtein = day.breakfast?.concat(day.mid_morning || [], day.lunch || [], day.snack || [], day.dinner || []).reduce((s, i) => s + (i.protein_g || 0), 0);
                  return (
                    <div key={day.day} className="bg-card border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleDay(day.day)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">Day {day.day}</span>
                          <span className="text-sm font-semibold">{day.label}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flame className="w-3 h-3" /> ~{totalCal} kcal
                          </span>
                          {totalProtein > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> {totalProtein.toFixed(0)}g protein
                            </span>
                          )}
                        </div>
                        {collapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {!collapsed && (
                        <div className="border-t border-border">
                          {SLOTS.map(slot => {
                            const items = day[slot.key] as FoodItem[];
                            if (!items?.length) return null;
                            return (
                              <div key={slot.key} className="px-4 py-3 border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-sm shrink-0 w-28">{slot.icon} {slot.label}</span>
                                </div>
                                <div className="ml-28 space-y-2">
                                  {items.map((item, i) => {
                                    const ik = `${day.day}-${slot.key}-${i}`;
                                    const expanded = expandedItems[ik];
                                    return (
                                      <div key={ik} className="border border-border/60 rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/20 cursor-pointer" onClick={() => toggleItem(ik)}>
                                          <div>
                                            <span className="text-sm font-medium">{item.name}</span>
                                            <span className="text-muted-foreground text-xs ml-2">({item.qty})</span>
                                            {item.note && <span className="text-xs text-muted-foreground ml-2 italic hidden md:inline">{item.note.substring(0, 40)}...</span>}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {item.cal && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600">{item.cal} kcal</span>}
                                            {item.protein_g && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">{item.protein_g}g P</span>}
                                            {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                                          </div>
                                        </div>
                                        {expanded && (
                                          <div className="px-3 py-2.5 bg-muted/20 border-t border-border/50">
                                            {item.note && <p className="text-xs text-muted-foreground mb-2 italic">{item.note}</p>}
                                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                              {[
                                                { l: "Energy", v: item.cal, u: "kcal" },
                                                { l: "Protein", v: item.protein_g, u: "g" },
                                                { l: "Carbs", v: item.carbs_g, u: "g" },
                                                { l: "Fat", v: item.fat_g, u: "g" },
                                                { l: "Iron", v: item.iron_mg, u: "mg" },
                                                { l: "Calcium", v: item.calcium_mg, u: "mg" },
                                              ].filter(m => m.v !== undefined).map(m => (
                                                <div key={m.l} className="bg-muted/40 rounded p-1.5 text-center">
                                                  <p className="text-[9px] text-muted-foreground">{m.l}</p>
                                                  <p className="text-xs font-bold" style={{ color: NUTRI_COLORS[m.l.toLowerCase()] || "inherit" }}>{m.v}<span className="text-[8px] text-muted-foreground ml-0.5">{m.u}</span></p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grocery List */}
            {plan.grocery && plan.grocery.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-primary/5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold">Grocery List</h2>
                    <span className="text-xs text-muted-foreground">For {(plan.days || []).length} days, {q.people} person(s)</span>
                  </div>
                  {plan.grocery_total_inr && (
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">₹{plan.grocery_total_inr}</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plan.grocery.map((cat, ci) => (
                      <div key={ci} className="border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-muted/40 border-b border-border">
                          <p className="text-xs font-semibold text-primary">{cat.category}</p>
                        </div>
                        <div className="divide-y divide-border/50">
                          {cat.items.map((item, ii) => {
                            const ck = `${ci}-${ii}`;
                            return (
                              <label key={ii} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/20 transition-colors">
                                <div className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0", checked[ck] ? "bg-primary border-primary" : "border-border")}>
                                  {checked[ck] && <CheckCircle className="w-2.5 h-2.5 text-primary-foreground" />}
                                  <input type="checkbox" checked={!!checked[ck]} onChange={() => toggleCheck(ck)} className="hidden" />
                                </div>
                                <span className={cn("flex-1 text-xs font-medium", checked[ck] && "line-through text-muted-foreground")}>{item.name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{item.qty}</span>
                                <span className="text-xs font-semibold text-primary shrink-0">₹{item.cost_inr}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedFood && <FoodDetail item={selectedFood} onClose={() => setSelectedFood(null)} />}
      </div>
    </div>
  );
}
