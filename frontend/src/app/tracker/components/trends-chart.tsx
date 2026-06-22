"use client";

import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  historyData: any;
  loadingHistory: boolean;
  historyRange: number;
  onRangeChange: (range: number) => void;
  targetEnergy: number;
}

export default function TrendsChart({ historyData, loadingHistory, historyRange, onRangeChange, targetEnergy }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends</h2>
        <div className="flex p-0.5 rounded-md bg-muted border border-border">
          {[7, 30].map(r => (
            <button key={r} onClick={() => onRangeChange(r)}
              className={cn("px-3 py-1 rounded text-xs font-medium transition-colors", historyRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{r}d</button>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Average daily</p>
              <p className="text-3xl font-bold">{historyData?.avg_daily_calories?.toFixed(0) || 0} <span className="text-sm text-muted-foreground font-normal">kcal</span></p>
            </div>
            <div className="h-32 flex items-end gap-1">
              {historyData?.daily_data?.map((d: any, i: number) => {
                const h = Math.min((d.calories / (targetEnergy || 2000)) * 100, 100);
                return (
                  <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                    <div className="w-full rounded-t bg-primary/20 group-hover:bg-primary/40 transition-colors" style={{ height: `${h}%` }} />
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
  );
}
