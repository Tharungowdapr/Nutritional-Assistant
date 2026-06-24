"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nutritionApi, trackerApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getStorageKey } from "@/lib/utils";
import { DailySummary } from "./types";
import SummaryCards from "./components/summary-cards";
import TrendsChart from "./components/trends-chart";
import MealSlots from "./components/meal-slots";
import AddFoodDialog from "./components/add-food-dialog";
import AnalysisSection from "./components/analysis-section";
import RECIPES_DATA from "@/lib/recipes-db.json";

const RECIPES = RECIPES_DATA as any[];
const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function TrackerPage() {
  const { user } = useAuth();
  const [todayDate, setTodayDate] = useState("");
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFood, setShowAddFood] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("Breakfast");
  const [foodSearch, setFoodSearch] = useState("");
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyRange, setHistoryRange] = useState(7);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [analysisRefresh, setAnalysisRefresh] = useState(0);

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    setTodayDate(today);
    loadDailySummary(today);
    loadHistory(historyRange);
  }, [historyRange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (foodSearch.length >= 2) handleSearchFoods(foodSearch);
      else setFoodResults([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearch]);

  const loadHistory = async (days: number) => {
    setLoadingHistory(true);
    try { setHistoryData(await trackerApi.getSummary(days)); }
    catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const loadDailySummary = async (date: string) => {
    try { setLoading(true); setDailySummary(await trackerApi.getDailySummary(date)); }
    catch { toast.error("Failed to load summary"); }
    finally { setLoading(false); }
  };

  const handleSearchFoods = async (query: string) => {
    if (query.length < 2) { setFoodResults([]); return; }
    setSearchLoading(true);
    try {
      const q = query.toLowerCase();
      const data = await nutritionApi.searchFoods(query, undefined, undefined, undefined, 1, 8);
      const apiFoods = data.foods || [];
      const recipeMatches = RECIPES.filter(r => (r.title || r.name).toLowerCase().includes(q)).map(r => ({ ...r, "Food Name": r.title || r.name, "Food Group": "Recipe", "Energy (kcal)": r.cal, isRecipe: true }));
      let customMatches: any[] = [];
      const savedStr = localStorage.getItem(getStorageKey("custom_recipes", user?.id));
      if (savedStr) {
        const custom = JSON.parse(savedStr);
        customMatches = custom.filter((r: any) => (r.title || r.name).toLowerCase().includes(q)).map((r: any) => ({ ...r, "Food Name": r.title || r.name, "Food Group": "Custom Recipe", "Energy (kcal)": r.cal || r.nutrition_per_serving?.cal, isRecipe: true }));
      }
      setFoodResults([...customMatches, ...recipeMatches, ...apiFoods].slice(0, 10));
    } catch { setFoodResults([]); }
    finally { setSearchLoading(false); }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !selectedSlot) { toast.error("Select food and meal"); return; }
    try {
      if (selectedFood.isRecipe) {
        const n = selectedFood.nutrition_per_serving || { cal: selectedFood.cal, protein_g: selectedFood.protein_g, carbs_g: selectedFood.carbs_g || 0, fat_g: selectedFood.fat_g || 0, iron_mg: selectedFood.iron_mg || 0, calcium_mg: selectedFood.calcium_mg || 0, fibre_g: selectedFood.fibre_g || 0 };
        await trackerApi.logFood(selectedSlot, selectedFood["Food Name"], selectedQuantity, todayDate, {
          manual_calories: n.cal * selectedQuantity, manual_protein_g: n.protein_g * selectedQuantity,
          manual_carbs_g: n.carbs_g * selectedQuantity, manual_fat_g: n.fat_g * selectedQuantity,
          manual_iron_mg: n.iron_mg * selectedQuantity, manual_calcium_mg: n.calcium_mg * selectedQuantity, manual_fibre_g: n.fibre_g * selectedQuantity,
        });
      } else {
        await trackerApi.logFood(selectedSlot, selectedFood["Food Name"], selectedQuantity, todayDate);
      }
      toast.success(`${selectedFood["Food Name"]} logged`);
      setShowAddFood(false); setSelectedFood(null); setFoodSearch(""); setFoodResults([]);
      loadDailySummary(todayDate); loadHistory(historyRange); setAnalysisRefresh(n => n + 1);
    } catch (err: any) { toast.error(err.message || "Failed to log food"); }
  };

  const rawTargets = user?.profile?.rda_match || user?.profile?.icmr_match || {};
  const targets = Object.keys(rawTargets).length > 0 ? rawTargets : { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65, fibre_g: 25 };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {todayDate && new Date(todayDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button onClick={() => setShowAddFood(true)} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Log Meal</Button>
      </div>

      <SummaryCards summary={dailySummary} targets={targets} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TrendsChart historyData={historyData} loadingHistory={loadingHistory} historyRange={historyRange} onRangeChange={setHistoryRange} targetEnergy={targets.energy} />
        </div>
        <MealSlots summary={dailySummary} mealSlots={MEAL_SLOTS} onAddMeal={(slot) => { setSelectedSlot(slot); setShowAddFood(true); }} onDeleteLog={async (id) => { try { await trackerApi.deleteLog(id); toast.success("Removed"); loadDailySummary(todayDate); loadHistory(historyRange); } catch { toast.error("Failed to delete"); } }} />
      </div>

      <div className="mt-12">
        <AnalysisSection refreshKey={analysisRefresh} />
      </div>

      <AddFoodDialog
        open={showAddFood} onOpenChange={setShowAddFood}
        mealSlots={MEAL_SLOTS} selectedSlot={selectedSlot} onSlotChange={setSelectedSlot}
        foodSearch={foodSearch} onFoodSearchChange={setFoodSearch}
        searchLoading={searchLoading} foodResults={foodResults}
        onFoodSelect={(food) => { setSelectedFood(food); setSelectedQuantity(food.isRecipe ? 1 : 100); setFoodSearch(food["Food Name"]); setFoodResults([]); }}
        selectedFood={selectedFood} selectedQuantity={selectedQuantity} onQuantityChange={setSelectedQuantity}
        onAddFood={handleAddFood}
      />
    </div>
  );
}
