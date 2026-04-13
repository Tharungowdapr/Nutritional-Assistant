'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, TrendingUp, Info } from 'lucide-react';
import { analysisApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

// SVG Donut Chart
function DonutChart({ 
  data, 
  title,
  colors = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6']
}: { 
  data: Array<{ label: string; value: number }>;
  title: string;
  colors?: string[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let offset = 0;
  const circumference = 2 * Math.PI * 45;

  const segments = data.map((d, i) => {
    const percent = (d.value / total) * 100;
    const segmentLength = (percent / 100) * circumference;
    const nextOffset = offset + segmentLength;
    const result = {
      label: d.label,
      value: d.value,
      percent,
      color: colors[i % colors.length],
      offset,
      segmentLength
    };
    offset = nextOffset;
    return result;
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="150" height="150" viewBox="0 0 150 150" className="drop-shadow">
        <circle cx="75" cy="75" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx="75" cy="75" r="45"
            fill="none"
            stroke={seg.color}
            strokeWidth="8"
            strokeDasharray={seg.segmentLength} 
            strokeDashoffset={seg.offset * -1}
            strokeLinecap="round"
          />
        ))}
        <circle cx="75" cy="75" r="28" fill="white" />
        <text x="75" y="75" textAnchor="middle" dy="0.3em" className="text-xs font-bold" fill="#1f2937">
          {title}
        </text>
      </svg>
      <div className="flex flex-col gap-2 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span>{d.label}: {d.value} ({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// CSS Bar Chart
function BarChart({ 
  data, 
  title,
  color = 'bg-green-500',
  valueLabel = ''
}: { 
  data: Array<{ label: string; value: number }>;
  title: string;
  color?: string;
  valueLabel?: string;
}) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div>
      <h3 className="font-semibold mb-4 text-sm">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 8).map((item) => {
          const percent = (item.value / maxValue) * 100;
          return (
            <div key={item.label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-xs text-slate-600">{item.value.toFixed(1)} {valueLabel}</span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} transition-all duration-300`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const { user } = useAuth();
  const [nutrientSummary, setNutrientSummary] = useState<any>(null);
  const [foodStats, setFoodStats] = useState<any>(null);
  const [vegNonvegStats, setVegNonvegStats] = useState<any>(null);
  const [proteinFoods, setProteinFoods] = useState<any[]>([]);
  const [ironAnalysis, setIronAnalysis] = useState<any>(null);
  const [b12Analysis, setB12Analysis] = useState<any>(null);
  const [calorieDistribution, setCalorieDistribution] = useState<any>(null);
  const [giDistribution, setGIDistribution] = useState<any>(null);
  const [personalAnalysis, setPersonalAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      // IMP-010: Use Promise.allSettled for resilience — each request resolves independently
      const results = await Promise.allSettled([
        analysisApi.getNutrientSummary(),
        analysisApi.getFoodGroupStats(),
        analysisApi.getVegNonvegStats(),
        analysisApi.getTopProteinFoods(10),
        analysisApi.getIronAnalysis(),
        analysisApi.getB12Analysis(),
        analysisApi.getCalorieDistribution(),
        analysisApi.getGIDistribution(),
        analysisApi.getPersonalAnalysis(),
      ]);

      // Extract values, handling both fulfilled and rejected results
      const [
        summary,
        stats,
        veg,
        protein,
        iron,
        b12,
        calDist,
        giDist,
        personal
      ] = results.map(r => r.status === 'fulfilled' ? r.value : null);

      // Set states with fallbacks for null values
      setNutrientSummary(summary || {});
      setFoodStats(stats || {});
      setVegNonvegStats(veg || {});
      setProteinFoods(protein?.foods || []);
      setIronAnalysis(iron || {});
      setB12Analysis(b12 || {});
      setCalorieDistribution(calDist || {});
      setGIDistribution(giDist || {});
      setPersonalAnalysis(personal || null);
    } catch (error) {
      console.error('Error loading analysis data:', error);
      toast.error('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto pb-20 fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Nutritional Intelligence</h1>
          <p className="text-muted-foreground text-lg">Deep analysis of the IFCT database and your personal habits.</p>
        </div>

        {/* Personal Analysis Hook - ONLY IF LOGGED IN */}
        {personalAnalysis?.has_data && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold">Your Personalized Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 md:col-span-2 glass-card border-primary/20">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  Weekly Observation
                </h3>
                <ul className="space-y-3">
                  {personalAnalysis.insights.map((insight: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-sm text-foreground/80">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      {insight}
                    </li>
                  ))}
                  {personalAnalysis.insights.length === 0 && (
                    <li className="text-sm text-muted-foreground">Your intake is well-aligned with RDA targets for this period.</li>
                  )}
                </ul>
              </Card>
              <Card className="p-6 glass-card border-none bg-primary/5">
                <p className="text-sm font-medium text-primary mb-1 text-center">Avg. Weekly Energy</p>
                <div className="text-4xl font-bold text-center py-4 border-b border-primary/10 mb-4">
                  {Math.round(personalAnalysis.avg_nutrients.calories)} <span className="text-sm font-normal">kcal</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Protein</p>
                    <p className="font-bold">{personalAnalysis.avg_nutrients.protein.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Iron</p>
                    <p className="font-bold">{personalAnalysis.avg_nutrients.iron.toFixed(1)}mg</p>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        )}

        {/* Database Stats Toggle */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-xl font-semibold">Database Landscape</h2>
          </div>

          {/* Key Stats */}
          {nutrientSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 glass-card transition-all hover:border-primary/50">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Foods</p>
                <p className="text-3xl font-bold text-primary">{nutrientSummary.total_foods}</p>
              </Card>
              <Card className="p-6 glass-card">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Avg. Protein</p>
                <p className="text-3xl font-bold text-chart-1">{(nutrientSummary.avg_nutrients?.protein || 0).toFixed(1)}g</p>
              </Card>
              <Card className="p-6 glass-card">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Avg. Iron</p>
                <p className="text-3xl font-bold text-chart-4">{(nutrientSummary.avg_nutrients?.iron || 0).toFixed(1)}mg</p>
              </Card>
              <Card className="p-6 glass-card">
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Avg. Calcium</p>
                <p className="text-3xl font-bold text-chart-3">{Math.round(nutrientSummary.avg_nutrients?.calcium || 0)}mg</p>
              </Card>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {vegNonvegStats && (
              <Card className="p-8 glass-card">
                <DonutChart
                  title="Diet Type"
                  data={[
                    { label: 'Veg', value: vegNonvegStats.vegetarian?.count || 0 },
                    { label: 'Non-Veg', value: vegNonvegStats.non_vegetarian?.count || 0 }
                  ]}
                  colors={['#10b981', '#f59e0b']}
                />
              </Card>
            )}
            {calorieDistribution && (
              <Card className="p-8 glass-card">
                <DonutChart
                  title="Calorie Density"
                  data={[
                    { label: 'Low', value: calorieDistribution.low_calorie || 0 },
                    { label: 'Med', value: calorieDistribution.medium_calorie || 0 },
                    { label: 'High', value: calorieDistribution.high_calorie || 0 }
                  ]}
                />
              </Card>
            )}
            {giDistribution && (
              <Card className="p-8 glass-card">
                <DonutChart
                  title="Glycemic Index"
                  data={[
                    { label: 'Low GI', value: giDistribution.low_gi || 0 },
                    { label: 'Med GI', value: giDistribution.medium_gi || 0 },
                    { label: 'High GI', value: giDistribution.high_gi || 0 }
                  ]}
                />
              </Card>
            )}
          </div>

          {/* Leaderboards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            {proteinFoods.length > 0 && (
              <Card className="p-8 glass-card">
                <BarChart
                  title="Top Protein Sources (per 100g)"
                  data={proteinFoods.map((f: any) => ({
                    label: f['Food Name'] || f.name,
                    value: f['Protein (g)'] || f.protein
                  }))}
                  color="bg-primary"
                  valueLabel="g"
                />
              </Card>
            )}
            {ironAnalysis?.top_iron_sources && (
              <Card className="p-8 glass-card">
                <BarChart
                  title="Top Iron Sources (per 100g)"
                  data={ironAnalysis.top_iron_sources.map((f: any) => ({
                    label: f['Food Name'] || f.name,
                    value: f['Iron (mg)'] || f.iron
                  }))}
                  color="bg-chart-4"
                  valueLabel="mg"
                />
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
