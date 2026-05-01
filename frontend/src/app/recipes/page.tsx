"use client";
import { useState, useEffect } from "react";
import { Search, Plus, Clock, Users, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Sparkles, Utensils, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { frontendLLM } from "@/lib/llm-provider";
import { Button } from "@/components/ui/button";
import { cn, getStorageKey } from "@/lib/utils";

interface Recipe {
  id?: string; name: string; title?: string; category: string; diet_type: "VEG"|"NON-VEG";
  region: string; prep_time_min: number; servings: number;
  cal: number; protein_g: number; carbs_g?: number; fat_g?: number; iron_mg: number; calcium_mg: number; fibre_g?: number;
  ifct_code?: string; icmr_match?: string; badge?: string; badge_color?: string;
  ingredients: (string | any)[]; steps: string[];
  nutrition_per_serving?: any; ifct_note?: string; tips?: string[];
}

import RECIPES_DATA from "@/lib/recipes-db.json";
const RECIPES: Recipe[] = RECIPES_DATA as Recipe[];

const BADGE_COLORS: Record<string, string> = {
  purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  teal: "bg-primary/10 text-primary",
};

function RecipeDetail({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const n = recipe.nutrition_per_serving || { cal: recipe.cal, protein_g: recipe.protein_g, carbs_g: recipe.carbs_g || 0, fat_g: recipe.fat_g || 0, iron_mg: recipe.iron_mg, calcium_mg: recipe.calcium_mg, fibre_g: recipe.fibre_g || 0 };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 fade-in">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-6 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Back to recipes
      </button>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", recipe.diet_type === "VEG" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600")}>{recipe.diet_type}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">{recipe.category}</span>
              {recipe.badge && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", BADGE_COLORS[recipe.badge_color||"teal"])}>{recipe.badge}</span>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">{recipe.title || recipe.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {recipe.prep_time_min} min</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {recipe.servings} servings</span>
              {recipe.ifct_code && <span className="text-primary/60">IFCT {recipe.ifct_code}</span>}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center shrink-0">
            <p className="text-xs text-muted-foreground mb-0.5">per serving</p>
            <p className="text-3xl font-bold" style={{color:"var(--color-calories)"}}>{recipe.cal}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
        </div>

        {/* Nutrition */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-medium text-muted-foreground mb-4">Nutrition per serving</p>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {[
              { label: "Energy", value: n.cal, unit: "kcal", color: "var(--color-calories)" },
              { label: "Protein", value: n.protein_g, unit: "g", color: "var(--color-protein)" },
              { label: "Carbs", value: n.carbs_g, unit: "g", color: "var(--color-carbs)" },
              { label: "Fat", value: n.fat_g, unit: "g", color: "var(--color-fat)" },
              { label: "Iron", value: n.iron_mg, unit: "mg", color: "#F59E0B" },
              { label: "Calcium", value: n.calcium_mg, unit: "mg", color: "#6366F1" },
              { label: "Fibre", value: n.fibre_g, unit: "g", color: "var(--color-fibre)" },
            ].map(m => (
              <div key={m.label} className="p-3 rounded-lg bg-muted/40 text-center">
                <p className="text-[10px] text-muted-foreground font-medium mb-1">{m.label}</p>
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}<span className="text-[10px] text-muted-foreground ml-0.5">{m.unit}</span></p>
              </div>
            ))}
          </div>
          {recipe.ifct_note && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg border-l-2 border-primary/40 text-sm text-muted-foreground italic">
              {recipe.ifct_note}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-medium text-muted-foreground mb-4">Ingredients</p>
            <div className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-sm">{typeof ing === "string" ? ing : ing.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
            <p className="text-xs font-medium text-muted-foreground mb-4">Instructions</p>
            <div className="space-y-4">
              {recipe.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">{i+1}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
            {recipe.tips && recipe.tips.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border space-y-2">
                <p className="text-xs font-medium text-accent">Tips</p>
                {recipe.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                    <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{tip}</p>
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

  const [allRecipes, setAllRecipes] = useState<Recipe[]>(RECIPES);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const saved = localStorage.getItem(getStorageKey("custom_recipes", user.id));
      if (saved) {
        setAllRecipes(prev => [...JSON.parse(saved), ...prev]);
      }
    } catch (e) {}
  }, [user?.id]);

  const filtered = allRecipes.filter(r => {
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
      const prompt = `Generate a highly detailed Indian recipe for: "${aiPrompt}".
Return ONLY a valid JSON object matching this exact structure (no markdown tags):
{
  "id": "ai_generated",
  "name": "Recipe Name",
  "category": "Breakfast, Lunch, Dinner, or Snack",
  "diet_type": "VEG" or "NON-VEG",
  "region": "Indian Region",
  "prep_time_min": 30,
  "servings": 2,
  "cal": 400,
  "protein_g": 15,
  "iron_mg": 5,
  "calcium_mg": 100,
  "badge": "High Protein" (or High Iron, etc),
  "badge_color": "teal" (teal for protein, red for iron, purple for calcium),
  "ingredients": [
    "200g specific ingredient with detailed prep instructions (e.g. finely chopped)",
    "1 tbsp specific spice"
  ],
  "steps": [
    "Aromatics Extraction: detailed instruction...",
    "Base Building: detailed instruction..."
  ],
  "tips": ["Chef tip 1", "Chef tip 2"]
}
Make the ingredients very specific (with quantities) and the steps professionally culinary.`;

      const res = await frontendLLM.generate(prompt, "You are a master Indian chef and nutritionist. Return ONLY valid JSON.", user?.id);
      if (res.error) throw new Error(res.error);
      
      let raw = res.content.trim();
      if (raw.includes("\`\`\`json")) raw = raw.split("\`\`\`json")[1].split("\`\`\`")[0];
      else if (raw.includes("\`\`\`")) raw = raw.split("\`\`\`")[1];
      
      const newRecipe: Recipe = JSON.parse(raw);
      newRecipe.id = "custom_" + Date.now();
      
      // Auto-save to local storage and update list
      const storageKey = getStorageKey("custom_recipes", user?.id);
      const savedStr = localStorage.getItem(storageKey);
      const saved = savedStr ? JSON.parse(savedStr) : [];
      const updatedCustom = [newRecipe, ...saved];
      localStorage.setItem(storageKey, JSON.stringify(updatedCustom));
      
      setAllRecipes(prev => [newRecipe, ...prev]);
      setAiModal(false);
      setSelected(newRecipe);
    } catch (e: any) {
      setAiError(e.message || "Failed to generate recipe. Check your LLM settings.");
    } finally {
      setAiLoading(false);
    }
  };

  if (selected) return <RecipeDetail recipe={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Recipes</h1>
          <p className="text-muted-foreground text-sm mt-1">IFCT-verified Indian recipes with full nutrition data</p>
        </div>
        <Button onClick={() => setAiModal(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> AI Recipe
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["All","Breakfast","Lunch","Dinner","Snack"].map(c => (
            <button key={c} onClick={() => setCategory(c)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors", category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{c}</button>
          ))}
          <div className="w-px bg-border mx-1" />
          {["All","VEG","NON-VEG"].map(d => (
            <button key={d} onClick={() => setDietFilter(d)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors", dietFilter === d ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{d}</button>
          ))}
          <div className="w-px bg-border mx-1" />
          {["All","High Iron","High Calcium","High Protein"].map(g => (
            <button key={g} onClick={() => setGoalFilter(g)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors", goalFilter === g ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{g}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Utensils className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No recipes found</h3>
          <p className="text-sm text-muted-foreground">Try different filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors group"
            >
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", r.diet_type === "VEG" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600")}>{r.diet_type}</span>
                  {r.badge && <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded", BADGE_COLORS[r.badge_color||"teal"])}>{r.badge}</span>}
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">{r.name}</h3>
                <p className="text-xs text-muted-foreground">{r.region} · {r.category}</p>
              </div>
              <div className="px-5 pb-5">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[{l:"Energy",v:`${r.cal}`},{l:"Protein",v:`${r.protein_g}g`},{l:"Iron",v:`${r.iron_mg}mg`},{l:"Ca",v:`${r.calcium_mg}mg`}].map(m => (
                    <div key={m.l} className="bg-muted/40 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">{m.l}</p>
                      <p className="text-xs font-bold">{m.v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.prep_time_min}m</span>
                  <span className="text-primary font-medium group-hover:underline flex items-center gap-0.5">View <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Modal */}
      {aiModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setAiModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Generate Recipe</h2>
              <button onClick={() => setAiModal(false)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Describe what you'd like and our AI will create a recipe with IFCT data.</p>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. Iron-rich vegetarian dinner using Ragi and Spinach, high protein, under 400 kcal"
              className="w-full bg-background border border-border rounded-lg p-3 text-sm resize-none h-24 outline-none focus:border-primary mb-4"
            />
            {aiError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-xs text-destructive mb-4">
                <AlertTriangle className="w-4 h-4" /> {aiError}
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setAiModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={generateAI} disabled={aiLoading || !aiPrompt.trim()} className="flex-[2]">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {aiLoading ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
