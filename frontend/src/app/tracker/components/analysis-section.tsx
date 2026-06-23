"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, BarChart3, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface NutrientStatus {
  label: string;
  key: string;
  unit: string;
  avg: number;
  target: number;
  pct: number;
}

const NUTRIENT_MAP: { label: string; key: string; unit: string; targetKey: string }[] = [
  { label: "Energy", key: "avg_daily_calories", unit: "kcal", targetKey: "energy" },
  { label: "Protein", key: "avg_daily_protein_g", unit: "g", targetKey: "protein_g" },
  { label: "Carbs", key: "avg_daily_carbs_g", unit: "g", targetKey: "carbs_g" },
  { label: "Fat", key: "avg_daily_fat_g", unit: "g", targetKey: "fat_g" },
  { label: "Iron", key: "avg_daily_iron_mg", unit: "mg", targetKey: "iron_mg" },
  { label: "Calcium", key: "avg_daily_calcium_mg", unit: "mg", targetKey: "calcium_mg" },
  { label: "Fibre", key: "avg_daily_fibre_g", unit: "g", targetKey: "fibre_g" },
];

export default function AnalysisSection() {
  const [range, setRange] = useState(7);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [targets, setTargets] = useState<any>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sumData, profile] = await Promise.all([
          apiFetch<any>(`/api/tracker/summary?days=${range}`),
          apiFetch<any>("/api/analysis/customer-profile"),
        ]);
        setSummary(sumData);
        setTargets(profile?.rda_match || {});
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const nutrients: NutrientStatus[] = useMemo(() => {
    if (!summary || !targets) return [];
    return NUTRIENT_MAP.map((n) => {
      const avg = summary[n.key] || 0;
      const target = targets[n.targetKey] || 0;
      const pct = target > 0 ? Math.round((avg / target) * 100) : 0;
      return { label: n.label, key: n.key, unit: n.unit, avg, target, pct };
    });
  }, [summary, targets]);

  const goodNutrients = nutrients.filter((n) => n.pct >= 80);
  const lackingNutrients = nutrients.filter((n) => n.pct < 80 && n.pct > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        Analyzing...
      </div>
    );
  }

  if (!summary || !summary.days_logged) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <BarChart3 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="font-semibold text-foreground">No data to analyze</p>
        <p className="text-xs text-muted-foreground mt-1">Log some meals first, then come back for insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Nutrition Analysis</h2>
        </div>
        <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                range === d ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Last {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Based on {summary.days_logged} day{summary.days_logged !== 1 ? "s" : ""} of data
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {nutrients.map((n) => {
          const isGood = n.pct >= 80;
          const isExcess = n.pct > 120;
          return (
            <div key={n.key} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-foreground">{n.label}</span>
                <span className="text-xs text-muted-foreground">
                  {n.avg} / {n.target} {n.unit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    isGood ? (isExcess ? "bg-amber-500" : "bg-green-500") : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(n.pct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className={cn("text-xs font-semibold", isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  {n.pct}%
                </span>
                {isGood ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goodNutrients.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-bold text-green-600 dark:text-green-400">On Track</h3>
            </div>
            <ul className="space-y-1">
              {goodNutrients.map((n) => (
                <li key={n.key} className="text-xs text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                  {n.label} — {n.avg}/{n.target}{n.unit} ({n.pct}%)
                </li>
              ))}
            </ul>
          </div>
        )}
        {lackingNutrients.length > 0 && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Needs Attention</h3>
            </div>
            <ul className="space-y-1">
              {lackingNutrients.map((n) => (
                <li key={n.key} className="text-xs text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                  {n.label} — {n.avg}/{n.target}{n.unit} ({n.pct}%)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {summary.insight && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">{summary.insight}</p>
        </div>
      )}
    </div>
  );
}
