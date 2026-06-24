export interface MealLog {
  id: number;
  food_name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g?: number;
  [key: string]: any;
}

export interface DailySummary {
  log_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fibre_g?: number;
  meal_count: number;
  meals_by_slot: { [key: string]: MealLog[] };
}
