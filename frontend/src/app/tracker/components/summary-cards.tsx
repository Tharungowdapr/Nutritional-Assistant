"use client";

import { Flame, Activity, Target, Utensils } from "lucide-react";
import { DailySummary } from "../types";

interface Props {
  summary: DailySummary | null;
  targets: Record<string, number>;
}

const STATS = [
  { label: "Energy", key: "total_calories", targetKey: "energy", unit: "kcal", color: "var(--color-calories)", icon: Flame },
  { label: "Protein", key: "total_protein_g", targetKey: "protein_g", unit: "g", color: "var(--color-protein)", icon: Activity },
  { label: "Carbs", key: "total_carbs_g", targetKey: "carbs_g", unit: "g", color: "var(--color-carbs)", icon: Target },
  { label: "Fat", key: "total_fat_g", targetKey: "fat_g", unit: "g", color: "var(--color-fat)", icon: Utensils },
];

export default function SummaryCards({ summary, targets }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {STATS.map(stat => {
        const val = (summary as any)?.[stat.key] || 0;
        const target = targets[stat.targetKey] || 1;
        const pct = Math.min((val / target) * 100, 100);
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <Icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{Math.round(val)}</p>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: stat.color }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{Math.round(pct)}%</span>
                <span>{target}{stat.unit}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
