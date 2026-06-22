"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealSlots: string[];
  selectedSlot: string;
  onSlotChange: (slot: string) => void;
  foodSearch: string;
  onFoodSearchChange: (query: string) => void;
  searchLoading: boolean;
  foodResults: any[];
  onFoodSelect: (food: any) => void;
  selectedFood: any;
  selectedQuantity: number;
  onQuantityChange: (qty: number) => void;
  onAddFood: () => void;
}

export default function AddFoodDialog({
  open, onOpenChange, mealSlots, selectedSlot, onSlotChange,
  foodSearch, onFoodSearchChange, searchLoading, foodResults,
  onFoodSelect, selectedFood, selectedQuantity, onQuantityChange, onAddFood,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Food</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Meal</label>
            <div className="flex gap-2 flex-wrap">
              {mealSlots.map(slot => (
                <button key={slot} onClick={() => onSlotChange(slot)}
                  className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                    selectedSlot === slot ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"
                  )}>{slot}</button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Search Food</label>
            <div className="relative">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", searchLoading ? "text-primary animate-pulse" : "text-muted-foreground")} />
              <Input placeholder="e.g. Ragi, Chicken, Dal..." value={foodSearch} onChange={e => onFoodSearchChange(e.target.value)} className="pl-9 h-10" />
            </div>
            {foodResults.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden bg-card shadow-md max-h-48 overflow-y-auto">
                {foodResults.map((food, i) => (
                  <button key={i} onClick={() => { onFoodSelect(food); onFoodSearchChange(food["Food Name"]); }}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{food["Food Name"]}</p>
                      <p className={cn("text-[10px] px-1.5 py-0.5 rounded inline-block mt-0.5", food.isRecipe ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground")}>
                        {food["Food Group"]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{Math.round(food["Energy (kcal)"])} <span className="text-xs text-muted-foreground">kcal</span></p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedFood && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Selected</p>
                  <h4 className="font-semibold">{selectedFood["Food Name"]}</h4>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {selectedFood.isRecipe
                      ? Math.round(selectedFood["Energy (kcal)"] * selectedQuantity)
                      : Math.round((selectedFood["Energy (kcal)"] * selectedQuantity) / 100)}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-primary/20 rounded-md bg-card">
                  <input type="number" value={selectedQuantity}
                    onChange={e => { const val = Number(e.target.value); onQuantityChange(Math.min(selectedFood.isRecipe ? 50 : 2000, Math.max(0, val))); }}
                    className="w-20 bg-transparent border-none text-center font-bold text-lg h-10 outline-none" />
                  <span className="pr-3 text-xs text-muted-foreground">{selectedFood.isRecipe ? "Servings" : "g"}</span>
                </div>
                {selectedFood.isRecipe && <p className="text-[10px] text-muted-foreground">Logging {selectedQuantity} serving(s)</p>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={() => onOpenChange(false)} variant="ghost" className="flex-1">Cancel</Button>
            <Button onClick={onAddFood} disabled={!selectedFood} className="flex-[2]">Log Food</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
