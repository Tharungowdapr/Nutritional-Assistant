'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { nutritionApi } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronDown, Search, BarChart3, X } from 'lucide-react';

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
  'Zinc (mg)'?: number;
  [key: string]: any;
}

interface APIResponse {
  foods: Food[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
  const [sortBy, setSortBy] = useState('Food Name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detail modal
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Food[]>([]);
  const [showCompare, setShowCompare] = useState(false);

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

  // Load foods
  useEffect(() => {
    const loadFoods = async () => {
      setLoading(true);
      try {
        const data: APIResponse = await nutritionApi.searchFoods(
          search,
          undefined,
          selectedGroup || undefined,
          page,
          20,
          sortBy,
          sortOrder
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
  }, [search, selectedGroup, page, sortBy, sortOrder]);

  const handleFoodClick = (food: Food) => {
    setSelectedFood(food);
    setShowDetail(true);
  };

  const toggleCompare = (food: Food) => {
    const found = selectedForCompare.find(f => f['Food Name'] === food['Food Name']);
    if (found) {
      setSelectedForCompare(selectedForCompare.filter(f => f['Food Name'] !== food['Food Name']));
    } else if (selectedForCompare.length < 4) {
      setSelectedForCompare([...selectedForCompare, food]);
    } else {
      toast.error('Maximum 4 foods can be compared');
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length < 2) {
      toast.error('Select at least 2 foods to compare');
      return;
    }
    setShowCompare(true);
  };

  const getNutrientValue = (food: Food, nutrient: string) => {
    const value = food[nutrient];
    return value ? Number(value).toFixed(1) : '—';
  };

  const nutrients = [
    'Energy (kcal)',
    'Protein (g)',
    'Fat (g)',
    'Carbs (g)',
    'Fibre (g)',
    'Iron (mg)',
    'Calcium (mg)',
    'Zinc (mg)',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Food Database</h1>
        <p className="text-slate-400">Explore nutritional information for {total} foods</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search foods..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            {/* Food Group Filter */}
            <select
              value={selectedGroup}
              onChange={e => {
                setSelectedGroup(e.target.value);
                setPage(1);
              }}
              title="Filter foods by category"
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
            >
              <option value="">All Categories</option>
              {foodGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={e => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              title="Sort foods by selected attribute"
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
            >
              <option value="Food Name">Food Name</option>
              <option value="Food Group">Category</option>
              <option value="Energy (kcal)">Calories</option>
              <option value="Protein (g)">Protein</option>
              <option value="Iron (mg)">Iron</option>
              <option value="Calcium (mg)">Calcium</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
              title="Choose ascending or descending sort order"
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {/* Comparison Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCompareMode(!compareMode)}
              variant={compareMode ? 'default' : 'outline'}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Compare Mode {compareMode && `(${selectedForCompare.length}/4)`}
            </Button>
            {compareMode && selectedForCompare.length > 0 && (
              <Button onClick={handleCompare} className="gap-2">
                Compare {selectedForCompare.length} Foods
              </Button>
            )}
          </div>
        </div>

        {/* Foods Table */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-300">Loading foods...</div>
          ) : foods.length === 0 ? (
            <div className="p-8 text-center text-slate-300">No foods found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    {compareMode && <th className="p-4 text-left text-slate-300 w-12">✓</th>}
                    <th className="p-4 text-left text-slate-300">Food Name</th>
                    <th className="p-4 text-left text-slate-300">Category</th>
                    <th className="p-4 text-right text-slate-300">Cal/100g</th>
                    <th className="p-4 text-right text-slate-300">Protein (g)</th>
                    <th className="p-4 text-right text-slate-300">Carbs (g)</th>
                    <th className="p-4 text-right text-slate-300">Fat (g)</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map((food, idx) => {
                    const isSelected = selectedForCompare.some(f => f['Food Name'] === food['Food Name']);
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-500/20' : ''
                        }`}
                        onClick={() => handleFoodClick(food)}
                      >
                        {compareMode && (
                          <td className="p-4" onClick={e => {
                            e.stopPropagation();
                            toggleCompare(food);
                          }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              className="w-4 h-4"
                              title={`Select or deselect ${food['Food Name']} for comparison`}
                              readOnly
                            />
                          </td>
                        )}
                        <td className="p-4 text-white font-medium">{food['Food Name']}</td>
                        <td className="p-4 text-slate-300">{food['Food Group']}</td>
                        <td className="p-4 text-right text-amber-400 font-semibold">{getNutrientValue(food, 'Energy (kcal)')}</td>
                        <td className="p-4 text-right text-blue-400">{getNutrientValue(food, 'Protein (g)')}</td>
                        <td className="p-4 text-right text-yellow-400">{getNutrientValue(food, 'Carbs (g)')}</td>
                        <td className="p-4 text-right text-purple-400">{getNutrientValue(food, 'Fat (g)')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-slate-300">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Food Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedFood?.['Food Name']}</h2>
              <button
                onClick={() => setShowDetail(false)}
                className="text-slate-400 hover:text-white"
                title="Close food details"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {nutrients.map(nutrient => (
                <div key={nutrient} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-xs text-slate-400 mb-1">{nutrient}</div>
                  <div className="text-xl font-bold text-white">
                    {getNutrientValue(selectedFood!, nutrient)}
                  </div>
                </div>
              ))}
            </div>

            {compareMode && (
              <div className="mt-6 flex gap-2">
                {selectedForCompare.some(f => f['Food Name'] === selectedFood?.['Food Name']) ? (
                  <Button
                    onClick={() => toggleCompare(selectedFood!)}
                    variant="outline"
                  >
                    Remove from Comparison
                  </Button>
                ) : selectedForCompare.length < 4 ? (
                  <Button
                    onClick={() => toggleCompare(selectedFood!)}
                  >
                    Add to Comparison
                  </Button>
                ) : null}
              </div>
            )}

            <Button
              onClick={() => setShowDetail(false)}
              className="w-full mt-6"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Comparison Modal */}
      <Dialog open={showCompare} onOpenChange={setShowCompare}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Food Comparison</h2>
              <button
                onClick={() => setShowCompare(false)}
                className="text-slate-400 hover:text-white"
                title="Close comparison view"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="p-4 text-left text-slate-300">Nutrient</th>
                    {selectedForCompare.map((food, idx) => (
                      <th key={idx} className="p-4 text-right text-white font-semibold">
                        {food['Food Name']}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nutrients.map(nutrient => (
                    <tr key={nutrient} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4 text-slate-300 font-medium">{nutrient}</td>
                      {selectedForCompare.map((food, idx) => (
                        <td key={idx} className="p-4 text-right text-white font-semibold">
                          {getNutrientValue(food, nutrient)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={() => setShowCompare(false)}
              className="w-full mt-6"
            >
              Close Comparison
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
