"use client";
import { useState, useEffect } from "react";
import { ChevronDown, Loader2, RefreshCw, ShoppingCart, Calendar, AlertTriangle, CheckCircle, Sparkles, MapPin, Cloud, MessageSquare, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { frontendLLM } from "@/lib/llm-provider";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
type Plan = any;

export default function MealPlanPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [activeTab, setActiveTab] = useState<"plan"|"grocery">("plan");
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState(300);
  const [people, setPeople] = useState(1);
  const [goal, setGoal] = useState("Maintenance");
  const [dietType, setDietType] = useState("VEG");
  const [suggestion, setSuggestion] = useState("");
  const [weatherContext, setWeatherContext] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");

  // Fetch Weather and Location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Get Weather
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const wData = await wRes.json();
          const temp = wData.current_weather?.temperature;
          const wcode = wData.current_weather?.weathercode;
          const condition = wcode === 0 ? "Clear" : wcode < 40 ? "Cloudy" : "Rain/Snow";
          setWeatherContext(`${temp}°C, ${condition}`);
          
          // Get Location Name (Reverse Geocoding)
          const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const locData = await locRes.json();
          setLocationName(locData.address?.city || locData.address?.town || locData.address?.state || "Unknown location");
        } catch (e) {
          console.warn("Failed to fetch location/weather", e);
        }
      }, () => console.log("Geolocation denied"));
    }
  }, []);

  const toggle = (key: string) => setExpandedSlots(p => ({ ...p, [key]: !p[key] }));
  const toggleCheck = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const profile = user?.profile || {};
      
      // We will construct a prompt locally and use the frontend LLM provider directly
      const wContext = weatherContext ? `Weather is ${weatherContext} in ${locationName}. Recommend seasonal foods.` : "";
      const sContext = suggestion ? `User specific suggestion/request: "${suggestion}".` : "";
      
      const prompt = `Generate a ${days}-day meal plan for ${people} person(s).
Diet: ${dietType}
Goal: ${goal}
Budget: ₹${budget}/day
${wContext}
${sContext}

Return ONLY valid JSON using this structure:
{"customer_analysis":{"icmr_profile":"","energy_target":2000,"protein_target":60,"iron_target":17,"calcium_target":1000,"fibre_target":30,"key_risks":[],"budget_per_day":"","rationale":""},"days":[{"day":1,"day_label":"Monday","meals":{"Breakfast":{"foods":[{"name":"","qty_g":0,"qty_label":"","ifct_code":"","cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}],"prep_time_min":0,"meal_total":{"cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}},"Lunch":{},"Dinner":{}},"day_total":{"cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}}],"grocery":[{"category":"","items":[{"name":"","qty":"","est_cost_inr":0,"used_for":""}]}],"total_grocery_cost_inr":0}`;

      const res = await frontendLLM.generate(prompt, "You are an expert Indian clinical nutritionist. Return only valid JSON.");
      
      if (res.error) throw new Error(res.error);
      
      let raw = res.content.trim();
      if (raw.includes("\`\`\`json")) raw = raw.split("\`\`\`json")[1].split("\`\`\`")[0];
      else if (raw.includes("\`\`\`")) raw = raw.split("\`\`\`")[1];
      
      const parsedPlan = JSON.parse(raw);
      setPlan(parsedPlan);
      setActiveDay(0);
      setActiveTab("plan");
    } catch (e: any) {
      console.error("LLM Generation Failed, using fallback", e);
      import("@/lib/fallback-recipes").then(({ getFallbackPlan }) => {
        setPlan(getFallbackPlan(days, dietType, budget));
        setActiveDay(0);
        setActiveTab("plan");
        setError("AI generation failed. A local fallback meal plan has been loaded instead.");
      });
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = () => {
    if (!plan) return;
    try {
      const flatPlan: any[] = [];
      plan.days?.forEach((d: any) => {
        Object.entries(d.meals || {}).forEach(([slot, meal]: any) => {
          meal.foods?.forEach((f: any) => {
            flatPlan.push({
              Day: d.day_label,
              Meal: slot,
              Food: f.name,
              Quantity: f.qty_label || `${f.qty_g}g`,
              Calories: f.cal,
              Protein: f.protein_g,
              Carbs: f.carbs_g,
              Fat: f.fat_g,
              Iron: f.iron_mg,
              Calcium: f.calcium_mg
            });
          });
        });
      });
      const ws = XLSX.utils.json_to_sheet(flatPlan);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Meal Plan");
      XLSX.writeFile(wb, "NutriSync_Meal_Plan.xlsx");
    } catch (e) {
      console.error("Export to Excel failed", e);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const ca = plan?.customer_analysis;
  const dayPlan = plan?.days?.[activeDay];
  const MEAL_SLOTS = ["Breakfast","Mid-morning","Lunch","Snack","Dinner"];

  return (
    <div className="flex-1 bg-background text-foreground md:pl-64">
      <style>{`
        @media print {
          aside, nav, button:not(.print-hide), .print-hide { display: none !important; }
          .md\\:pl-64 { padding-left: 0 !important; }
          body { background: white !important; color: black !important; }
          .bg-card { background: white !important; border: 1px solid #ccc !important; break-inside: avoid; }
        }
      `}</style>
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-20 md:pt-8 min-h-screen pb-24">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 print-hide">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Meal Planner</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated plans based on ICMR-NIN 2024 guidelines</p>
        </div>
        {plan && (
          <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-1.5 text-muted-foreground">
              <Download className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5 text-muted-foreground">
              <Download className="w-4 h-4" /> Excel
            </Button>
            <Button onClick={generate} disabled={generating} variant="outline" size="sm">
              <RefreshCw className={cn("w-4 h-4 mr-1.5", generating && "animate-spin")} /> Regenerate
            </Button>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      {!plan && (
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-8">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Configure Plan</h2>
              <p className="text-xs text-muted-foreground">Set your preferences</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Duration</label>
              <select value={days} onChange={e => setDays(+e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                {[3,5,7,14].map(d => <option key={d} value={d}>{d} Days</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Budget / Day (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">People</label>
              <input type="number" min={1} max={10} value={people} onChange={e => setPeople(+e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                {["Maintenance","Weight loss","Muscle gain","Heart health"].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            
            <div className="col-span-2 md:col-span-4 space-y-1.5 mt-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Additional Suggestions / Cravings
              </label>
              <Input 
                placeholder="E.g., I want to eat more paneer, avoid spicy food, recovering from fever..." 
                value={suggestion}
                onChange={e => setSuggestion(e.target.value)}
                className="bg-background h-10"
              />
            </div>
            
            {weatherContext && (
              <div className="col-span-2 md:col-span-4 flex items-center gap-4 text-xs font-medium text-primary bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {locationName}</div>
                <div className="flex items-center gap-1.5"><Cloud className="w-3.5 h-3.5" /> {weatherContext}</div>
                <span className="text-muted-foreground font-normal ml-auto hidden sm:inline">Will be used for seasonal recommendations</span>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
            <div className="flex p-0.5 rounded-md bg-muted border border-border">
              {["VEG","NON-VEG"].map(d => (
                <button
                  key={d}
                  onClick={() => setDietType(d)}
                  className={cn(
                    "px-4 py-1.5 rounded text-xs font-semibold transition-colors",
                    dietType === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <Button onClick={generate} disabled={generating} className="w-full md:w-auto">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/5 border border-destructive/10 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {plan && (
        <div className="space-y-6">

          {/* Analysis Banner */}
          {ca && (
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">Your ICMR Profile</p>
                <h3 className="text-base font-semibold">{ca.icmr_profile}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ca.rationale}</p>
                {ca.key_risks?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ca.key_risks.map((r: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{r}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 shrink-0">
                {[
                  {l:"Energy", v:ca.energy_target, u:"kcal"},
                  {l:"Protein", v:ca.protein_target, u:"g"},
                  {l:"Iron", v:ca.iron_target, u:"mg"},
                  {l:"Calcium", v:ca.calcium_target, u:"mg"}
                ].map((m) => (
                  <div key={m.l} className="bg-muted/50 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground font-medium">{m.l}</p>
                    <p className="text-lg font-bold">{m.v}<span className="text-xs ml-0.5 text-muted-foreground">{m.u}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { key: "plan" as const, label: "Meal Plan" },
              { key: "grocery" as const, label: "Grocery List" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "plan" && (
            <div className="space-y-6">
              {/* Day Selector */}
              <div className="flex gap-2 flex-wrap">
                {plan.days?.map((d: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-semibold border transition-colors",
                      activeDay === i
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {d.day_label?.slice(0,3) || DAYS[i]?.slice(0,3)}
                    {d.day_total?.cal && <span className="block text-[10px] opacity-70 mt-0.5">{Math.round(d.day_total.cal)} kcal</span>}
                  </button>
                ))}
              </div>

              {dayPlan && (
                <div className="space-y-4">
                  {/* Day Summary Bar */}
                  <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Day {dayPlan.day}</p>
                      <p className="text-base font-bold">{dayPlan.day_label}</p>
                    </div>
                    {dayPlan.day_total && (
                      <div className="flex gap-6 ml-auto">
                        {[
                          {l:"Energy", v:dayPlan.day_total.cal, u:"kcal", c:ca?.energy_target},
                          {l:"Protein", v:dayPlan.day_total.protein_g, u:"g", c:ca?.protein_target},
                          {l:"Iron", v:dayPlan.day_total.iron_mg, u:"mg", c:ca?.iron_target},
                          {l:"Calcium", v:dayPlan.day_total.calcium_mg, u:"mg", c:ca?.calcium_target},
                        ].map(n => {
                          const p = n.c ? Math.min(100, Math.round((n.v / n.c) * 100)) : 0;
                          return (
                            <div key={n.l} className="text-center hidden md:block">
                              <p className="text-[10px] text-muted-foreground">{n.l}</p>
                              <p className="text-sm font-bold">{Math.round(n.v)}<span className="text-[10px] text-muted-foreground ml-0.5">{n.u}</span></p>
                              <p className={cn("text-[10px] font-semibold", p >= 90 ? "text-emerald-600" : p >= 70 ? "text-amber-500" : "text-red-500")}>{p}%</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Meal Slots */}
                  {MEAL_SLOTS.map((slot) => {
                    const meal = dayPlan.meals?.[slot];
                    if (!meal || !meal.foods?.length) return null;
                    const key = `${activeDay}-${slot}`;
                    const open = expandedSlots[key] !== false;
                    return (
                      <div key={slot} className="bg-card border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggle(key)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm font-semibold">{slot}</p>
                              <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                                {meal.prep_time_min > 0 && <span>{meal.prep_time_min} min</span>}
                                {meal.meal_total?.cal && <span>{Math.round(meal.meal_total.cal)} kcal</span>}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                        </button>

                        {open && (
                          <div className="px-4 pb-4 fade-in">
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30">
                                    {["Food","Qty","Kcal","Protein","Carbs","Fat","Iron","Ca"].map(h => (
                                      <th key={h} className={cn("px-3 py-2 text-xs font-medium text-muted-foreground", h === "Food" ? "text-left" : "text-right")}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {meal.foods.map((f: any, fi: number) => (
                                    <tr key={fi} className="border-b border-border/50 last:border-0">
                                      <td className="px-3 py-2.5 font-medium">{f.name}</td>
                                      <td className="px-3 py-2.5 text-right text-muted-foreground">{f.qty_label || `${f.qty_g}g`}</td>
                                      <td className="px-3 py-2.5 text-right font-semibold">{f.cal}</td>
                                      <td className="px-3 py-2.5 text-right" style={{color:"var(--color-protein)"}}>{f.protein_g}g</td>
                                      <td className="px-3 py-2.5 text-right text-muted-foreground">{f.carbs_g}g</td>
                                      <td className="px-3 py-2.5 text-right text-muted-foreground">{f.fat_g}g</td>
                                      <td className="px-3 py-2.5 text-right font-medium text-amber-600">{f.iron_mg}mg</td>
                                      <td className="px-3 py-2.5 text-right font-medium text-indigo-500">{f.calcium_mg}mg</td>
                                    </tr>
                                  ))}
                                  {meal.meal_total && (
                                    <tr className="bg-primary/5 font-semibold text-primary border-t border-primary/20">
                                      <td className="px-3 py-2.5 text-xs">Total</td>
                                      <td />
                                      <td className="px-3 py-2.5 text-right">{Math.round(meal.meal_total.cal)}</td>
                                      <td className="px-3 py-2.5 text-right">{meal.meal_total.protein_g?.toFixed(1)}g</td>
                                      <td className="px-3 py-2.5 text-right">{meal.meal_total.carbs_g?.toFixed(1)}g</td>
                                      <td className="px-3 py-2.5 text-right">{meal.meal_total.fat_g?.toFixed(1)}g</td>
                                      <td className="px-3 py-2.5 text-right">{meal.meal_total.iron_mg?.toFixed(1)}mg</td>
                                      <td className="px-3 py-2.5 text-right">{meal.meal_total.calcium_mg?.toFixed(0)}mg</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "grocery" && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between p-5 bg-card border border-border rounded-xl">
                <div>
                  <h2 className="text-base font-semibold">Grocery List</h2>
                  <p className="text-sm text-muted-foreground">For {people} person(s), {days} days</p>
                </div>
                {plan.total_grocery_cost_inr && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Total estimate</p>
                    <p className="text-2xl font-bold text-primary">₹{plan.total_grocery_cost_inr}</p>
                    <p className="text-[10px] text-muted-foreground">₹{Math.round(plan.total_grocery_cost_inr / days)} / day</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {plan.grocery?.map((cat: any, ci: number) => (
                  <div key={ci} className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border">
                      <p className="text-xs font-semibold text-primary">{cat.category}</p>
                    </div>
                    <div className="divide-y divide-border">
                      {cat.items?.map((item: any, ii: number) => {
                        const ck = `${ci}-${ii}`;
                        return (
                          <label key={ii} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors">
                            <div className={cn(
                              "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                              checked[ck] ? "bg-primary border-primary" : "border-border"
                            )}>
                              {checked[ck] && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                              <input type="checkbox" checked={!!checked[ck]} onChange={() => toggleCheck(ck)} className="hidden" />
                            </div>
                            <span className={cn("flex-1 text-sm font-medium", checked[ck] && "line-through text-muted-foreground")}>{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.qty}</span>
                            <span className="text-sm font-semibold text-primary">₹{item.est_cost_inr}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
