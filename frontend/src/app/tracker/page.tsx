"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { nutritionApi, trackerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, X, Target, Flame, Activity, Clock, Search, ChevronRight, Sparkles, BrainCircuit } from 'lucide-react';
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
  meals_by_slot: {
    [key: string]: MealLog[];
  };
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
    const today = new Date().toISOString().split('T')[0];
    setTodayDate(today);
    loadDailySummary(today);
    loadHistory(historyRange);
  }, [historyRange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (foodSearch.length >= 2) {
        handleSearchFoods(foodSearch);
      } else {
        setFoodResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [foodSearch]);

  const loadHistory = async (days: number) => {
    setLoadingHistory(true);
    try {
      const data = await trackerApi.getSummary(days);
      setHistoryData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadDailySummary = async (date: string) => {
    try {
      setLoading(true);
      const data = await trackerApi.getDailySummary(date);
      setDailySummary(data);
    } catch (error) {
      toast.error('Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFoods = async (query: string) => {
    if (query.length < 2) {
      setFoodResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await nutritionApi.searchFoods(query, undefined, undefined, undefined, 1, 8);
      setFoodResults(data.foods || []);
    } catch (error) {
      setFoodResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !selectedSlot) {
      toast.error('Please select food and meal slot');
      return;
    }
    try {
      await trackerApi.logFood(selectedSlot, selectedFood['Food Name'], selectedQuantity);
      toast.success(`${selectedFood['Food Name']} logged to ${selectedSlot}`);
      setShowAddFood(false);
      setSelectedFood(null);
      setFoodSearch('');
      setFoodResults([]);
      loadDailySummary(todayDate);
      loadHistory(historyRange);
    } catch (error) {
      toast.error('Failed to log food');
    }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await trackerApi.deleteLog(logId);
      toast.success('Food removed');
      loadDailySummary(todayDate);
      loadHistory(historyRange);
    } catch (error) {
      toast.error('Failed to delete log');
    }
  };

  const mealSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const targets = user?.profile?.icmr_match || { energy: 2000, protein_g: 60, carbs_g: 300, fat_g: 65 };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto pb-32 fade-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">Daily Nutrition Journal</h1>
          <p className="text-muted-foreground font-medium tracking-tight">
            {new Date(todayDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button onClick={() => setShowAddFood(true)} className="rounded-full px-8 py-6 bg-primary text-primary-foreground font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Log Culinary Entry
        </Button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Energy', val: dailySummary?.total_calories || 0, target: targets.energy, unit: 'kcal', color: 'var(--color-calories)', icon: Flame },
          { label: 'Protein', val: dailySummary?.total_protein_g || 0, target: targets.protein_g, unit: 'g', color: 'var(--color-protein)', icon: Activity },
          { label: 'Carbs', val: dailySummary?.total_carbs_g || 0, target: targets.carbs_g, unit: 'g', color: 'var(--color-carbs)', icon: Target },
          { label: 'Fat', val: dailySummary?.total_fat_g || 0, target: targets.fat_g, unit: 'g', color: 'var(--color-fat)', icon: Sparkles },
        ].map(stat => {
          const pct = Math.min((stat.val / (stat.target || 1)) * 100, 100);
          return (
            <Card key={stat.label} className="p-6 bg-card border border-border/50 rounded-[32px] shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-muted group-hover:bg-primary/10 transition-colors" />
               <div className="flex items-center justify-between mb-6">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                 <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
               </div>
               <div className="flex items-baseline gap-1 mb-4">
                 <p className="text-3xl font-black tracking-tighter" style={{ color: stat.color }}>{Math.round(stat.val)}</p>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">{stat.unit}</p>
               </div>
               <div className="space-y-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: stat.color }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                    <span>{Math.round(pct)}% Achieved</span>
                    <span>Goal {stat.target}{stat.unit}</span>
                  </div>
               </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Trend Visualization */}
        <div className="lg:col-span-2 space-y-8">
           <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif">Consumption Trends</h2>
              <div className="flex p-1 rounded-full bg-muted/30 border border-border/40">
                {[7, 30].map(r => (
                  <button 
                    key={r}
                    onClick={() => setHistoryRange(r)}
                    className={cn("px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all", historyRange === r ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {r} Days
                  </button>
                ))}
              </div>
           </div>

           <Card className="p-8 bg-card border border-border/50 rounded-[40px] shadow-sm">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Historical Records...</p>
                </div>
              ) : (
                <div className="space-y-10">
                   <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Average Daily Energy</p>
                         <p className="text-5xl font-black tracking-tighter text-foreground">{historyData?.avg_daily_calories?.toFixed(0)} <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">kcal</span></p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                         <TrendingUp className="w-3.5 h-3.5" /> High Precision Consistency
                      </div>
                   </div>

                   {/* Modern Bar Chart */}
                   <div className="h-48 flex items-end gap-2 group/chart">
                      {historyData?.daily_data?.map((d: any, i: number) => {
                        const h = Math.min((d.calories / (targets.energy || 2000)) * 100, 100);
                        return (
                          <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                             <div 
                                className="w-full rounded-t-xl transition-all duration-500 bg-primary/10 group-hover:bg-primary/30"
                                style={{ height: `${h}%` }}
                             />
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A2E28] text-white text-[10px] font-black px-3 py-2 rounded-xl pointer-events-none whitespace-nowrap shadow-2xl z-20">
                                {Math.round(d.calories)} kcal
                             </div>
                          </div>
                        );
                      })}
                   </div>

                   <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-white shadow-sm border border-border">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Insight</p>
                        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                          "{historyData?.insight || 'Analyzing your nutritional consistency patterns...'}"
                        </p>
                      </div>
                   </div>
                </div>
              )}
           </Card>
        </div>

        {/* Activity Sidebar */}
        <div className="space-y-8">
           <h2 className="text-2xl font-serif">Recent Sequence</h2>
           <div className="space-y-6">
              {mealSlots.map(slot => {
                const meals = dailySummary?.meals_by_slot[slot] || [];
                return (
                  <div key={slot} className="space-y-3">
                    <div className="flex items-center justify-between ml-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{slot}</p>
                       <p className="text-[9px] font-bold text-muted-foreground opacity-40">{meals.length} ENTRIES</p>
                    </div>
                    <div className="space-y-2">
                       {meals.length === 0 ? (
                        <button 
                          onClick={() => { setSelectedSlot(slot); setShowAddFood(true); }}
                          className="w-full py-4 rounded-2xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-muted/10"
                        >
                          + Log {slot}
                        </button>
                       ) : (
                        meals.map(m => (
                          <div key={m.id} className="group bg-white border border-border/40 p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                             <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{m.food_name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">{m.quantity_g}g · {Math.round(m.calories)} kcal</p>
                             </div>
                             <button 
                                onClick={() => handleDeleteLog(m.id)}
                                className="p-2 rounded-xl text-muted-foreground/30 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        ))
                       )}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

      </div>

      {/* Add Food Modal Overhaul */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[40px] bg-card font-sans">
          <div className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <DialogHeader className="p-10 pb-6 border-b border-border/40 bg-muted/10">
               <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white border border-border shadow-sm">
                    <Utensils className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-serif">Culinary Intake</DialogTitle>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Register daily nutrition metrics</p>
                  </div>
               </div>
            </DialogHeader>

            <div className="p-10 space-y-10">
              
              {/* Slot Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Meal Sequence Slot</label>
                <div className="flex gap-2 flex-wrap">
                  {mealSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        selectedSlot === slot 
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                        : 'bg-white text-muted-foreground border-border/40 hover:bg-muted/30'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Search */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Intelligent Search</label>
                 <div className="relative group">
                    <Search className={cn("absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", searchLoading ? "text-primary animate-pulse" : "text-muted-foreground")} />
                    <Input 
                      placeholder="Identify food item... e.g. 'Avocado Toast', 'Tandoori Chicken'"
                      value={foodSearch}
                      onChange={e => setFoodSearch(e.target.value)}
                      className="pl-14 py-8 bg-white border border-border rounded-[24px] shadow-sm text-lg font-bold outline-none focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/30"
                    />
                 </div>
                 
                 {foodResults.length > 0 && (
                   <div className="absolute left-10 right-10 mt-2 bg-white border border-border/60 rounded-[32px] shadow-2xl z-50 overflow-hidden p-2 fade-in">
                      {foodResults.map((food, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedFood(food);
                            setFoodSearch(food['Food Name']);
                            setFoodResults([]);
                          }}
                          className="w-full flex items-center justify-between p-5 rounded-2xl hover:bg-primary/5 transition-all text-left group"
                        >
                           <div className="flex-1">
                              <p className="font-bold text-base group-hover:text-primary transition-colors">{food['Food Name']}</p>
                              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest mt-1">{food['Food Group']}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-sm font-black text-foreground">{Math.round(food['Energy (kcal)'])} <span className="text-[10px] font-medium opacity-50 uppercase">kcal</span></p>
                              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">PER 100G</p>
                           </div>
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              {/* Selection Summary Overlay */}
              {selectedFood && (
                <div className="p-8 bg-primary/5 rounded-[32px] border border-primary/10 space-y-8 fade-in">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Selected Item</p>
                         <h4 className="font-serif text-2xl luxury-text-gradient">{selectedFood['Food Name']}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-4xl font-black text-primary tracking-tighter">
                           {Math.round((selectedFood['Energy (kcal)'] * selectedQuantity) / 100)}
                         </p>
                         <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Total Kcal Yield</p>
                      </div>
                   </div>

                   <div className="flex flex-col md:flex-row items-center gap-6 pt-6 border-t border-primary/10">
                      <div className="bg-white p-2 rounded-2xl border border-primary/20 flex items-center shadow-sm">
                         <input 
                           type="number" 
                           value={selectedQuantity}
                           onChange={e => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                           className="w-24 bg-transparent border-none text-center font-black text-2xl h-12 outline-none"
                         />
                         <span className="pr-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Grams</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">
                        Adjust the mass to reflect your precise intake. The nutritional sequence will calibrate automatically.
                      </p>
                   </div>
                </div>
              )}

              <div className="flex gap-4 pt-6">
                 <Button onClick={() => setShowAddFood(false)} variant="ghost" className="flex-1 py-8 rounded-full font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-muted">Dismiss</Button>
                 <Button 
                   onClick={handleAddFood} 
                   disabled={!selectedFood} 
                   className="flex-[2] py-8 rounded-full font-black uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-xl shadow-primary/20 disabled:opacity-50 transition-all hover:scale-[1.02]"
                 >
                   Confirm Sequence Log
                 </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
