"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, ShoppingCart, Calendar, AlertTriangle, CheckCircle, Download, Sparkles, Activity, Utensils, IndianRupee } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
type Plan = any;

function NavTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative
        ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
      {active && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(45,106,79,0.2)]" />}
    </button>
  );
}

function NutrientChip({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const color = pct >= 90 ? "text-emerald-500" : pct >= 70 ? "text-amber-500" : "text-red-500";
  return (
    <div className="text-center px-4 border-r border-border/40 last:border-0">
      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-black ${color}`}>{Math.round(value)}{unit}</p>
      <p className="text-[9px] font-bold text-muted-foreground/50">{pct}%</p>
    </div>
  );
}

export default function MealPlanPage() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [activeTab, setActiveTab] = useState<"plan"|"grocery">("plan");
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Form state
  const [days, setDays] = useState(7);
  const [budget, setBudget] = useState(300);
  const [people, setPeople] = useState(1);
  const [goal, setGoal] = useState("Maintenance");
  const [dietType, setDietType] = useState("VEG");

  const toggle = (key: string) => setExpandedSlots(p => ({ ...p, [key]: !p[key] }));
  const toggleCheck = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const generate = async () => {
    setGenerating(true); setError(null);
    try {
      const profile = user?.profile || {};
      const result = await apiFetch<Plan>("/api/meal-plan/generate", {
        method: "POST",
        body: JSON.stringify({
          days, budget_per_day_inr: budget, num_people: people,
          user_profile: { ...profile, goal, diet_type: dietType },
        }),
      });
      setPlan(result); setActiveDay(0); setActiveTab("plan");
    } catch (e: any) {
      setError(e.message || "Generation failed. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  const ca = plan?.customer_analysis;
  const dayPlan = plan?.days?.[activeDay];
  const MEAL_SLOTS = ["Breakfast","Mid-morning","Lunch","Snack","Dinner"];

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 fade-in font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">Clinical Meal Architecture</h1>
          <p className="text-muted-foreground font-medium tracking-tight">Precision-engineered meal protocols grounded in ICMR-NIN 2024 guidelines.</p>
        </div>
        {plan && (
          <Button onClick={generate} disabled={generating} variant="outline" className="rounded-full px-6 border-primary/20 hover:bg-primary/5 text-primary font-bold">
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} /> Regenerate Protocol
          </Button>
        )}
      </div>

      {/* Form Overhaul */}
      {!plan && (
        <div className="bg-card border border-border/50 rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
          
          <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-serif">Protocol Configuration</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tailored to your clinical profile</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Time Horizon</label>
                <select value={days} onChange={e => setDays(+e.target.value)} className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232D6A4F%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:14px] bg-[right_15px_center] bg-no-repeat">
                  {[3,5,7,14].map(d => <option key={d} value={d}>{d} Days</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Daily Investment (₹)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary text-sm">₹</span>
                  <input type="number" value={budget} onChange={e => setBudget(+e.target.value)} className="w-full bg-white border border-border rounded-2xl pl-10 pr-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary/40" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Cohort Size</label>
                <input type="number" min={1} max={10} value={people} onChange={e => setPeople(+e.target.value)} className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary/40" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Primary Objective</label>
                <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-white border border-border rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232D6A4F%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:14px] bg-[right_15px_center] bg-no-repeat">
                  {["Maintenance","Weight loss","Muscle gain","Heart health"].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-border/40">
               <div className="flex p-1 rounded-full bg-muted/30 border border-border/40">
                {["VEG","NON-VEG"].map(d => (
                  <button 
                    key={d} 
                    onClick={() => setDietType(d)} 
                    className={`px-8 py-2.5 rounded-full text-[10px] font-black tracking-widest transition-all ${dietType === d ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <Button 
                onClick={generate} 
                disabled={generating} 
                className="w-full md:w-auto rounded-full px-12 py-7 bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105"
              >
                {generating ? <><Loader2 className="w-5 h-5 animate-spin mr-3" /> Architecting...</> : <><Sparkles className="w-5 h-5 mr-3" /> Generate Protocol</>}
              </Button>
            </div>
            
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-sm font-bold text-red-600">
                <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results Rendering */}
      {plan && (
        <div className="space-y-10">
          
          {/* Scientific Analysis Context */}
          {ca && (
            <div className="bg-white border border-border/40 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="space-y-4 max-w-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Basis of Generation</p>
                    <h3 className="text-2xl font-serif">{ca.icmr_profile}</h3>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">"{ca.rationale}"</p>
                    {ca.key_risks?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ca.key_risks.map((r: string, i: number) => (
                          <span key={i} className="text-[10px] font-black px-3 py-1 rounded-full bg-accent/5 text-accent border border-accent/20 uppercase tracking-widest">{r}</span>
                        ))}
                      </div>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    {[
                      {l:"ENERGY", v:ca.energy_target, u:"kcal"},
                      {l:"PROTEIN", v:ca.protein_target, u:"g"},
                      {l:"IRON", v:ca.iron_target, u:"mg"},
                      {l:"CALCIUM", v:ca.calcium_target, u:"mg"}
                    ].map((m) => (
                      <div key={m.l} className="bg-muted/30 rounded-2xl p-4 border border-border/20 min-w-[120px]">
                        <p className="text-[9px] font-black text-muted-foreground mb-1 uppercase tracking-tighter">{m.l}</p>
                        <p className="text-xl font-black tracking-tighter">{m.v}<span className="text-[10px] ml-1 opacity-50">{m.u}</span></p>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-border/40 justify-center md:justify-start">
            <NavTab label="7-Day Strategic Plan" active={activeTab === "plan"} onClick={() => setActiveTab("plan")} />
            <NavTab label={`Inventory & Cost Strategy`} active={activeTab === "grocery"} onClick={() => setActiveTab("grocery")} />
          </div>

          {activeTab === "plan" && (
            <div className="space-y-8">
              {/* Day Selector */}
              <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                {plan.days?.map((d: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveDay(i)} 
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all
                      ${activeDay === i ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" : "bg-white border-border/40 text-muted-foreground hover:border-primary/20"}`}
                  >
                    <span>{d.day_label?.slice(0,3) || DAYS[i]?.slice(0,3)}</span>
                    {d.day_total?.cal && <div className="text-[8px] opacity-60 mt-1">{Math.round(d.day_total.cal)} kcal</div>}
                  </button>
                ))}
              </div>

              {dayPlan && (
                <div className="space-y-6">
                  {/* Day Header Context */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-[#0A2E28] text-white rounded-[32px] shadow-xl">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-1">Strategic Sequence</p>
                       <h2 className="text-3xl font-serif text-accent">{dayPlan.day_label} — Horizon Day {dayPlan.day}</h2>
                    </div>
                    <div className="flex gap-2">
                       {dayPlan.day_total && ca && (
                        <>
                          <NutrientChip label="ENERGY" value={dayPlan.day_total.cal} target={ca.energy_target} unit="" />
                          <NutrientChip label="PROTEIN" value={dayPlan.day_total.protein_g} target={ca.protein_target} unit="g" />
                          <NutrientChip label="IRON" value={dayPlan.day_total.iron_mg} target={ca.iron_target} unit="mg" />
                          <NutrientChip label="CALCIUM" value={dayPlan.day_total.calcium_mg} target={ca.calcium_target} unit="mg" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Meal Slot Cards */}
                  <div className="grid grid-cols-1 gap-6">
                    {MEAL_SLOTS.map((slot) => {
                      const meal = dayPlan.meals?.[slot];
                      if (!meal || !meal.foods?.length) return null;
                      const key = `${activeDay}-${slot}`;
                      const open = expandedSlots[key] !== false;
                      return (
                        <div key={slot} className="bg-card border border-border/40 rounded-[32px] overflow-hidden shadow-sm transition-all hover:shadow-md">
                          <button 
                            onClick={() => toggle(key)} 
                            className="w-full flex items-center justify-between p-8 hover:bg-muted/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-8">
                               <div className="space-y-1">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Sequence Slot</p>
                                 <p className="text-xl font-serif">{slot}</p>
                               </div>
                               <div className="flex gap-6">
                                 {meal.prep_time_min > 0 && (
                                   <div className="flex flex-col">
                                      <p className="text-[9px] font-black text-muted-foreground uppercase">Duration</p>
                                      <p className="text-sm font-bold">{meal.prep_time_min} Min</p>
                                   </div>
                                 )}
                                 {meal.meal_total?.cal && (
                                   <div className="flex flex-col">
                                      <p className="text-[9px] font-black text-muted-foreground uppercase">Yield</p>
                                      <p className="text-sm font-bold">{Math.round(meal.meal_total.cal)} Kcal</p>
                                   </div>
                                 )}
                               </div>
                            </div>
                            <div className={`p-2 rounded-full border border-border transition-transform duration-500 ${open ? 'rotate-180 bg-primary/5 border-primary/20' : ''}`}>
                               <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </button>
                          
                          {open && (
                            <div className="p-8 pt-0 fade-in">
                              <div className="overflow-x-auto rounded-2xl border border-border/40 bg-muted/10">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border/40 bg-muted/20">
                                      {["Curation Item","Yield","Kcal","Prot","Carb","Fat","Iron","Ca"].map(h => (
                                        <th key={h} className={`px-4 py-3 font-black text-muted-foreground uppercase text-[9px] tracking-widest ${h === "Curation Item" ? "text-left" : "text-right"}`}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {meal.foods.map((f: any, fi: number) => (
                                      <tr key={fi} className="border-b border-border/20 last:border-0 group">
                                        <td className="px-4 py-4 font-bold text-foreground/80 group-hover:text-primary transition-colors">{f.name}</td>
                                        <td className="px-4 py-4 text-right font-medium text-muted-foreground">{f.qty_label || `${f.qty_g}g`}</td>
                                        <td className="px-4 py-4 text-right font-black">{f.cal}</td>
                                        <td className="px-4 py-4 text-right font-bold text-primary/70">{f.protein_g}g</td>
                                        <td className="px-4 py-4 text-right font-medium text-muted-foreground">{f.carbs_g}g</td>
                                        <td className="px-4 py-4 text-right font-medium text-muted-foreground">{f.fat_g}g</td>
                                        <td className="px-4 py-4 text-right font-bold text-amber-600/80">{f.iron_mg}mg</td>
                                        <td className="px-4 py-4 text-right font-bold text-emerald-600/80">{f.calcium_mg}mg</td>
                                      </tr>
                                    ))}
                                    {meal.meal_total && (
                                      <tr className="bg-primary/5 font-black text-primary border-t-2 border-primary/20">
                                        <td className="px-4 py-4 uppercase tracking-widest text-[9px]">Composite Total</td>
                                        <td />
                                        <td className="px-4 py-4 text-right">{Math.round(meal.meal_total.cal)}</td>
                                        <td className="px-4 py-4 text-right">{meal.meal_total.protein_g?.toFixed(1)}g</td>
                                        <td className="px-4 py-4 text-right">{meal.meal_total.carbs_g?.toFixed(1)}g</td>
                                        <td className="px-4 py-4 text-right">{meal.meal_total.fat_g?.toFixed(1)}g</td>
                                        <td className="px-4 py-4 text-right">{meal.meal_total.iron_mg?.toFixed(1)}mg</td>
                                        <td className="px-4 py-4 text-right">{meal.meal_total.calcium_mg?.toFixed(0)}mg</td>
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
                </div>
              )}
            </div>
          )}

          {activeTab === "grocery" && (
            <div className="space-y-10 fade-in">
              <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-white border border-border/40 rounded-[32px] shadow-sm">
                <div>
                  <h2 className="text-2xl font-serif mb-2">Inventory Strategy</h2>
                  <p className="text-sm font-medium text-muted-foreground">Comprehensive logistical breakdown for {people} person(s).</p>
                </div>
                {plan.total_grocery_cost_inr && (
                  <div className="text-right flex flex-col items-center md:items-end">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Estimated Capital Outlay</p>
                    <div className="flex items-center gap-2">
                       <IndianRupee className="w-6 h-6 text-primary" />
                       <span className="text-4xl font-black tracking-tighter text-primary">{plan.total_grocery_cost_inr}</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 mt-1">₹{Math.round(plan.total_grocery_cost_inr / days)} Average Daily Yield</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {plan.grocery?.map((cat: any, ci: number) => (
                  <div key={ci} className="space-y-4">
                    <div className="flex items-center gap-4 ml-4">
                      <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">{cat.category}</span>
                      <div className="flex-1 h-[1px] bg-border/40" />
                    </div>
                    <div className="bg-card border border-border/40 rounded-[24px] overflow-hidden shadow-sm">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/20 border-b border-border/40">
                            <th className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Logistics Item</th>
                            <th className="px-5 py-4 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Volume</th>
                            <th className="px-5 py-4 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground pr-8">Valuation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items?.map((item: any, ii: number) => {
                            const ck = `${ci}-${ii}`;
                            return (
                              <tr key={ii} className="border-b border-border/20 last:border-0 group">
                                <td className="px-5 py-4">
                                  <label className="flex items-center gap-4 cursor-pointer group/label">
                                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all 
                                      ${checked[ck] ? "bg-primary border-primary" : "border-border/60 group-hover/label:border-primary/40"}`}>
                                      {checked[ck] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                      <input type="checkbox" checked={!!checked[ck]} onChange={() => toggleCheck(ck)} className="hidden" />
                                    </div>
                                    <span className={`font-bold transition-all ${checked[ck] ? "line-through text-muted-foreground opacity-50" : "text-foreground/80"}`}>{item.name}</span>
                                  </label>
                                </td>
                                <td className="px-5 py-4 text-center font-black text-muted-foreground/60">{item.qty}</td>
                                <td className="px-5 py-4 text-right font-black text-primary pr-8">₹{item.est_cost_inr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {plan.total_grocery_cost_inr && (
                <div className="p-8 bg-[#0A2E28] rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
                   <div className="flex items-center gap-6">
                      <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md">
                        <ShoppingCart className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <p className="text-xl font-serif text-white">Consolidated Procurement Strategy</p>
                        <p className="text-xs font-medium text-white/50">Estimates optimized for premium Indian municipal markets.</p>
                      </div>
                   </div>
                   <div className="text-center md:text-right">
                      <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-1">TOTAL VALUATION</p>
                      <p className="text-4xl font-black text-white tracking-tighter">₹{plan.total_grocery_cost_inr}</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
