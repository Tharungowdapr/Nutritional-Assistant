"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Filter, ChevronDown, X, ArrowLeft, ArrowRight, Leaf } from "lucide-react";
import { nutritionApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface FoodItem {
  [key: string]: any;
}

const FOOD_GROUPS = [
  "All", "Cereals", "Pulses", "Vegetables", "Fruits", "Spices", "Milk",
  "Meat", "Fish", "Egg", "Nuts & Seeds", "Oils & Fats", "Sugar",
];

export default function ExplorePage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");
  const [selectedDiet, setSelectedDiet] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const limit = 25;

  const fetchFoods = useCallback(async (q: string, group?: string, diet?: string, p = 1) => {
    setLoading(true);
    try {
      const g = group === "All" ? undefined : group;
      const data = await nutritionApi.searchFoods(q, g, diet, undefined, p, limit);
      setFoods(data.foods || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Food search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchFoods(search, selectedGroup, selectedDiet, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, selectedGroup, selectedDiet, fetchFoods]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchFoods(search, selectedGroup, selectedDiet, newPage);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 fade-in">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Explore Foods</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search the IFCT 2017 database — {total.toLocaleString()} foods
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search foods (e.g. Ragi, Chicken, Methi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FOOD_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                selectedGroup === group
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {group}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {[
            { label: "All", value: undefined },
            { label: "Veg", value: "VEG" },
            { label: "Non-Veg", value: "NON-VEG" },
          ].map((d) => (
            <button
              key={d.label}
              onClick={() => setSelectedDiet(d.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                selectedDiet === d.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : foods.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Leaf className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold mb-1">No foods found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term or filter</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Food</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Energy</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Protein</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Carbs</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Fat</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Iron</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Calcium</th>
                </tr>
              </thead>
              <tbody>
                {foods.map((food, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedFood(food)}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <p className="font-medium">{food['Food Name']}</p>
                      <p className="text-[11px] text-muted-foreground">{food['Food Group']}</p>
                    </td>
                    <td className="text-right p-3 font-semibold" style={{ color: 'var(--color-calories)' }}>{Math.round(food['Energy (kcal)'] || 0)}</td>
                    <td className="text-right p-3">{(food['Protein (g)'] || 0).toFixed(1)}g</td>
                    <td className="text-right p-3">{(food['Carbs (g)'] || 0).toFixed(1)}g</td>
                    <td className="text-right p-3">{(food['Fat (g)'] || 0).toFixed(1)}g</td>
                    <td className="text-right p-3">{(food['Iron (mg)'] || 0).toFixed(1)}mg</td>
                    <td className="text-right p-3">{(food['Calcium (mg)'] || 0).toFixed(1)}mg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden space-y-2">
            {foods.map((food, i) => (
              <div
                key={i}
                onClick={() => setSelectedFood(food)}
                className="bg-card border border-border rounded-xl p-4 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{food['Food Name']}</p>
                    <p className="text-[11px] text-muted-foreground">{food['Food Group']}</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--color-calories)' }}>{Math.round(food['Energy (kcal)'] || 0)}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>P: {(food['Protein (g)'] || 0).toFixed(1)}g</span>
                  <span>C: {(food['Carbs (g)'] || 0).toFixed(1)}g</span>
                  <span>F: {(food['Fat (g)'] || 0).toFixed(1)}g</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Food Detail Modal */}
      {selectedFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedFood(null)}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedFood['Food Name']}</h3>
                <p className="text-sm text-muted-foreground">{selectedFood['Food Group']} • per 100g</p>
              </div>
              <button onClick={() => setSelectedFood(null)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Energy', value: selectedFood['Energy (kcal)'], unit: 'kcal', color: 'var(--color-calories)' },
                { label: 'Protein', value: selectedFood['Protein (g)'], unit: 'g', color: 'var(--color-protein)' },
                { label: 'Carbs', value: selectedFood['Carbs (g)'], unit: 'g', color: 'var(--color-carbs)' },
                { label: 'Fat', value: selectedFood['Fat (g)'], unit: 'g', color: 'var(--color-fat)' },
                { label: 'Fibre', value: selectedFood['Fibre (g)'], unit: 'g', color: 'var(--color-fibre)' },
                { label: 'Iron', value: selectedFood['Iron (mg)'], unit: 'mg', color: '#F59E0B' },
                { label: 'Calcium', value: selectedFood['Calcium (mg)'], unit: 'mg', color: '#6366F1' },
                { label: 'Vitamin C', value: selectedFood['Vitamin C (mg)'], unit: 'mg', color: '#22C55E' },
              ].map(n => (
                <div key={n.label} className="p-3 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground font-medium">{n.label}</p>
                  <p className="text-lg font-bold" style={{ color: n.color }}>
                    {n.value != null ? parseFloat(n.value).toFixed(1) : '—'}
                    <span className="text-xs text-muted-foreground ml-0.5">{n.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
