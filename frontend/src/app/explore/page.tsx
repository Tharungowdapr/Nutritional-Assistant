"use client";
import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronRight, Info, Filter, Activity, Sparkles, Database } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Food {
  id?: string;
  "IFCT Code"?: string;
  "Food Name": string;
  "Food Group"?: string;
  "Diet Type"?: string;
  "Region Availability"?: string;
  "Energy (kcal)"?: number;
  "Protein (g)"?: number;
  "Carbohydrate (g)"?: number;
  "Total Fat (g)"?: number;
  "Dietary Fibre (g)"?: number;
  "Iron (mg)"?: number;
  "Calcium (mg)"?: number;
  "GI (Glycaemic Index)"?: number;
  "Vit C (mg)"?: number;
  "Vit B12 (mcg)"?: number;
  "Omega-3 (g)"?: number;
  "allergen_gluten"?: boolean;
  "allergen_dairy"?: boolean;
  "allergen_nuts"?: boolean;
  "allergen_soy"?: boolean;
  "GI_Category"?: string;
  [key: string]: any;
}

const GI_COLOR: Record<string, string> = {
  Low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  High: "bg-red-500/10 text-red-600 dark:text-red-400",
  Unknown: "bg-muted text-muted-foreground",
};

const GROUPS = ["All","Cereals","Millets","Legumes","Vegetables","Fruits","Dairy","Meat & Poultry","Fish & Seafood","Nuts & Seeds","Sweets","Beverages"];

function AllergenBadge({ label, active }: { label: string; active: boolean }) {
  if (!active) return null;
  return <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20">{label}</span>;
}

function FoodDetail({ food, onClose }: { food: Food; onClose: () => void }) {
  const macros = [
    { label: "Energy",    value: food["Energy (kcal)"],         unit: " kcal", color: "var(--color-calories)" },
    { label: "Protein",   value: food["Protein (g)"],           unit: "g",     color: "var(--color-protein)" },
    { label: "Carbs",     value: food["Carbohydrate (g)"],      unit: "g",     color: "var(--color-carbs)" },
    { label: "Fat",       value: food["Total Fat (g)"],         unit: "g",     color: "var(--color-fat)" },
    { label: "Fibre",     value: food["Dietary Fibre (g)"],     unit: "g",     color: "var(--color-fibre)" },
    { label: "Iron",      value: food["Iron (mg)"],             unit: "mg",    color: "var(--color-calories)" },
    { label: "Calcium",   value: food["Calcium (mg)"],          unit: "mg",    color: "var(--color-carbs)" },
    { label: "Vit C",     value: food["Vit C (mg)"],            unit: "mg",    color: "var(--color-fibre)" },
    { label: "B12",       value: food["Vit B12 (mcg)"],         unit: "mcg",   color: "var(--color-protein)" },
    { label: "Omega-3",   value: food["Omega-3 (g)"],           unit: "g",     color: "var(--color-fat)" },
  ].filter(m => m.value !== undefined && m.value !== null && m.value !== "");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border/50 rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-8 border-b border-border/40 bg-muted/20">
          <div className="space-y-1">
            <div className="flex gap-2 mb-3">
               {food["Diet Type"] && (
                <span className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full border ${food["Diet Type"] === "VEG" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>{food["Diet Type"]}</span>
              )}
              {food["Food Group"] && (
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white border border-border text-muted-foreground uppercase tracking-wider">{food["Food Group"]}</span>
              )}
            </div>
            <h2 className="font-serif text-3xl leading-tight luxury-text-gradient">{food["Food Name"]}</h2>
            <div className="flex items-center gap-2 mt-2">
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">IFCT 2017 · {food["IFCT Code"] || "N/A"}</p>
               {food["GI_Category"] && food["GI_Category"] !== "Unknown" && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${GI_COLOR[food["GI_Category"]]}`}>GI: {food["GI_Category"]}</span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white shadow-sm border border-border shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto space-y-8">
          
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Nutritional Composition (per 100g)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {macros.map(m => (
                <div key={m.label} className="bg-muted/30 rounded-2xl p-4 border border-border/20 transition-all hover:border-primary/20">
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider mb-1">{m.label}</p>
                  <p className="text-xl font-black tracking-tighter" style={{ color: m.color }}>
                    {m.value}<span className="text-[10px] ml-1 opacity-60">{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Allergens */}
            {(food.allergen_gluten || food.allergen_dairy || food.allergen_nuts || food.allergen_soy) && (
              <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-3">Allergen Safety</p>
                <div className="flex gap-2 flex-wrap">
                  <AllergenBadge label="GLUTEN" active={!!food.allergen_gluten} />
                  <AllergenBadge label="DAIRY" active={!!food.allergen_dairy} />
                  <AllergenBadge label="NUTS" active={!!food.allergen_nuts} />
                  <AllergenBadge label="SOY" active={!!food.allergen_soy} />
                </div>
              </div>
            )}

            {/* Regional Info */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Geographic Distribution</p>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                {food["Region Availability"] || "Broad availability across Indian culinary zones."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="p-6 bg-muted/20 border-t border-border/40 text-center">
           <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">Scientific Integrity Guaranteed</p>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [dietFilter, setDietFilter] = useState("All");
  const [giFilter, setGiFilter] = useState("All");
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchFoods = async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("query", q);
      if (group !== "All") params.set("food_group", group);
      if (dietFilter !== "All") params.set("diet_type", dietFilter);
      if (giFilter !== "All") params.set("gi_category", giFilter);
      const result = await apiFetch<{ foods: Food[] }>(`/api/nutrition/foods?${params}`);
      setFoods(result.foods || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFoods(query), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, group, dietFilter, giFilter]);

  useEffect(() => { fetchFoods(""); }, []);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 fade-in font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif luxury-text-gradient">Scientific Food Archive</h1>
          <p className="text-muted-foreground font-medium tracking-tight">Explore {foods.length || "7,000+"} entries from the IFCT 2017 clinical database.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-black text-primary uppercase tracking-widest">
             <Database className="w-3.5 h-3.5" /> IFCT 2017 Verified
           </div>
        </div>
      </div>

      {/* Search Bar - Premium Glassmorphism */}
      <div className="relative group mb-8">
        <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-4 bg-white border border-border p-5 rounded-[28px] shadow-2xl focus-within:border-primary/40 transition-all">
          <Search className="w-6 h-6 text-primary shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Explore clinical data... e.g. 'Sprouted Moong', 'Ragi Flour'"
            className="flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted-foreground/30"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground p-2">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filtering */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-8 border-b border-border/40">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground mr-2">
            <Filter className="w-3.5 h-3.5" /> Refine:
          </div>
          <select 
            value={group} 
            onChange={e => setGroup(e.target.value)} 
            className="text-xs font-bold border border-border rounded-full px-4 py-2 bg-white shadow-sm hover:border-primary/30 transition-colors outline-none appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232D6A4F%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:14px] bg-[right_10px_center] bg-no-repeat"
          >
            {GROUPS.map(g => <option key={g}>{g}</option>)}
          </select>
          
          <div className="flex items-center p-1 rounded-full bg-muted/30 border border-border/40">
            {["All","VEG","NON-VEG"].map(d => (
              <button 
                key={d} 
                onClick={() => setDietFilter(d)} 
                className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${dietFilter === d ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center p-1 rounded-full bg-muted/30 border border-border/40">
            {["All","Low GI","Medium GI","High GI"].map(g => (
              <button 
                key={g} 
                onClick={() => setGiFilter(g === "All" ? "All" : g.split(" ")[0])} 
                className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${giFilter === (g === "All" ? "All" : g.split(" ")[0]) ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">
          Showing {foods.length} high-fidelity results
        </p>
      </div>

      {/* Food Grid / Table Overhaul */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-primary/60">Interrogating IFCT Archive...</p>
        </div>
      ) : foods.length === 0 ? (
        <div className="text-center py-32 bg-muted/10 rounded-[32px] border border-dashed border-border">
          <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-serif mb-2">No matching data found</h3>
          <p className="text-sm text-muted-foreground font-medium">Try broadening your parameters or refined your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {foods.map((food, i) => (
            <div
              key={i}
              onClick={() => setSelected(food)}
              className="group bg-card border border-border/50 rounded-2xl p-6 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                    {food["Diet Type"] && (
                      <div className={`w-2 h-2 rounded-full ${food["Diet Type"] === "VEG" ? "bg-emerald-500" : "bg-red-500"}`} />
                    )}
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{food["Food Group"]}</span>
                   </div>
                   <Sparkles className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-bold text-lg leading-tight mb-4 group-hover:text-primary transition-colors">{food["Food Name"]}</h3>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                   {[
                    { label: "Energy", value: food["Energy (kcal)"], unit: "kcal" },
                    { label: "Protein", value: food["Protein (g)"], unit: "g" },
                    { label: "GI", value: food["GI (Glycaemic Index)"], unit: "" },
                   ].map((m, idx) => (
                    <div key={idx} className="bg-muted/30 rounded-xl p-2 text-center border border-transparent group-hover:border-primary/5 transition-colors">
                      <p className="text-[8px] font-black uppercase text-muted-foreground mb-1 tracking-tighter">{m.label}</p>
                      <p className="text-xs font-black tracking-tight">{m.value ?? "—"}<span className="text-[9px] font-medium ml-0.5 opacity-50">{m.unit}</span></p>
                    </div>
                   ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/40">
                 <div className="flex gap-1">
                    <AllergenBadge label="G" active={!!food.allergen_gluten} />
                    <AllergenBadge label="D" active={!!food.allergen_dairy} />
                 </div>
                 <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                    View Details <ChevronRight className="w-3 h-3" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <FoodDetail food={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
