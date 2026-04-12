'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { nutritionApi, trackerApi } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, X } from 'lucide-react';

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
  const [todayDate, setTodayDate] = useState('');
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFood, setShowAddFood] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodResults, setFoodResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(100);
  const [selectedFood, setSelectedFood] = useState<any>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setTodayDate(today);
    loadDailySummary(today);
  }, []);

  const loadDailySummary = async (date: string) => {
    try {
      setLoading(true);
      const data = await trackerApi.getDailySummary(date);
      setDailySummary(data);
    } catch (error) {
      toast.error('Failed to load daily summary');
      console.error(error);
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
      const data = await nutritionApi.searchFoods(query, undefined, undefined, 1, 10);
      setFoodResults(data.foods || []);
    } catch (error) {
      toast.error('Failed to search foods');
      setFoodResults([]);
    } finally {
      setSearchLoading(true);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !selectedSlot) {
      toast.error('Please select food and meal slot');
      return;
    }

    try {
      await trackerApi.logFood(selectedSlot, selectedFood['Food Name'], selectedQuantity);
      toast.success('Food logged successfully');
      setShowAddFood(false);
      setSelectedFood(null);
      setFoodSearch('');
      setFoodResults([]);
      loadDailySummary(todayDate);
    } catch (error) {
      toast.error('Failed to log food');
    }
  };

  const handleDeleteLog = async (logId: number) => {
    try {
      await trackerApi.deleteLog(logId);
      toast.success('Food removed');
      loadDailySummary(todayDate);
    } catch (error) {
      toast.error('Failed to delete log');
    }
  };

  const mealSlots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const getMacroPercentages = () => {
    if (!dailySummary) return { protein: 0, carbs: 0, fat: 0 };
    const total = (dailySummary.total_protein_g * 4) + (dailySummary.total_carbs_g * 4) + (dailySummary.total_fat_g * 9);
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: ((dailySummary.total_protein_g * 4) / total) * 100,
      carbs: ((dailySummary.total_carbs_g * 4) / total) * 100,
      fat: ((dailySummary.total_fat_g * 9) / total) * 100,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading tracker...</div>
      </div>
    );
  }

  const macroPercentages = getMacroPercentages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Nutrition Tracker</h1>
          <p className="text-slate-400">{todayDate}</p>
        </div>

        {/* Daily Summary Cards */}
        {dailySummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
              <p className="text-slate-400 text-sm">Calories</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{Math.round(dailySummary.total_calories)}</p>
              <p className="text-xs text-slate-500 mt-1">kcal</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
              <p className="text-slate-400 text-sm">Protein</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{dailySummary.total_protein_g.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">g ({macroPercentages.protein.toFixed(0)}%)</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
              <p className="text-slate-400 text-sm">Carbs</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{dailySummary.total_carbs_g.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">g ({macroPercentages.carbs.toFixed(0)}%)</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-white/20">
              <p className="text-slate-400 text-sm">Fat</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{dailySummary.total_fat_g.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">g ({macroPercentages.fat.toFixed(0)}%)</p>
            </div>
          </div>
        )}

        {/* Add Food Button */}
        <div className="mb-8">
          <Button onClick={() => setShowAddFood(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Food
          </Button>
        </div>

        {/* Meals by Slot */}
        <div className="space-y-6">
          {mealSlots.map(slot => {
            const meals = dailySummary?.meals_by_slot[slot] || [];
            return (
              <div key={slot} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                <h2 className="text-lg font-bold text-white mb-4">{slot}</h2>

                {meals.length === 0 ? (
                  <p className="text-slate-400 text-sm">No foods logged</p>
                ) : (
                  <div className="space-y-3">
                    {meals.map((meal: MealLog) => (
                      <div key={meal.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex-1">
                          <p className="text-white font-medium">{meal.food_name}</p>
                          <p className="text-slate-400 text-sm">{meal.quantity_g}g · {meal.calories.toFixed(0)} cal</p>
                          <div className="flex gap-3 mt-2 text-xs text-slate-400">
                            <span>P: {meal.protein_g.toFixed(1)}g</span>
                            <span>C: {meal.carbs_g.toFixed(1)}g</span>
                            <span>F: {meal.fat_g.toFixed(1)}g</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteLog(meal.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="Delete this food log entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Food Modal */}
      <Dialog open={showAddFood} onOpenChange={setShowAddFood}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-white mb-6">Add Food</h2>

            {/* Meal Slot Selection */}
            <div className="mb-6">
              <label className="text-sm text-slate-300 mb-2 block">Meal Slot</label>
              <div className="grid grid-cols-4 gap-2">
                {mealSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                      selectedSlot === slot
                        ? 'bg-blue-500 text-white border-blue-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Food Search */}
            <div className="mb-6">
              <label className="text-sm text-slate-300 mb-2 block">Search Food</label>
              <Input
                placeholder="e.g., Rice, Chicken, Apple..."
                value={foodSearch}
                onChange={e => {
                  setFoodSearch(e.target.value);
                  handleSearchFoods(e.target.value);
                }}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              {foodResults.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2 bg-slate-800/50 rounded-lg border border-slate-700 p-3">
                  {foodResults.map((food, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedFood(food);
                        setFoodSearch(food['Food Name']);
                        setFoodResults([]);
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-slate-200 text-sm transition"
                    >
                      <p className="font-medium">{food['Food Name']}</p>
                      <p className="text-xs text-slate-400">{(food['Energy (kcal)'] || 0).toFixed(0)} cal/100g</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity Input */}
            {selectedFood && (
              <div className="mb-6">
                <label className="text-sm text-slate-300 mb-2 block">Quantity (grams)</label>
                <Input
                  type="number"
                  value={selectedQuantity}
                  onChange={e => setSelectedQuantity(Number(e.target.value))}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-400 mt-2">
                  {(((selectedFood['Energy (kcal)'] || 0) * selectedQuantity) / 100).toFixed(0)} calories
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddFood(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddFood}
                disabled={!selectedSlot || !selectedFood}
                className="flex-1"
              >
                Add to {selectedSlot}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
