"use client";

import React from "react";
import { ChevronDown, Target, AlertTriangle, UtensilsCrossed, Flame, TrendingUp, ShoppingCart, CheckCircle, ExternalLink, ChefHat, Wheat, Apple, Milk, Beef, LeafyGreen } from "lucide-react";
import { cn } from "@/lib/utils";
import { FoodItem, MealPlan, SLOTS, NUTRI_COLORS } from "../types";

interface PlanViewProps {
  plan: MealPlan;
  collapsedDays: Record<number, boolean>;
  expandedItems: Record<string, boolean>;
  checked: Record<string, boolean>;
  numPeople: number;
  toggleDay: (day: number) => void;
  toggleItem: (key: string) => void;
  toggleCheck: (key: string) => void;
  onFoodSelect: (item: FoodItem) => void;
}

function CategoryIcon({ category }: { category: string }) {
  const key = category.toLowerCase().split(" ")[0];
  const icons: Record<string, any> = {
    "grains": Wheat, "pulses": Beef, "dairy": Milk, "vegetables": LeafyGreen,
    "fruits": Apple, "spices": ChefHat, "oils": ChefHat,
  };
  const Icon = icons[key];
  return Icon ? <Icon className="w-3.5 h-3.5 text-primary/60" /> : null;
}

function recipeUrl(name: string): string {
  return `https://www.google.com/search?q=indian+${encodeURIComponent(name)}+recipe`;
}

function slotTotal(items: FoodItem[], key: "cal" | "protein_g"): number {
  return items.reduce((s, i) => s + ((i as any)[key] || 0), 0);
}

export default function PlanView({
  plan, collapsedDays, expandedItems, checked, numPeople,
  toggleDay, toggleItem, toggleCheck, onFoodSelect,
}: PlanViewProps) {
  const days = plan.days || [];
  const dayTotals = days.map(d => ({
    cal: SLOTS.reduce((s, sl) => s + slotTotal(d[sl.key] as FoodItem[] || [], "cal"), 0),
    protein: SLOTS.reduce((s, sl) => s + slotTotal(d[sl.key] as FoodItem[] || [], "protein_g"), 0),
  }));
  const avgCal = Math.round(dayTotals.reduce((s, t) => s + t.cal, 0) / (dayTotals.length || 1));
  const avgProtein = Math.round(dayTotals.reduce((s, t) => s + t.protein, 0) / (dayTotals.length || 1));

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {plan.summary && (
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Your Personalized Plan</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.summary}</p>
        </div>
      )}

      {/* Nutrition Overview */}
      {dayTotals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Avg Daily Energy", value: `${avgCal}`, unit: "kcal", color: NUTRI_COLORS.energy, icon: Flame },
            { label: "Avg Daily Protein", value: `${avgProtein}`, unit: "g", color: NUTRI_COLORS.protein, icon: TrendingUp },
            { label: "Total Days", value: `${days.length}`, unit: "", color: "var(--color-primary)", icon: UtensilsCrossed },
            { label: "Total Meals", value: `${days.length * 5}`, unit: "", color: "var(--color-primary)", icon: ChefHat },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-4 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.color }} />
              <p className="text-lg md:text-2xl font-bold" style={{ color: s.color }}>{s.value}<span className="text-xs text-muted-foreground ml-0.5">{s.unit}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {plan.parse_error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-sm text-amber-600">
          <AlertTriangle className="w-4 h-4 shrink-0" /> The AI response could not be fully parsed. Showing available data.
        </div>
      )}

      {/* Daily Meal Tables */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UtensilsCrossed className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold">{days.length}-Day Meal Plan</h2>
        </div>

        <div className="space-y-4">
          {days.map((day, di) => {
            const collapsed = collapsedDays[day.day];
            const totalCal = dayTotals[di]?.cal || 0;
            const totalProtein = dayTotals[di]?.protein || 0;

            return (
              <div key={day.day} className="bg-card border border-border/60 rounded-xl overflow-hidden">
                {/* Day Header */}
                <button
                  onClick={() => toggleDay(day.day)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors border-b border-border/60"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded">Day {day.day}</span>
                    <span className="text-sm font-semibold">{day.label}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="w-3 h-3" /> {totalCal} kcal</span>
                    {totalProtein > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {totalProtein}g protein</span>
                    )}
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
                </button>

                {/* Meal Table */}
                {!collapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/20">
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-28">Meal</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Items</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground w-16">Cal</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground w-16">Protein</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground w-14">Recipe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SLOTS.map(slot => {
                          const items = day[slot.key] as FoodItem[];
                          if (!items?.length) return null;
                          const slotCals = slotTotal(items, "cal");
                          const slotProtein = slotTotal(items, "protein_g");
                          return (
                            <tr key={slot.key} className="border-b border-border/40 last:border-0">
                              <td className="px-4 py-3 align-top">
                                <span className="text-sm shrink-0">{slot.icon} {slot.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1.5">
                                  {items.map((item, i) => {
                                    const ik = `${day.day}-${slot.key}-${i}`;
                                    const expanded = expandedItems[ik];
                                    return (
                                      <div key={ik}>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => onFoodSelect(item)}
                                            className="text-sm font-medium hover:text-primary transition-colors text-left"
                                          >
                                            {item.name}
                                          </button>
                                          <span className="text-[10px] text-muted-foreground">({item.qty})</span>
                                          {item.note && (
                                            <button onClick={() => toggleItem(ik)} className="text-[10px] text-primary/60 hover:text-primary truncate max-w-[120px]">
                                              {expanded ? "less" : item.note.substring(0, 20) + "..."}
                                            </button>
                                          )}
                                        </div>
                                        {expanded && (
                                          <div className="mt-1.5 grid grid-cols-3 md:grid-cols-6 gap-1.5">
                                            {[
                                              { l: "Energy", v: item.cal, u: "kcal" },
                                              { l: "Protein", v: item.protein_g, u: "g" },
                                              { l: "Carbs", v: item.carbs_g, u: "g" },
                                              { l: "Fat", v: item.fat_g, u: "g" },
                                              { l: "Iron", v: item.iron_mg, u: "mg" },
                                              { l: "Calcium", v: item.calcium_mg, u: "mg" },
                                            ].filter(m => m.v !== undefined).map(m => (
                                              <div key={m.l} className="bg-muted/40 rounded p-1 text-center">
                                                <p className="text-[8px] text-muted-foreground">{m.l}</p>
                                                <p className="text-[11px] font-bold" style={{ color: NUTRI_COLORS[m.l.toLowerCase()] || "inherit" }}>{m.v}<span className="text-[7px] text-muted-foreground ml-0.5">{m.u}</span></p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-semibold text-orange-600 align-top">{slotCals > 0 ? slotCals : ""}</td>
                              <td className="px-3 py-3 text-right font-semibold text-emerald-600 align-top">{slotProtein > 0 ? `${slotProtein}g` : ""}</td>
                              <td className="px-3 py-3 text-center align-top">
                                <div className="flex flex-col gap-1">
                                  {items.map((item, i) => (
                                    <a
                                      key={i}
                                      href={recipeUrl(item.name)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/5 hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors mx-auto"
                                      title={`Recipe for ${item.name}`}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {totalCal > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-border bg-muted/10">
                            <td className="px-4 py-2.5 font-semibold text-xs">Totals</td>
                            <td className="px-4 py-2.5"></td>
                            <td className="px-3 py-2.5 text-right font-bold text-orange-600">{totalCal} kcal</td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{totalProtein}g</td>
                            <td className="px-3 py-2.5"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grocery List */}
      {plan.grocery && plan.grocery.length > 0 && (
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-primary/5 border-b border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Grocery List</h2>
              <span className="text-xs text-muted-foreground">For {days.length} days, {numPeople} person(s)</span>
            </div>
            {plan.grocery_total_inr ? (
              <div className="text-right">
                <span className="text-lg font-bold text-primary">₹{plan.grocery_total_inr}</span>
              </div>
            ) : null}
          </div>

          {/* Category cost summary */}
          {(() => {
            const catTotals = plan.grocery.map(cat => ({
              name: cat.category,
              total: cat.items.reduce((s, i) => s + (i.cost_inr || 0), 0),
            }));
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-muted/10 border-b border-border/40">
                {catTotals.map(ct => (
                  <div key={ct.name} className="text-center">
                    <p className="text-[10px] text-muted-foreground">{ct.name}</p>
                    <p className="text-xs font-semibold">₹{ct.total}</p>
                  </div>
                ))}
                <div className="text-center border-t border-border/40 pt-1 col-span-full flex justify-center gap-6">
                  <p className="text-xs text-muted-foreground">Total Bill:</p>
                  <p className="text-sm font-bold text-primary">₹{plan.grocery_total_inr}</p>
                </div>
              </div>
            );
          })()}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground w-5"></th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Category / Item</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-24">Qty</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-20">Cost</th>
                </tr>
              </thead>
              <tbody>
                {plan.grocery.map((cat, ci) => (
                  <React.Fragment key={ci}>
                    <tr className="border-b border-border/40 bg-muted/10">
                      <td className="px-4 py-2">
                        <CategoryIcon category={cat.category} />
                      </td>
                      <td colSpan={3} className="px-4 py-2 font-semibold text-xs text-primary">{cat.category}</td>
                    </tr>
                    {cat.items.map((item, ii) => {
                      const ck = `${ci}-${ii}`;
                      return (
                        <tr key={ck} className="border-b border-border/20 hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => toggleCheck(ck)}>
                          <td className="px-4 py-2">
                            <div className={cn("w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0", checked[ck] ? "bg-primary border-primary" : "border-border")}>
                              {checked[ck] && <CheckCircle className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                          </td>
                          <td className={cn("px-4 py-2 text-sm", checked[ck] && "line-through text-muted-foreground")}>{item.name}</td>
                          <td className={cn("px-4 py-2 text-right text-sm", checked[ck] && "line-through text-muted-foreground")}>{item.qty}</td>
                          <td className={cn("px-4 py-2 text-right text-sm font-semibold", checked[ck] ? "text-muted-foreground line-through" : "text-primary")}>₹{item.cost_inr}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
              {plan.grocery_total_inr ? (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/10">
                    <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-sm">Total:</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary text-sm">₹{plan.grocery_total_inr}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
