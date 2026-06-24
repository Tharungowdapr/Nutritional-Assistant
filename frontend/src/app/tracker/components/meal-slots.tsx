"use client";

import { Trash2 } from "lucide-react";
import { DailySummary } from "../types";

interface Props {
  summary: DailySummary | null;
  mealSlots: string[];
  onAddMeal: (slot: string) => void;
  onDeleteLog: (id: number) => void;
}

export default function MealSlots({ summary, mealSlots, onAddMeal, onDeleteLog }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Today</h2>
      <div className="space-y-3">
        {mealSlots.map(slot => {
          const meals = summary?.meals_by_slot[slot] || [];
          return (
            <div key={slot} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-medium text-muted-foreground">{slot}</p>
                <p className="text-[10px] text-muted-foreground">{meals.length} items</p>
              </div>
              {meals.length === 0 ? (
                <button onClick={() => onAddMeal(slot)}
                  className="w-full py-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  + Add {slot}
                </button>
              ) : (
                meals.map(m => (
                  <div key={m.id} className="group bg-card border border-border p-3 rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{m.food_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.quantity_g < 20 ? `${m.quantity_g} serving(s)` : `${m.quantity_g}g`} · {Math.round(m.calories)} kcal
                        </p>
                      </div>
                      <button onClick={() => onDeleteLog(m.id)}
                        className="p-1.5 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                        aria-label={`Delete ${m.food_name}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {(m.carbs_g || m.fat_g || m.fibre_g) ? (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        {m.carbs_g ? <span>C {Math.round(m.carbs_g)}g</span> : null}
                        {m.fat_g ? <span>F {Math.round(m.fat_g)}g</span> : null}
                        {m.fibre_g ? <span>Fibre {Math.round(m.fibre_g)}g</span> : null}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
