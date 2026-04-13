'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { nutritionApi } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronDown, Search, BarChart3, X, Plus, Minus, Check, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Food {
  'Food Name'?: string;
  'Food Group'?: string;
  'Energy (kcal)'?: number;
  'Protein (g)'?: number;
  'Fat (g)'?: number;
  'Carbs (g)'?: number;
  'Fibre (g)'?: number;
  'Iron (mg)'?: number;
  'Calcium (mg)'?: number;
  'IFCT Code'?: string;
  [key: string]: any;
}

interface APIResponse {
  foods: Food[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const DIET_TYPES = ['Veg', 'Non-Veg', 'Vegan'];
const NUTRIENT_KEYS = [
  'Energy (kcal)', 'Protein (g)', 'Fat (g)', 'Carbs (g)', 'Fibre (g)',
  'Iron (mg)', 'Calcium (mg)', 'Zinc (mg)', 'Sodium (mg)', 'Potassium (mg)',
  'Magnesium (mg)', 'Phosphorus (mg)', 'Vitamin A (µg)', 'Vitamin B12 (µg)',
  'Vitamin C (mg)', 'Folate (µg)', 'Vitamin D (µg)', 'Cholesterol (mg)',
  'Water (g)', 'Ash (g)'
];

// Pure SVG Macro Donut
function MacroDonut({ protein = 20, fat = 15, carbs = 65 }: { protein: number; fat: number; carbs: number }) {
  const total = protein + fat + carbs;
  const pPct = (protein / total) * 100;
  const fPct = (fat / total) * 100;
  const cPct = (carbs / total) * 100;

  const circumference = 2 * Math.PI * 45;
  const pOffset = (100 - pPct) * (circumference / 100);
  const fOffset = pOffset - (fPct * (circumference / 100));
  const cOffset = fOffset - (cPct * (circumference / 100));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" className="stroke-muted/30 fill-none" strokeWidth="8" />
          {/* Fat segment */}
          <circle
            cx="50" cy="50" r="40" className="stroke-red-500 fill-none transition-all duration-700"
            strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (fat / total))}
            strokeLinecap="round"
          />
          {/* Protein segment */}
          <circle
            cx="50" cy="50" r="40" className="stroke-blue-500 fill-none transition-all duration-700"
            strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (protein / total))}
            style={{ transform: `rotate(${(fat / total) * 360}deg)`, transformOrigin: 'center' }}
            strokeLinecap="round"
          />
          {/* Carbs segment */}
          <circle
            cx="50" cy="50" r="40" className="stroke-green-500 fill-none transition-all duration-700"
            strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (carbs / total))}
            style={{ transform: `rotate(${((fat + protein) / total) * 360}deg)`, transformOrigin: 'center' }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Ratio</span>
          <span className="text-lg font-black text-foreground">{total.toFixed(0)}<span className="text-[10px] font-normal ml-0.5 mt-1">g</span></span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 w-full max-w-[140px]">
        {[
          { label: 'Prot.', val: pPct, color: 'bg-blue-500' },
          { label: 'Fat', val: fPct, color: 'bg-red-500' },
          { label: 'Carbs', val: cPct, color: 'bg-green-500' }
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between text-[11px] font-medium">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", item.color)} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
            <span>{item.val.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Nutrient category helper
function getNutrientCategory(name: string) {
  const minerals = ['Iron', 'Calcium', 'Zinc', 'Sodium', 'Potassium', 'Magnesium', 'Phosphorus'];
  const vitamins = ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Folate', 'Vitamin D'];
  if (minerals.some(m => name.includes(m))) return 'Minerals';
  if (vitamins.some(v => name.includes(v))) return 'Vitamins';
  return 'Other';
}

// Nutrient grid for detail modal
function NutrientGrid({ food }: { food: Food }) {
  const nutrients = NUTRIENT_KEYS.filter(key => food[key] != null && food[key] !== 0);
  
  const categorized = nutrients.reduce((acc: any, key) => {
    const name = key.split('(')[0].trim();
    const cat = getNutrientCategory(name);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(key);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(categorized).map(([cat, keys]: [string, any]) => (
        <div key={cat}>
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 border-b border-primary/10 pb-1">{cat}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-8">
            {keys.map((key: string) => {
              const val = Number(food[key]) || 0;
              const unit = key.split('(')[1]?.replace(')', '') || '';
              const name = key.split('(')[0].trim();
              return (
                <div key={key} className="flex flex-col border-l border-border pl-3 group transition-colors hover:border-primary/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">{name}</span>
                  <span className="text-sm font-bold text-foreground">
                    {val.toFixed(val < 1 ? 2 : 1)} <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Food detail modal
function FoodDetailModal({
  food,
  open,
  onOpenChange,
}: {
  food: Food | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open || !food) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[92vh] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-background text-foreground">
        <ScrollArea className="max-h-[92vh] w-full">
          <DialogHeader className="p-6 md:p-8 pb-4 md:pb-6 bg-background/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                  {food['Food Group']}
                </span>
                {food['IFCT Code'] && (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded-full">
                    ID: {food['IFCT Code']}
                  </span>
                )}
              </div>
              <DialogTitle className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                {food['Food Name']}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6 md:p-10">
            <div className="flex flex-col lg:flex-row gap-10 items-start">
              {/* Left Column: Visuals & Macro Ratio */}
              <div className="w-full lg:w-[280px] space-y-8 flex-shrink-0">
                <div className="bg-card p-6 md:p-8 rounded-[32px] border border-border/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MacroDonut
                    protein={Number(food['Protein (g)']) || 0}
                    fat={Number(food['Fat (g)']) || 0}
                    carbs={Number(food['Carbs (g)']) || 0}
                  />
                </div>
                
                <div className="bg-primary/5 p-6 md:p-8 rounded-[32px] border border-primary/10 relative overflow-hidden">
                   <div className="flex items-center justify-between mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-primary">Energy Density</span>
                     <TrendingUp className="w-4 h-4 text-primary opacity-60" />
                   </div>
                   <p className="text-4xl font-black text-foreground">{Math.round(food['Energy (kcal)'] || 0)}</p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">KCALS PER 100G</p>
                </div>
              </div>

              {/* Right Column: Detailed Nutrient Profile */}
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center gap-4 mb-8">
                   <div className="h-[1px] flex-1 bg-border" />
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">Nutritional Profile</h3>
                   <div className="h-[1px] flex-1 bg-border" />
                </div>
                
                <NutrientGrid food={food} />
              </div>
            </div>

            <div className="mt-16 text-center border-t border-border/50 pt-8">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-30">
                Data grounded in ICMR-NIN 2024 & IFCT 2017 &bull; Accuracy check active
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-muted/20 border-t border-border/50 md:hidden">
             <Button onClick={() => onOpenChange(false)} className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest">
                Dismiss
             </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Comparison Modal
function ComparisonModal({
  foods,
  open,
  onOpenChange,
}: {
  foods: Food[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open || foods.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-background border-border">
          <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
            <h2 className="text-2xl font-bold">Food Comparison</h2>
            <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-muted rounded-md text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ScrollArea className="flex-1 p-6">
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border-b border-border font-medium text-muted-foreground">Nutrient (per 100g)</th>
                    {foods.map((f, i) => (
                      <th key={i} className="p-3 border-b border-border font-bold min-w-[150px]">
                        {f['Food Name']}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'Energy (kcal)', label: 'Energy (kcal)' },
                    { key: 'Protein (g)', label: 'Protein (g)' },
                    { key: 'Fat (g)', label: 'Fat (g)' },
                    { key: 'Carbs (g)', label: 'Carbs (g)' },
                    { key: 'Fibre (g)', label: 'Fibre (g)' },
                    { key: 'Iron (mg)', label: 'Iron (mg)' },
                    { key: 'Calcium (mg)', label: 'Calcium (mg)' },
                  ].map((nutrient, idx) => (
                    <tr key={idx} className="even:bg-muted/30">
                      <td className="p-3 border-b border-border font-medium">{nutrient.label}</td>
                      {foods.map((f, i) => {
                        const val = Number(f[nutrient.key]) || 0;
                        const maxVal = Math.max(...foods.map(food => Number(food[nutrient.key]) || 0));
                        const isHighest = val === maxVal && val > 0;
                        return (
                          <td key={i} className={`p-3 border-b border-border ${isHighest ? 'text-primary font-bold' : ''}`}>
                            {val.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {foods.map((f, i) => (
                <div key={i} className="p-4 border border-border rounded-lg bg-card">
                  <h3 className="font-bold mb-4">{f['Food Name']} Macros</h3>
                  <MacroDonut
                    protein={Number(f['Protein (g)']) || 0}
                    fat={Number(f['Fat (g)']) || 0}
                    carbs={Number(f['Carbs (g)']) || 0}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </Dialog>
  );
}

export default function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [foodGroups, setFoodGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDietType, setSelectedDietType] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Food[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Load food groups
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await nutritionApi.foodGroups();
        setFoodGroups(data.food_groups || []);
      } catch (error) {
        console.error('Failed to load food groups', error);
      }
    };
    loadGroups();
  }, []);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedGroup, selectedDietType, selectedRegion]);

  // Load foods with debounce
  useEffect(() => {
    const loadFoods = async () => {
      setLoading(true);
      try {
        const data: APIResponse = await nutritionApi.searchFoods(
          search,
          selectedDietType || undefined,
          selectedGroup || undefined,
          selectedRegion || undefined,
          page,
          20
        );
        setFoods(data.foods);
        setTotal(data.total);
        setTotalPages(data.pages);
      } catch (error) {
        toast.error('Failed to load foods');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      loadFoods();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, selectedGroup, selectedDietType, selectedRegion, page]);

  const toggleCompare = useCallback((food: Food) => {
    setSelectedForCompare((prev) => {
      if (prev.some(f => f['Food Name'] === food['Food Name'])) {
        return prev.filter(f => f['Food Name'] !== food['Food Name']);
      } else if (prev.length < 4) {
        return [...prev, food];
      } else {
        toast.error('Maximum 4 foods can be compared');
        return prev;
      }
    });
  }, []);

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) {
      toast.error('Select at least 2 foods to compare');
      return;
    }
    // We don't really need the API to compare if we already have the full food objects in state!
    // Just show the modal
    setShowCompare(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-20 fade-in">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Food Database</h1>
        <p className="text-muted-foreground">Explore 7000+ Indian foods with complete nutritional profiles</p>
      </header>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Search</label>
          <Input
            placeholder="Rice, Paneer, Chai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Food Group</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="">All Groups</option>
            {foodGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="">All Regions</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Diet Type</label>
          <select
            value={selectedDietType}
            onChange={(e) => setSelectedDietType(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background"
          >
            <option value="">All Types</option>
            {DIET_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compare Mode Toggle */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border">
        <button
          onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedForCompare([]); }}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            compareMode
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground border border-border'
          }`}
        >
          {compareMode ? 'Cancel Compare' : 'Enable Compare Mode'}
        </button>
        {compareMode && (
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm font-medium text-muted-foreground">
              Selected: {selectedForCompare.length}/4
            </span>
            {selectedForCompare.length >= 2 && (
              <Button onClick={handleCompare} size="default" variant="default" className="shadow-md">
                Compare Selected ({selectedForCompare.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Foods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {foods.map((food) => (
          <Card
            key={food['Food Name']}
            className={`p-4 cursor-pointer hover:shadow-lg transition relative group ${selectedForCompare.some(f => f['Food Name'] === food['Food Name']) ? 'ring-2 ring-primary border-primary' : ''}`}
          >
            {compareMode && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCompare(food); }}
                className={`absolute top-2 right-2 p-2 rounded-lg transition z-10 shadow-sm ${
                  selectedForCompare.some(f => f['Food Name'] === food['Food Name'])
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {selectedForCompare.some(f => f['Food Name'] === food['Food Name']) ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            )}

            <div onClick={() => {
              if (compareMode) {
                toggleCompare(food);
              } else {
                setSelectedFood(food);
                setShowDetail(true);
              }
            }}>
              <h3 className="font-bold text-lg mb-1 pr-10">{food['Food Name']}</h3>
              <p className="text-xs text-muted-foreground mb-4">{food['Food Group']}</p>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="p-2 bg-muted/50 rounded">
                  <span className="block text-xs text-muted-foreground">Energy</span>
                  <span className="font-bold text-chart-4">{food['Energy (kcal)']?.toFixed(0) || 0} kcal</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="block text-xs text-muted-foreground">Protein</span>
                  <span className="font-bold text-chart-1">{food['Protein (g)']?.toFixed(1) || 0}g</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="block text-xs text-muted-foreground">Fat</span>
                  <span className="font-bold text-destructive">{food['Fat (g)']?.toFixed(1) || 0}g</span>
                </div>
                <div className="p-2 bg-muted/50 rounded">
                  <span className="block text-xs text-muted-foreground">Carbs</span>
                  <span className="font-bold text-primary">{food['Carbs (g)']?.toFixed(1) || 0}g</span>
                </div>
              </div>

              {food['IFCT Code'] && (
                <p className="text-xs text-muted-foreground">Code: {food['IFCT Code']}</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading foods...</div>
        </div>
      )}

      {/* No results */}
      {!loading && foods.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No foods found</p>
          <p className="text-xs text-muted-foreground/60">Try adjusting your filters</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      <FoodDetailModal food={selectedFood} open={showDetail} onOpenChange={setShowDetail} />
      <ComparisonModal foods={selectedForCompare} open={showCompare} onOpenChange={setShowCompare} />
    </div>
  );
}
