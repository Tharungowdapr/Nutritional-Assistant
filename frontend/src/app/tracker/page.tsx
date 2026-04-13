'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nutritionApi, trackerApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, X, Target, Flame, Activity, Clock, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealLog {
  id: number;
  food_name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 animate-pulse text-primary" />
          <p className="text-muted-foreground font-medium">Synchronizing health data...</p>
        </div>
      </div>
    );
  }

  const targets = user?.profile?.targets || { calories: 2000, protein: 75, carbs: 275, fat: 65 };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto pb-32 fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">Your Nutrition Log</h1>
            </div>
            <p className="text-lg text-muted-foreground font-medium">
              {new Date(todayDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button onClick={() => setShowAddFood(true)} size="lg" className="rounded-2xl px-8 h-12 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus className="w-5 h-5 mr-1" />
            Add Nutrition
          </Button>
        </div>

        {/* Daily Progress Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Energy', val: dailySummary?.total_calories || 0, target: targets.calories, unit: 'kcal', color: 'text-chart-4', icon: <Flame className="w-4 h-4" /> },
            { label: 'Protein', val: dailySummary?.total_protein_g || 0, target: targets.protein, unit: 'g', color: 'text-chart-1', icon: <div className="w-1.5 h-1.5 rounded-full bg-chart-1" /> },
            { label: 'Carbs', val: dailySummary?.total_carbs_g || 0, target: targets.carbs, unit: 'g', color: 'text-chart-3', icon: <div className="w-1.5 h-1.5 rounded-full bg-chart-3" /> },
            { label: 'Fat', val: dailySummary?.total_fat_g || 0, target: targets.fat, unit: 'g', color: 'text-chart-5', icon: <div className="w-1.5 h-1.5 rounded-full bg-chart-5" /> },
          ].map(stat => {
            const pct = Math.min((stat.val / (stat.target || 1)) * 100, 100);
            return (
              <Card key={stat.label} className="p-6 glass-card border-none overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</span>
                    <div className={cn("p-1.5 rounded-lg bg-muted", stat.color)}>{stat.icon}</div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <p className={cn("text-3xl font-black tracking-tighter", stat.color)}>{Math.round(stat.val)}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase opacity-40">{stat.unit}</p>
                  </div>
                  <div className="space-y-2">
                     <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                       <div className={cn("h-full transition-all duration-1000", stat.color.replace('text', 'bg'))} style={{ width: `${pct}%` }} />
                     </div>
                     <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 uppercase">
                       <span>{pct.toFixed(0)}%</span>
                       <span>Target {stat.target}{stat.unit}</span>
                     </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Historcal & Insights Container */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
           <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  Consumption Trends
                </h2>
                <div className="flex bg-muted p-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-border">
                  {[7, 30].map(r => (
                    <button 
                      key={r}
                      onClick={() => setHistoryRange(r)}
                      className={cn("px-4 py-1.5 rounded-full transition-all", historyRange === r ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                    >
                      {r} Days
                    </button>
                  ))}
                </div>
              </div>

              <Card className="p-8 glass-card border-none bg-gradient-to-br from-card to-background shadow-xl">
                 {loadingHistory ? (
                   <div className="h-48 shimmer rounded-2xl" />
                 ) : (
                   <div className="space-y-8">
                      <div className="flex items-end justify-between">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Average Daily Energy</p>
                            <p className="text-4xl font-black text-foreground">{historyData?.avg_daily_calories?.toFixed(0)} <span className="text-sm font-normal text-muted-foreground uppercase ml-1">kcal</span></p>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Consistency</p>
                            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest">Optimized</span>
                         </div>
                      </div>

                      {/* Bar Visualization */}
                      <div className="h-40 flex items-end gap-1.5 group/chart">
                        {historyData?.daily_data?.map((d: any, i: number) => {
                          const h = (d.calories / (targets.calories || 2500)) * 100;
                          return (
                            <div key={i} className="flex-1 group relative">
                               <div 
                                  className={cn("w-full rounded-t-lg transition-all duration-500 hover:opacity-100", 
                                    Math.abs(d.calories - targets.calories) < 200 ? "bg-primary/40" : 
                                    d.calories > targets.calories ? "bg-chart-5/40" : "bg-primary/20"
                                  )}
                                  style={{ height: `${Math.min(h, 100)}%` }}
                               />
                               <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-10 bg-foreground text-background text-[10px] font-bold px-2 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                 {Math.round(d.calories)} kcal
                               </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="flex items-center gap-4 p-5 bg-muted/30 rounded-2xl border border-border/50 shadow-inner">
                        <div className="p-2.5 bg-background rounded-full border border-border shadow-sm">
                           <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-xs text-foreground/80 font-medium leading-relaxed italic">
                          "{historyData?.insight || 'Analyzing your nutritional consistency patterns...'}"
                        </p>
                      </div>
                   </div>
                 )}
              </Card>
           </div>

           {/* Personal Summary Sidebar */}
           <div className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-3">
                 <Clock className="w-5 h-5 text-primary" />
                 Recent Activity
              </h2>
              <div className="space-y-4">
                 {mealSlots.map(slot => {
                    const meals = dailySummary?.meals_by_slot[slot] || [];
                    return (
                       <Card key={slot} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                          <div className="p-4 bg-muted/20 border-b border-border/50 flex items-center justify-between">
                             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{slot}</h3>
                             <span className="text-[10px] font-bold text-muted-foreground">{meals.length} items</span>
                          </div>
                          <div className="p-2 space-y-1">
                             {meals.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                                   <div className="flex-1 mr-4">
                                      <p className="text-xs font-bold text-foreground line-clamp-1">{m.food_name}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.quantity_g}g &bull; {Math.round(m.calories)} kcal</p>
                                   </div>
                                   <button 
                                      onClick={() => handleDeleteLog(m.id)}
                                      className="p-2 text-muted-foreground/40 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             ))}
                             {meals.length === 0 && (
                                <div className="p-4 text-center">
                                   <p className="text-[10px] uppercase font-bold text-muted-foreground/40 tracking-widest">No entry</p>
                                </div>
                             )}
                          </div>
                       </Card>
                    );
                 })}
              </div>
           </div>
        </section>

        {/* Footnote */}
        <p className="text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em] mt-20">
           Nutritional Assistant &bull; Regional Indian Precision &bull; IFCT Data
        </p>
      </div>

      {/* Add Food Modal */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="bg-card">
            <DialogHeader className="p-8 pb-4 border-b border-border/50 bg-muted/20">
              <DialogTitle className="text-2xl font-black tracking-tight">Add Nutrition Entry</DialogTitle>
            </DialogHeader>

            <div className="p-8 space-y-8">
              {/* Slot Selection */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block">Select Meal Slot</label>
                <div className="grid grid-cols-4 gap-2">
                  {mealSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        selectedSlot === slot 
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                        : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block">Search Database</label>
                 <div className="relative group">
                    <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", searchLoading ? "text-primary animate-pulse" : "text-muted-foreground")} />
                    <Input 
                      placeholder="e.g. Masala Dosa, Paneer..."
                      value={foodSearch}
                      onChange={e => {
                        setFoodSearch(e.target.value);
                        handleSearchFoods(e.target.value);
                      }}
                      className="pl-12 h-14 bg-muted/40 border-none transition-all focus:ring-1 ring-primary/50 text-base"
                    />
                 </div>
                 
                 {foodResults.length > 0 && (
                   <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden p-2 fade-in">
                      {foodResults.map((food, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedFood(food);
                            setFoodSearch(food['Food Name']);
                            setFoodResults([]);
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/80 transition-all text-left group"
                        >
                           <div className="flex-1">
                              <p className="font-bold text-sm group-hover:text-primary transition-colors">{food['Food Name']}</p>
                              <p className="text-[10px] text-muted-foreground opacity-60 uppercase font-bold tracking-widest mt-0.5">{food['Food Group']}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs font-black">{Math.round(food['Energy (kcal)'])} kcal</p>
                              <p className="text-[10px] text-muted-foreground uppercase">per 100g</p>
                           </div>
                        </button>
                      ))}
                   </div>
                 )}
              </div>

              {/* Selection Summary */}
              {selectedFood && (
                <Card className="p-6 bg-primary/5 border-none shadow-inner rounded-3xl animate-in zoom-in-95 duration-200">
                   <div className="flex items-center justify-between mb-6">
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Confirming Intake</p>
                         <h4 className="font-black text-lg">{selectedFood['Food Name']}</h4>
                      </div>
                      <div className="text-right">
                         <p className="text-2xl font-black text-primary">
                           {Math.round((selectedFood['Energy (kcal)'] * selectedQuantity) / 100)} <span className="text-[10px] font-normal uppercase ml-1">kcal</span>
                         </p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="bg-background p-1 rounded-xl border border-primary/20 flex items-center">
                         <Input 
                           type="number" 
                           value={selectedQuantity}
                           onChange={e => setSelectedQuantity(Math.max(1, Number(e.target.value)))}
                           className="w-24 border-none text-center font-bold text-lg h-10 shadow-none focus-visible:ring-0"
                         />
                         <span className="pr-4 text-xs font-bold text-muted-foreground uppercase opacity-40">Grams</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">Adjust quantity to reflect your consumption accurately.</p>
                   </div>
                </Card>
              )}

              <div className="flex gap-4 pt-4">
                 <Button onClick={() => setShowAddFood(false)} variant="ghost" className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs">Dismiss</Button>
                 <Button 
                   onClick={handleAddFood} 
                   disabled={!selectedFood} 
                   className="flex-[2] h-14 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                   Finalize Entry
                 </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
