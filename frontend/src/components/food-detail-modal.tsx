"use client";
import { X, FileText } from "lucide-react";
import type { FoodItem } from "@/app/meal-plan/types";
import { useEffect, useRef } from "react";

const NUTRIENTS = [
  { l: "Energy", key: "cal" as const, u: "kcal" },
  { l: "Protein", key: "protein_g" as const, u: "g" },
  { l: "Carbs", key: "carbs_g" as const, u: "g" },
  { l: "Fat", key: "fat_g" as const, u: "g" },
  { l: "Iron", key: "iron_mg" as const, u: "mg" },
  { l: "Calcium", key: "calcium_mg" as const, u: "mg" },
];

export default function FoodDetailModal({ item, onClose }: { item: FoodItem; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} nutrition details`}
    >
      <div className="bg-card border border-border/60 rounded-xl p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{item.name}</h3>
          <button ref={closeRef} onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{item.qty}</p>
        {item.note && <p className="text-xs text-muted-foreground italic mb-4 p-2 bg-muted/40 rounded-lg">{item.note}</p>}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {NUTRIENTS.filter(m => item[m.key] !== undefined).map(m => (
            <div key={m.l} className="bg-muted/40 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">{m.l}</p>
              <p className="text-xs font-bold">{item[m.key]}<span className="text-[9px] text-muted-foreground ml-0.5">{m.u}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
