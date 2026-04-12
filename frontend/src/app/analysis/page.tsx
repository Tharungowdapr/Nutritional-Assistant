'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { analysisApi } from '@/lib/api';
import { toast } from 'sonner';
import { TrendingUp, Zap, Leaf } from 'lucide-react';

export default function AnalysisPage() {
  const [nutrientSummary, setNutrientSummary] = useState<any>(null);
  const [foodStats, setFoodStats] = useState<any>(null);
  const [vegNonvegStats, setVegNonvegStats] = useState<any>(null);
  const [proteinFoods, setProteinFoods] = useState<any[]>([]);
  const [ironAnalysis, setIronAnalysis] = useState<any>(null);
  const [b12Analysis, setB12Analysis] = useState<any>(null);
  const [calorieDistribution, setCalorieDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const [nutrientRes, foodGroupRes, vegNonvegRes, proteinRes, ironRes, b12Res, calorieRes] = 
        await Promise.all([
          analysisApi.getNutrientSummary(),
          analysisApi.getFoodGroupStats(),
          analysisApi.getVegNonvegStats(),
          analysisApi.getTopProteinFoods(10),
          analysisApi.getIronAnalysis(),
          analysisApi.getB12Analysis(),
          analysisApi.getCalorieDistribution(),
        ]);

      setNutrientSummary(nutrientRes);
      setFoodStats(foodGroupRes);
      setVegNonvegStats(vegNonvegRes);
      setProteinFoods(proteinRes.foods || []);
      setIronAnalysis(ironRes);
      setB12Analysis(b12Res);
      setCalorieDistribution(calorieRes);
    } catch (error) {
      toast.error('Failed to load analysis data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <div className="text-white">Loading analysis...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Nutrition Analytics</h1>
          <p className="text-slate-400">Database insights and nutritional trends</p>
        </div>

        {/* Nutrient Summary Cards */}
        {nutrientSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
              <p className="text-slate-400 text-sm mb-2">Total Foods</p>
              <p className="text-3xl font-bold text-white">{nutrientSummary.total_foods}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
              <p className="text-slate-400 text-sm mb-2">Food Groups</p>
              <p className="text-3xl font-bold text-white">{nutrientSummary.food_groups}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
              <p className="text-slate-400 text-sm mb-2">Avg Calories/100g</p>
              <p className="text-3xl font-bold text-amber-400">{Math.round(nutrientSummary.avg_nutrients.calories)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-lg p-6 border border-white/20">
              <p className="text-slate-400 text-sm mb-2">Avg Protein/100g</p>
              <p className="text-3xl font-bold text-blue-400">{nutrientSummary.avg_nutrients.protein.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">g</p>
            </div>
          </div>
        )}

        {/* Calorie Distribution */}
        {calorieDistribution && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Caloric Density Distribution
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg p-4 border border-red-500/30">
                <p className="text-slate-300 text-sm mb-2">Low Calorie (&lt;100 kcal/100g)</p>
                <p className="text-2xl font-bold text-red-300">{calorieDistribution.low_calorie}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg p-4 border border-yellow-500/30">
                <p className="text-slate-300 text-sm mb-2">Medium (100-300 kcal/100g)</p>
                <p className="text-2xl font-bold text-yellow-300">{calorieDistribution.medium_calorie}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-lg p-4 border border-orange-500/30">
                <p className="text-slate-300 text-sm mb-2">High Calorie (&gt;300 kcal/100g)</p>
                <p className="text-2xl font-bold text-orange-300">{calorieDistribution.high_calorie}</p>
              </div>
            </div>
          </div>
        )}

        {/* Veg vs NonVeg Comparison */}
        {vegNonvegStats && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-400" />
              Vegetarian vs Non-Vegetarian
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-300 mb-4">Vegetarian</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Foods</span>
                    <span className="text-white font-semibold">{vegNonvegStats.vegetarian.count}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Calories</span>
                    <span className="text-amber-400 font-semibold">{Math.round(vegNonvegStats.vegetarian.avg_calories)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Protein</span>
                    <span className="text-blue-400 font-semibold">{vegNonvegStats.vegetarian.avg_protein.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Iron</span>
                    <span className="text-red-400 font-semibold">{vegNonvegStats.vegetarian.avg_iron.toFixed(2)}mg</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-300 mb-4">Non-Vegetarian</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Foods</span>
                    <span className="text-white font-semibold">{vegNonvegStats.non_vegetarian.count}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Calories</span>
                    <span className="text-amber-400 font-semibold">{Math.round(vegNonvegStats.non_vegetarian.avg_calories)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Protein</span>
                    <span className="text-blue-400 font-semibold">{vegNonvegStats.non_vegetarian.avg_protein.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded">
                    <span className="text-slate-300">Avg Iron</span>
                    <span className="text-red-400 font-semibold">{vegNonvegStats.non_vegetarian.avg_iron.toFixed(2)}mg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Protein Foods */}
        {proteinFoods.length > 0 && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Top Protein Sources</h2>
            <div className="space-y-2">
              {proteinFoods.slice(0, 5).map((food: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition">
                  <div>
                    <p className="text-white font-medium">{food['Food Name']}</p>
                    <p className="text-xs text-slate-400">{food['Food Group']}</p>
                  </div>
                  <span className="text-blue-400 font-bold">{food['Protein (g)']?.toFixed(1) || '0'}g</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Iron Analysis */}
        {ironAnalysis && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Iron Analysis (India's #1 Deficiency)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg p-4 border border-red-500/30">
                <p className="text-slate-300 mb-2">Vegetarian Avg Iron</p>
                <p className="text-2xl font-bold text-red-300">{ironAnalysis.vegetarian_iron.mean?.toFixed(2) || '0'}mg</p>
              </div>
              <div className="bg-gradient-to-br from-red-600/20 to-red-700/10 rounded-lg p-4 border border-red-600/30">
                <p className="text-slate-300 mb-2">Non-Veg Avg Iron</p>
                <p className="text-2xl font-bold text-red-200">{ironAnalysis.non_vegetarian_iron.mean?.toFixed(2) || '0'}mg</p>
              </div>
            </div>
            {ironAnalysis.top_iron_sources && (
              <div>
                <p className="text-slate-300 text-sm mb-3">Top Iron Sources:</p>
                <div className="space-y-2">
                  {ironAnalysis.top_iron_sources.map((food: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
                      <span className="text-slate-300">{food['Food Name']}</span>
                      <span className="text-red-400 font-bold">{food['Iron (mg)']?.toFixed(2) || '0'}mg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* B12 Analysis */}
        {b12Analysis && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6">Vitamin B12 Analysis (Vegetarian Crisis)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-lg p-4 border border-purple-500/30">
                <p className="text-slate-300 mb-2">Veg Foods with B12</p>
                <p className="text-2xl font-bold text-purple-300">{b12Analysis.veg_with_b12}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-lg p-4 border border-cyan-500/30">
                <p className="text-slate-300 mb-2">Avg B12 (Veg)</p>
                <p className="text-2xl font-bold text-cyan-300">{b12Analysis.veg_avg_b12?.toFixed(2) || '0'}mcg</p>
              </div>
            </div>
            {b12Analysis.top_sources && (
              <div>
                <p className="text-slate-300 text-sm mb-3">Top B12 Sources:</p>
                <div className="space-y-2">
                  {b12Analysis.top_sources.map((food: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded text-sm">
                      <span className="text-slate-300">{food['Food Name']}</span>
                      <span className="text-purple-400 font-bold">{food['Vit B12 (mcg)']?.toFixed(2) || '0'}mcg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
