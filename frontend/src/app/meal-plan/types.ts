export interface FoodItem {
  name: string;
  qty: string;
  cal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  iron_mg?: number;
  calcium_mg?: number;
  note?: string;
}
export interface DayPlan {
  day: number;
  label: string;
  breakfast: FoodItem[];
  mid_morning: FoodItem[];
  lunch: FoodItem[];
  snack: FoodItem[];
  dinner: FoodItem[];
  cal_approx?: number;
}
export interface GroceryCategory {
  category: string;
  items: { name: string; qty: string; cost_inr: number }[];
}
export interface MealPlan {
  summary: string;
  days: DayPlan[];
  grocery: GroceryCategory[];
  grocery_total_inr: number;
  parse_error?: boolean;
}
export interface SavedPlan {
  id: number;
  plan: MealPlan;
  days: number;
  budget: number;
  created_at: string;
}

export interface QuestionnaireState {
  days: number;
  budget: number;
  people: number;
  goal: string;
  dietType: string;
  allergies: string;
  favoriteFoods: string;
  dislikedFoods: string;
  spiceLevel: string;
  cookingTime: string;
  mealFrequency: string;
  snacksPreference: string;
  beverages: string;
  healthConditions: string;
  activityLevel: string;
  sleepHours: string;
  stressLevel: string;
  hydrationLevel: string;
  exerciseFreq: string;
  weightGoal: string;
  specialRequirements: string;
  suggestions: string;
}

export const SLOTS: { key: keyof DayPlan; label: string; icon: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "mid_morning", label: "Mid-morning", icon: "☕" },
  { key: "lunch", label: "Lunch", icon: "🍛" },
  { key: "snack", label: "Snack", icon: "🥜" },
  { key: "dinner", label: "Dinner", icon: "🌙" },
];

export const NUTRI_COLORS: Record<string, string> = {
  energy: "var(--color-calories)",
  protein: "var(--color-protein)",
  carbs: "var(--color-carbs)",
  fat: "var(--color-fat)",
  iron: "#F59E0B",
  calcium: "#6366F1",
};

export const DEFAULT_Q: QuestionnaireState = {
  days: 7, budget: 300, people: 1, goal: "Maintenance", dietType: "VEG",
  allergies: "", favoriteFoods: "", dislikedFoods: "", spiceLevel: "Medium",
  cookingTime: "30 min", mealFrequency: "3", snacksPreference: "Healthy",
  beverages: "Tea/Coffee", healthConditions: "", activityLevel: "Sedentary",
  sleepHours: "7", stressLevel: "Moderate", hydrationLevel: "6-8 glasses",
  exerciseFreq: "None", weightGoal: "Maintain", specialRequirements: "", suggestions: "",
};
