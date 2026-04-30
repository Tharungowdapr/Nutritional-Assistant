"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { nutritionApi, trackerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, Target, Flame, Activity, Search, Loader2, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealLog {
  id: number;
  food_name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  [key: string]: any;
}

interface DailySummary {
  log_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meal_count: number;
  meals_by_slot: { [key: string]: MealLog[] };
}

export default function TrackerPage() {
  const { user } = useAuth();
  const [todayDate, setTodayDate] = useState('');
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFood, setShowAddFood] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('Breakfast');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyRange, setHistoryRange] = useState(7);
  const [loadingHistory, setLoadingHistory] = useState(true);

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
    catch { toast.error('Failed to load summary'); }
    finally { setLoading(false); }
  };

  const handleSearchFoods = async (query: string) => {
    if (query.length < 2) { setFoodResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await nutritionApi.searchFoods(query, undefined, undefined, undefined, 1, 8);
      setFoodResults(data.foods || []);
    } catch { setFoodResults([]); }
    finally { setSearchLoading(false); }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !selectedSlot) { toast.error('Select food and meal'); return; }
    try {
      await trackerApi.logFood(selectedSlot, selectedFood['Food Name'], selectedQuantity);
      toast.success(`${selectedFood['Food Name']} logged`);
      setShowAddFood(false); setSelectedFood(null); setFoodSearch(''); setFoodResults([]);
      loadDailySummary(todayDate); loadHistory(historyRange);
    } catch { toast.error('Failed to log food'); }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await trackerApi.deleteLog(logId);
      toast.success('Removed');
      loadDailySummary(todayDate); loadHistory(historyRange);
    } catch { toast.error('Failed to delete'); }
  };

  const mealSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const targets = user?.profile?.icmr_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65 };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {todayDate && new Date(todayDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button onClick={() => setShowAddFood(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Log Meal
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Energy', val: dailySummary?.total_calories || 0, target: targets.energy, unit: 'kcal', color: 'var(--color-calories)', icon: Flame },
          { label: 'Protein', val: dailySummary?.total_protein_g || 0, target: targets.protein_g, unit: 'g', color: 'var(--color-protein)', icon: Activity },
          { label: 'Carbs', val: dailySummary?.total_carbs_g || 0, target: targets.carbs_g, unit: 'g', color: 'var(--color-carbs)', icon: Target },
          { label: 'Fat', val: dailySummary?.total_fat_g || 0, target: targets.fat_g, unit: 'g', color: 'var(--color-fat)', icon: Utensils },
        ].map(stat => {
          const pct = Math.min((stat.val / (stat.target || 1)) * 100, 100);
          return (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{Math.round(stat.val)}</p>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: stat.color }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{Math.round(pct)}%</span>
                  <span>{stat.target}{stat.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Trends */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Trends</h2>
            <div className="flex p-0.5 rounded-md bg-muted border border-border">
              {[7, 30].map(r => (
                <button
                  key={r}
                  onClick={() => setHistoryRange(r)}
                  className={cn("px-3 py-1 rounded text-xs font-medium transition-colors",
                    historyRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Average daily</p>
                  <p className="text-3xl font-bold">{historyData?.avg_daily_calories?.toFixed(0) || 0} <span className="text-sm text-muted-foreground font-normal">kcal</span></p>
                </div>

                <div className="h-32 flex items-end gap-1">
                  {historyData?.daily_data?.map((d: any, i: number) => {
                    const h = Math.min((d.calories / (targets.energy || 2000)) * 100, 100);
                    return (
                      <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                        <div
                          className="w-full rounded-t bg-primary/20 group-hover:bg-primary/40 transition-colors"
                          style={{ height: `${h}%` }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-medium px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10">
                          {Math.round(d.calories)} kcal
                        </div>
                      </div>
                    );
                  })}
                </div>

                {historyData?.insight && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground">{historyData.insight}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meal Slots */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Today</h2>
          <div className="space-y-3">
            {mealSlots.map(slot => {
              const meals = dailySummary?.meals_by_slot[slot] || [];
              return (
                <div key={slot} className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-medium text-muted-foreground">{slot}</p>
                    <p className="text-[10px] text-muted-foreground">{meals.length} items</p>
                  </div>
                  {meals.length === 0 ? (
                    <button
                      onClick={() => { setSelectedSlot(slot); setShowAddFood(true); }}
                      className="w-full py-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      + Add {slot}
                    </button>
                  ) : (
                    meals.map(m => (
                      <div key={m.id} className="group bg-card border border-border p-3 rounded-lg flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.food_name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.quantity_g}g · {Math.round(m.calories)} kcal</p>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(m.id)}
                          className="p-1.5 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Food Dialog */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Food</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Slot Selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Meal</label>
              <div className="flex gap-2 flex-wrap">
                {mealSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                      selectedSlot === slot
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Search Food</label>
              <div className="relative">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", searchLoading ? "text-primary animate-pulse" : "text-muted-foreground")} />
                <Input
                  placeholder="e.g. Ragi, Chicken, Dal..."
                  value={foodSearch}
                  onChange={e => setFoodSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {foodResults.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden bg-card shadow-md max-h-48 overflow-y-auto">
                  {foodResults.map((food, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedFood(food);
                        setFoodSearch(food['Food Name']);
                        setFoodResults([]);
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{food['Food Name']}</p>
                        <p className="text-[11px] text-muted-foreground">{food['Food Group']}</p>
                      </div>
                      <p className="text-sm font-semibold">{Math.round(food['Energy (kcal)'])} <span className="text-xs text-muted-foreground">kcal</span></p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Food */}
            {selectedFood && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <h4 className="font-semibold">{selectedFood['Food Name']}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {Math.round((selectedFood['Energy (kcal)'] * selectedQuantity) / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">kcal</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-primary/20 rounded-md bg-card">
                    <input
                      type="number"
                      value={selectedQuantity}
                      onChange={e => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-transparent border-none text-center font-bold text-lg h-10 outline-none"
                    />
                    <span className="pr-3 text-xs text-muted-foreground">g</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setShowAddFood(false)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={handleAddFood} disabled={!selectedFood} className="flex-[2]">
                Log Food
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
