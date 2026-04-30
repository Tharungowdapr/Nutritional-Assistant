"use client";
import { useState, useEffect } from "react";
import { Search, Plus, Clock, Users, ChevronLeft, Loader2, CheckCircle, AlertTriangle, Sparkles, Utensils, Activity, BrainCircuit } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────── */
interface Food { name: string; qty_g: number; qty_label: string; ifct_code?: string }
interface Nutrition { cal: number; protein_g: number; carbs_g: number; fat_g: number; iron_mg: number; calcium_mg: number; fibre_g: number }
interface Recipe {
  id?: string; name: string; title?: string; category: string; diet_type: "VEG"|"NON-VEG";
  region: string; prep_time_min: number; cook_time_min?: number; servings: number;
  cal: number; protein_g: number; carbs_g?: number; fat_g?: number; iron_mg: number; calcium_mg: number; fibre_g?: number;
  ifct_code?: string; icmr_match?: string; badge?: string; badge_color?: string;
  ingredients: (string | Food)[]; steps: string[];
  nutrition_per_serving?: Nutrition;
  ifct_note?: string; tips?: string[];
}

const RECIPES: Recipe[] = [
  { id:"r1", name:"Ragi Mudde + Sambar", category:"Breakfast", diet_type:"VEG", region:"Karnataka", prep_time_min:20, servings:2, cal:390, protein_g:11, carbs_g:74, fat_g:3.4, iron_mg:8.2, calcium_mg:620, fibre_g:6, ifct_code:"A010", icmr_match:"High Calcium · High Iron", badge:"High Calcium", badge_color:"purple",
    ingredients:["Ragi flour 160g","Water 400ml","Salt to taste","Toor dal 60g","Tamarind small piece","Tomato 1 medium","Drumstick pieces 50g","Mustard seeds, curry leaves, dried red chilli"],
    steps:["Boil salted water. Slowly add ragi flour while stirring continuously to avoid lumps.","Cook on low heat 8 min, stirring until stiff. Shape into 2 round balls.","For sambar: pressure cook toor dal 3 whistles. Temper mustard, curry leaves, add tamarind water.","Add cooked dal, tomato, drumstick. Simmer 10 min. Season with sambar powder."],
    ifct_note:"Ragi has 344mg calcium/100g — highest among Indian cereals. Source: IFCT 2017, NIN Hyderabad." },
  { id:"r2", name:"Rajma Rice Bowl", category:"Lunch", diet_type:"VEG", region:"North India", prep_time_min:15, cook_time_min:40, servings:2, cal:545, protein_g:20, carbs_g:109, fat_g:3.5, iron_mg:6.1, calcium_mg:134, fibre_g:8, ifct_code:"C020", icmr_match:"High Protein · High Iron", badge:"Iron + Protein", badge_color:"amber",
    ingredients:["Brown rice 150g","Rajma 100g (soaked overnight)","Onion 1 large","Tomato 2 medium","Ginger-garlic paste 1 tsp","Rajma masala, cumin, bay leaf","Coriander + lemon to serve"],
    steps:["Pressure cook soaked rajma 6–8 whistles until soft. Reserve cooking water.","Sauté onion golden brown. Add ginger-garlic, tomatoes. Cook until oil separates.","Add rajma, cooking water, masala. Simmer 15 min thick gravy.","Serve over brown rice. Squeeze lemon — Vit C triples iron absorption."],
    ifct_note:"Rajma: 130mg folate + 4.8mg iron per 100g (IFCT). Brown rice GI 55 vs white rice 72." },
  { id:"r3", name:"Bajra Roti + Methi Sabzi", category:"Dinner", diet_type:"VEG", region:"Rajasthan", prep_time_min:30, servings:2, cal:424, protein_g:13.8, carbs_g:77, fat_g:6.6, iron_mg:12.8, calcium_mg:228, fibre_g:7, ifct_code:"A005", icmr_match:"Highest Iron Roti", badge:"Highest Iron", badge_color:"red",
    ingredients:["Bajra flour 120g","Hot water to knead","Methi leaves 200g","Onion 1 small","Garlic 3 cloves","Mustard seeds, green chilli, salt","Oil 1 tsp"],
    steps:["Knead bajra flour with hot water into soft dough. Bajra doesn't bind like wheat — press firmly on tawa.","Cook thick rotis on iron tawa — no rolling pin, press by hand. Cook both sides well.","For methi: sauté garlic + mustard seeds. Add chopped methi, cook 5 min. Season.","Serve hot — bajra roti firms on cooling."],
    ifct_note:"Bajra: 8mg iron/100g. Methi: 3.2mg iron + 176mg calcium per 100g (IFCT). Together cover ~97% daily iron RDA." },
  { id:"r4", name:"Moong Dal Cheela", category:"Breakfast", diet_type:"VEG", region:"All India", prep_time_min:20, servings:3, cal:210, protein_g:14, carbs_g:32, fat_g:3.2, iron_mg:2.8, calcium_mg:48, fibre_g:4, ifct_code:"D001", icmr_match:"High Protein Breakfast", badge:"Fast Protein", badge_color:"teal",
    ingredients:["Yellow moong dal 100g (soaked 2h)","Green chilli 1","Ginger small piece","Cumin seeds ½ tsp","Coriander leaves","Salt, oil for cooking"],
    steps:["Blend soaked dal with chilli, ginger, cumin and minimal water to thick batter.","Season with salt, fold in chopped coriander.","Pour ladle on hot non-stick tawa. Spread thin. Drizzle oil on edges.","Cook 2–3 min per side until golden. Serve with green chutney."],
    ifct_note:"Moong dal: 24g protein/100g dry (IFCT). Faster than dosa with equal protein." },
];

const BADGE_COLORS: Record<string, string> = {
  purple: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  amber:  "bg-amber-500/10 text-amber-700 border-amber-500/20",
  red:    "bg-red-500/10 text-red-600 border-red-500/20",
  teal:   "bg-primary/10 text-primary border-primary/20",
  green:  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

function NutrientGrid({ recipe, rda }: { recipe: Recipe; rda?: any }) {
  const n = recipe.nutrition_per_serving || { cal: recipe.cal, protein_g: recipe.protein_g, carbs_g: recipe.carbs_g || 0, fat_g: recipe.fat_g || 0, iron_mg: recipe.iron_mg, calcium_mg: recipe.calcium_mg, fibre_g: recipe.fibre_g || 0 };
  const items = [
    { label: "Energy",  value: n.cal,        unit: " kcal", highlight: false, color: "var(--color-calories)" },
    { label: "Protein", value: n.protein_g,  unit: "g",     highlight: true,  color: "var(--color-protein)", pct: rda ? Math.round(n.protein_g / rda.protein_g * 100) : null },
    { label: "Carbs",   value: n.carbs_g,    unit: "g",     highlight: false, color: "var(--color-carbs)" },
    { label: "Fat",     value: n.fat_g,      unit: "g",     highlight: false, color: "var(--color-fat)" },
    { label: "Iron",    value: n.iron_mg,    unit: "mg",    highlight: true,  color: "var(--color-calories)", pct: rda ? Math.round(n.iron_mg / rda.iron_mg * 100) : null },
    { label: "Calcium", value: n.calcium_mg, unit: "mg",    highlight: true,  color: "var(--color-carbs)", pct: rda ? Math.round(n.calcium_mg / rda.calcium_mg * 100) : null },
    { label: "Fibre",   value: n.fibre_g,    unit: "g",     highlight: false, color: "var(--color-fibre)" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {items.map((m) => (
        <div key={m.label} className={`rounded-2xl p-3 text-center border ${m.highlight ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-muted/30 border-transparent"}`}>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-sm font-black tracking-tight" style={{ color: m.highlight ? "var(--primary)" : "inherit" }}>
            {m.value}<span className="text-[10px] ml-0.5 opacity-60 font-medium">{m.unit}</span>
          </p>
          {m.pct != null && <p className="text-[8px] font-bold text-muted-foreground mt-0.5">{m.pct}% RDA</p>}
        </div>
      ))}
    </div>
  );
}

function RecipeDetail({ recipe, onBack, rda }: { recipe: Recipe; onBack: () => void; rda?: any }) {
  const displayName = recipe.title || recipe.name;
  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-32 fade-in font-sans">
      <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest mb-8 hover:bg-primary/5">
        <ChevronLeft className="w-4 h-4" /> Return to Library
      </Button>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full border ${recipe.diet_type === "VEG" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>{recipe.diet_type}</span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-border text-muted-foreground uppercase tracking-wider">{recipe.category}</span>
            {recipe.badge && <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full border ${BADGE_COLORS[recipe.badge_color||"teal"]}`}>{recipe.badge}</span>}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">{displayName}</h1>
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
             <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {recipe.prep_time_min} Minutes</span>
             <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {recipe.servings} Servings</span>
             {recipe.ifct_code && <span className="text-primary/60 italic">IFCT {recipe.ifct_code}</span>}
          </div>
        </div>
        
        <div className="bg-card border border-border/40 p-6 rounded-[32px] shadow-sm text-center min-w-[140px]">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Energy Intensity</p>
          <p className="text-4xl font-black text-accent tracking-tighter">{recipe.cal}</p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">kcal / serving</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Nutrient Profile */}
        <div className="bg-white border border-border/40 rounded-[32px] p-8 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Macronutrient Profile</p>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                <CheckCircle className="w-3 h-3" /> IFCT 2017 Verified
              </div>
           </div>
           <NutrientGrid recipe={recipe} rda={rda} />
           {recipe.ifct_note && (
            <div className="mt-8 p-5 bg-primary/5 rounded-2xl border-l-4 border-primary/40 text-sm font-medium text-muted-foreground leading-relaxed italic">
              "{recipe.ifct_note}"
            </div>
          )}
        </div>

        {/* Preparation Details */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          <div className="lg:col-span-2 bg-card border border-border/40 rounded-[32px] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Curation of Ingredients</p>
            <div className="space-y-4">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 group">
                  <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors">{typeof ing === "string" ? ing : ing.name}</span>
                  {typeof ing !== "string" && <span className="text-xs font-black text-muted-foreground opacity-60">{ing.qty_label || `${ing.qty_g}g`}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-card border border-border/40 rounded-[32px] p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">Chef's Instructions</p>
            <div className="space-y-8">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className="w-10 h-10 rounded-2xl bg-muted text-muted-foreground text-sm font-black flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">{i+1}</div>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed pt-2">{step}</p>
                </div>
              ))}
            </div>
            {recipe.tips && recipe.tips.length > 0 && (
              <div className="mt-10 pt-8 border-t border-border/40 space-y-3">
                 <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Expert Recommendations</p>
                 {recipe.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10">
                      <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-accent/80 leading-relaxed">{tip}</p>
                    </div>
                 ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dietFilter, setDietFilter] = useState("All");
  const [goalFilter, setGoalFilter] = useState("All");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const rda = user?.profile ? { protein_g: 60, iron_mg: 17, calcium_mg: 600 } : null;

  const filtered = RECIPES.filter(r => {
    const q = search.toLowerCase();
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (category !== "All" && r.category !== category) return false;
    if (dietFilter !== "All" && r.diet_type !== dietFilter) return false;
    if (goalFilter === "High Iron" && r.iron_mg < 4) return false;
    if (goalFilter === "High Calcium" && r.calcium_mg < 150) return false;
    if (goalFilter === "High Protein" && r.protein_g < 12) return false;
    return true;
  });

  const generateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const result = await apiFetch<Recipe>("/api/meal-plan/recipe", {
        method: "POST",
        body: JSON.stringify({ instructions: aiPrompt }),
      });
      setAiModal(false);
      setSelected({ ...result, name: result.title || result.name || aiPrompt, iron_mg: result.nutrition_per_serving?.iron_mg || 0, calcium_mg: result.nutrition_per_serving?.calcium_mg || 0, cal: result.nutrition_per_serving?.cal || 0, protein_g: result.nutrition_per_serving?.protein_g || 0 });
    } catch (e: any) {
      setAiError(e.message || "Generation failed");
    } finally {
      setAiLoading(false);
    }
  };

  if (selected) return <RecipeDetail recipe={selected} onBack={() => setSelected(null)} rda={rda} />;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 fade-in font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">Culinary Masterpieces</h1>
          <p className="text-muted-foreground font-medium tracking-tight">Verified Indian recipes optimized for clinical nutritional targets.</p>
        </div>
        <Button onClick={() => setAiModal(true)} className="rounded-full px-8 py-6 bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105">
          <Plus className="w-4 h-4 mr-2" /> AI Recipe Crafter
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-8 mb-12">
        <div className="relative group max-w-2xl">
          <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-4 bg-white border border-border p-4 rounded-2xl shadow-sm focus-within:border-primary/30 transition-all">
            <Search className="w-5 h-5 text-primary shrink-0" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by ingredient or name..." 
              className="flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-muted-foreground/40" 
            />
          </div>
        </div>

        <div className="flex gap-4 flex-wrap pb-6 border-b border-border/40">
           <div className="flex items-center p-1 rounded-full bg-muted/30 border border-border/40">
            {["All","Breakfast","Lunch","Dinner","Snack"].map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${category === c ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
            ))}
          </div>
          <div className="flex items-center p-1 rounded-full bg-muted/30 border border-border/40">
            {["All","VEG","NON-VEG"].map(d => (
              <button key={d} onClick={() => setDietFilter(d)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${dietFilter === d ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{d}</button>
            ))}
          </div>
           <div className="flex items-center p-1 rounded-full bg-muted/30 border border-border/40">
            {["All","High Iron","High Calcium","High Protein"].map(g => (
              <button key={g} onClick={() => setGoalFilter(g)} className={`px-5 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${goalFilter === g ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-32 bg-muted/10 rounded-[32px] border border-dashed border-border">
          <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-serif">No recipes match your criteria</h3>
          <p className="text-sm text-muted-foreground font-medium">Try broadening your search or adjusting filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((r) => (
            <div 
              key={r.id} 
              onClick={() => setSelected(r)} 
              className="group bg-card border border-border/50 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 flex flex-col"
            >
              <div className="p-6 border-b border-border/30 bg-gradient-to-br from-primary/5 to-transparent relative">
                <div className="absolute top-4 right-4 group-hover:scale-110 transition-transform">
                  <div className="p-2 rounded-xl bg-white/80 backdrop-blur-sm border border-border/40 shadow-sm text-primary">
                    <Utensils className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border ${r.diet_type === "VEG" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/10" : "bg-red-500/10 text-red-600 border-red-500/10"}`}>{r.diet_type}</span>
                  {r.badge && <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border ${BADGE_COLORS[r.badge_color||"teal"]}`}>{r.badge}</span>}
                </div>
                <h3 className="font-serif text-lg leading-tight mb-2 group-hover:text-primary transition-colors">{r.name}</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{r.region} · {r.category}</p>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[{l:"ENERGY",v:`${r.cal} kcal`},{l:"PROTEIN",v:`${r.protein_g}g`},{l:"IRON",v:`${r.iron_mg}mg`},{l:"CALCIUM",v:`${r.calcium_mg}mg`}].map(m => (
                    <div key={m.l} className="bg-muted/30 rounded-xl p-2.5 border border-transparent group-hover:border-primary/5 transition-colors">
                      <p className="text-[8px] text-muted-foreground font-black tracking-tighter mb-1 uppercase">{m.l}</p>
                      <p className="text-xs font-black tracking-tight">{m.v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary/60">
                   <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.prep_time_min}m</span>
                   <span className="flex items-center gap-1">Details <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Modal Overhaul */}
      {aiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 fade-in" onClick={(e) => e.target === e.currentTarget && setAiModal(false)}>
          <div className="bg-card border border-border/50 rounded-[40px] p-10 w-full max-w-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 space-y-6">
              <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 inline-block">
                <BrainCircuit className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-serif luxury-text-gradient">AI Recipe Crafter</h2>
                <p className="text-sm font-medium text-muted-foreground">Describe your culinary vision—grounded in IFCT clinical precision.</p>
              </div>
              
              <div className="relative group">
                <textarea 
                  value={aiPrompt} 
                  onChange={e => setAiPrompt(e.target.value)} 
                  placeholder="e.g. 'Iron-rich vegetarian dinner using Ragi and Spinach, high protein, under 400 kcal'" 
                  className="w-full bg-white border border-border rounded-3xl p-6 text-base font-medium resize-none h-32 outline-none focus:border-primary/40 shadow-inner transition-all" 
                />
              </div>

              {aiError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs font-bold text-red-600">
                  <AlertTriangle className="w-4 h-4" /> {aiError}
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setAiModal(false)} className="flex-1 rounded-full py-6 font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted">Cancel</Button>
                <Button 
                  onClick={generateAI} 
                  disabled={aiLoading || !aiPrompt.trim()} 
                  className="flex-1 rounded-full py-6 font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  {aiLoading ? "Crafting..." : "Generate"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
