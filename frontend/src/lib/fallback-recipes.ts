export const getFallbackPlan = (days: number, dietType: string, budget: number) => {
  const isVeg = dietType.toUpperCase() === "VEG" || dietType.toUpperCase() === "VEGAN";
  
  const breakfasts = [
    { name: isVeg ? "Oats Idli" : "Scrambled Eggs", qty_g: 150, cal: 250, protein_g: 12, carbs_g: 30, fat_g: 8, iron_mg: 2, calcium_mg: 50 },
    { name: isVeg ? "Poha with Sprouts" : "Masala Omelette", qty_g: 180, cal: 280, protein_g: 10, carbs_g: 45, fat_g: 6, iron_mg: 3, calcium_mg: 30 },
    { name: isVeg ? "Upma (Semolina)" : "Boiled Eggs (2)", qty_g: 200, cal: 220, protein_g: 8, carbs_g: 40, fat_g: 4, iron_mg: 1.5, calcium_mg: 25 },
    { name: isVeg ? "Besan Chilla" : "Paneer & Egg Bhurji", qty_g: 160, cal: 260, protein_g: 14, carbs_g: 25, fat_g: 10, iron_mg: 4, calcium_mg: 60 },
  ];

  const lunches = [
    { 
      main: "Roti / Chapati", 
      side: isVeg ? "Paneer Butter Masala" : "Chicken Curry",
      cal: 550, protein: 25, carbs: 60, fat: 20, iron: 5, ca: 180 
    },
    { 
      main: "Mixed Veg Pulao", 
      side: isVeg ? "Dal Tadka" : "Fish Curry",
      cal: 500, protein: 20, carbs: 70, fat: 15, iron: 4, ca: 100 
    },
    { 
      main: "Paratha", 
      side: isVeg ? "Aloo Gobi" : "Egg Curry",
      cal: 600, protein: 18, carbs: 75, fat: 25, iron: 3, ca: 120 
    },
    { 
      main: "Jeera Rice", 
      side: isVeg ? "Rajma Masala" : "Mutton Keema (Lean)",
      cal: 580, protein: 22, carbs: 65, fat: 18, iron: 6, ca: 90 
    },
  ];

  const dinners = [
    { 
      main: "Brown Rice", 
      side: isVeg ? "Moong Dal" : "Fish Tikka",
      cal: 420, protein: 20, carbs: 55, fat: 8, iron: 4, ca: 60 
    },
    { 
      main: "Khichdi", 
      side: "Curd (Yogurt)",
      cal: 380, protein: 15, carbs: 65, fat: 5, iron: 3, ca: 150 
    },
    { 
      main: "Roti", 
      side: isVeg ? "Bhindi Masala" : "Grilled Chicken",
      cal: 450, protein: 22, carbs: 50, fat: 12, iron: 5, ca: 80 
    },
    { 
      main: "Dalia (Broken Wheat)", 
      side: isVeg ? "Mixed Vegetable Sabzi" : "Chicken Clear Soup",
      cal: 350, protein: 18, carbs: 60, fat: 4, iron: 4, ca: 70 
    },
  ];

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
    const b = breakfasts[i % breakfasts.length];
    const l = lunches[i % lunches.length];
    const d = dinners[i % dinners.length];

    basePlan.days.push({
      day: i + 1,
      day_label: dayLabels[i % 7],
      meals: {
        Breakfast: {
          foods: [
            { ...b, qty_label: "1 portion" },
            { name: "Filter Coffee / Tea", qty_g: 100, qty_label: "1 cup", cal: 50, protein_g: 2, carbs_g: 10, fat_g: 2, iron_mg: 0, calcium_mg: 40 }
          ],
          prep_time_min: 15,
          meal_total: { cal: b.cal + 50, protein_g: b.protein_g + 2, carbs_g: b.carbs_g + 10, fat_g: b.fat_g + 2, iron_mg: b.iron_mg, calcium_mg: b.calcium_mg + 40 }
        },
        Lunch: {
          foods: [
            { name: l.main, qty_g: 100, qty_label: "2 pieces", cal: 200, protein_g: 5, carbs_g: 40, fat_g: 2, iron_mg: 1, calcium_mg: 20 },
            { name: l.side, qty_g: 200, qty_label: "1 bowl", cal: l.cal - 200, protein_g: l.protein - 5, carbs_g: l.carbs - 40, fat_g: l.fat - 2, iron_mg: l.iron - 1, calcium_mg: l.ca - 20 }
          ],
          prep_time_min: 30,
          meal_total: { cal: l.cal, protein_g: l.protein, carbs_g: l.carbs, fat_g: l.fat, iron_mg: l.iron, calcium_mg: l.ca }
        },
        Dinner: {
          foods: [
            { name: d.main, qty_g: 150, qty_label: "1 portion", cal: 150, protein_g: 3, carbs_g: 30, fat_g: 1, iron_mg: 1, calcium_mg: 10 },
            { name: d.side, qty_g: 150, qty_label: "1 bowl", cal: d.cal - 150, protein_g: d.protein - 3, carbs_g: d.carbs - 30, fat_g: d.fat - 1, iron_mg: d.iron - 1, calcium_mg: d.ca - 10 }
          ],
          prep_time_min: 25,
          meal_total: { cal: d.cal, protein_g: d.protein, carbs_g: d.carbs, fat_g: d.fat, iron_mg: d.iron, calcium_mg: d.ca }
        }
      },
      day_total: { 
        cal: (b.cal + 50) + l.cal + d.cal, 
        protein_g: (b.protein_g + 2) + l.protein + d.protein, 
        carbs_g: (b.carbs_g + 10) + l.carbs + d.carbs, 
        fat_g: (b.fat_g + 2) + l.fat + d.fat, 
        iron_mg: b.iron_mg + l.iron + d.iron, 
        calcium_mg: (b.calcium_mg + 40) + l.ca + d.ca 
      }
    });
  }

  return basePlan;
};

