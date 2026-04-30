export const getFallbackPlan = (days: number, dietType: string, budget: number) => {
  const isVeg = dietType.toUpperCase() === "VEG" || dietType.toUpperCase() === "VEGAN";
  
  const basePlan = {
    customer_analysis: {
      icmr_profile: `Standard ${dietType} Maintenance`,
      energy_target: 2100,
      protein_target: 65,
      iron_target: 18,
      calcium_target: 1000,
      fibre_target: 35,
      key_risks: ["Offline Fallback Mode: Customization Limited"],
      budget_per_day: `₹${budget}`,
      rationale: "This is a reliable fallback meal plan loaded from local storage due to an AI generation failure or network issue."
    },
    days: [] as any[],
    grocery: [
      {
        category: "Produce",
        items: [
          { name: "Mixed Vegetables", qty: "2 kg", est_cost_inr: 150 },
          { name: "Fruits (Banana, Apple)", qty: "1 kg", est_cost_inr: 100 }
        ]
      },
      {
        category: "Grains & Pulses",
        items: [
          { name: "Brown Rice / Roti Atta", qty: "2 kg", est_cost_inr: 120 },
          { name: isVeg ? "Lentils (Dal)" : "Chicken Breast", qty: "1 kg", est_cost_inr: isVeg ? 150 : 300 }
        ]
      }
    ],
    total_grocery_cost_inr: budget * days
  };

  const dayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  for (let i = 0; i < days; i++) {
    basePlan.days.push({
      day: i + 1,
      day_label: dayLabels[i % 7],
      meals: {
        Breakfast: {
          foods: [
            { name: isVeg ? "Oats Idli" : "Scrambled Eggs", qty_g: 150, qty_label: "2 pieces", cal: 250, protein_g: 12, carbs_g: 30, fat_g: 8, iron_mg: 2, calcium_mg: 50 },
            { name: "Filter Coffee / Tea", qty_g: 100, qty_label: "1 cup", cal: 50, protein_g: 2, carbs_g: 10, fat_g: 2, iron_mg: 0, calcium_mg: 40 }
          ],
          prep_time_min: 15,
          meal_total: { cal: 300, protein_g: 14, carbs_g: 40, fat_g: 10, iron_mg: 2, calcium_mg: 90 }
        },
        Lunch: {
          foods: [
            { name: "Roti / Chapati", qty_g: 100, qty_label: "2 pieces", cal: 200, protein_g: 6, carbs_g: 40, fat_g: 2, iron_mg: 2, calcium_mg: 20 },
            { name: isVeg ? "Paneer Butter Masala" : "Chicken Curry", qty_g: 200, qty_label: "1 bowl", cal: 350, protein_g: 18, carbs_g: 15, fat_g: 20, iron_mg: 3, calcium_mg: 150 },
            { name: "Cucumber Salad", qty_g: 100, qty_label: "1 portion", cal: 15, protein_g: 0, carbs_g: 3, fat_g: 0, iron_mg: 0, calcium_mg: 10 }
          ],
          prep_time_min: 30,
          meal_total: { cal: 565, protein_g: 24, carbs_g: 58, fat_g: 22, iron_mg: 5, calcium_mg: 180 }
        },
        Dinner: {
          foods: [
            { name: "Brown Rice", qty_g: 150, qty_label: "1 katori", cal: 180, protein_g: 4, carbs_g: 35, fat_g: 1, iron_mg: 1, calcium_mg: 10 },
            { name: isVeg ? "Moong Dal" : "Fish Tikka", qty_g: 150, qty_label: "1 bowl", cal: 220, protein_g: 15, carbs_g: 20, fat_g: 5, iron_mg: 4, calcium_mg: 40 }
          ],
          prep_time_min: 25,
          meal_total: { cal: 400, protein_g: 19, carbs_g: 55, fat_g: 6, iron_mg: 5, calcium_mg: 50 }
        }
      },
      day_total: { cal: 1265, protein_g: 57, carbs_g: 153, fat_g: 38, iron_mg: 12, calcium_mg: 320 }
    });
  }

  return basePlan;
};
