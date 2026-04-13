export interface Recipe {
  id: string;
  name: string;
  category: string;
  diet_type: "VEG" | "NON-VEG";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  ingredients: string[];
  steps: string[];
}

export const MAJOR_RECIPES: Recipe[] = [
  {
    id: "masala-dosa",
    name: "Classic Masala Dosa",
    category: "Breakfast",
    diet_type: "VEG",
    calories: 320,
    protein: 8,
    carbs: 52,
    fat: 10,
    description: "Crispy fermented crepe filled with spiced potato masala.",
    ingredients: ["Fermented Batter", "Potato Masala", "Ghee", "Mustard Seeds", "Curry Leaves"],
    steps: [
      "Prepare the dosa batter from rice and urad dal.",
      "Make the potato filling by sautéing boiled potatoes with spices.",
      "Heat a griddle and spread a thin layer of batter.",
      "Add ghee and cook until crispy.",
      "Place filling in the center and fold."
    ]
  },
  {
    id: "chicken-tikka-masala",
    name: "Chicken Tikka Masala",
    category: "Main Course",
    diet_type: "NON-VEG",
    calories: 450,
    protein: 35,
    carbs: 12,
    fat: 28,
    description: "Roasted marinated chicken chunks in a spiced tomato cream sauce.",
    ingredients: ["Chicken breast", "Yogurt", "Ginger-garlic paste", "Tomato puree", "Cream", "Garam Masala"],
    steps: [
      "Marinate chicken with yogurt and spices.",
      "Grill until charred and cooked through.",
      "Prepare the gravy with tomatoes, cream, and sautéed aromatics.",
      "Simmer the grilled chicken in the sauce."
    ]
  },
  {
    id: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    category: "Main Course",
    diet_type: "VEG",
    calories: 380,
    protein: 15,
    carbs: 10,
    fat: 32,
    description: "Soft paneer cubes in a rich, buttery tomato-based gravy.",
    ingredients: ["Paneer cubes", "Butter", "Cashews", "Tomato puree", "Kasuri Methi"],
    steps: [
      "Sauté cashews and onions, blend into a smooth paste.",
      "Cook tomato puree with butter and whole spices.",
      "Add the cashew paste and simmer.",
      "Stir in paneer cubes and finish with cream and crushed Kasuri Methi."
    ]
  },
  {
    id: "chana-masala",
    name: "Amritsari Chana Masala",
    category: "Main Course",
    diet_type: "VEG",
    calories: 280,
    protein: 12,
    carbs: 45,
    fat: 6,
    description: "Spiced chickpea curry from Punjab, rich in protein and fiber.",
    ingredients: ["Kabuli Chana (Chickpeas)", "Tea Bags (for color)", "Amchur Powder", "Cumin", "Ginger"],
    steps: [
      "Soak and boil chickpeas with tea bags and whole spices.",
      "Prepare a tang sauce with onions, tomatoes, and amchur.",
      "Simmer boiled chickpeas in the sauce until thickened.",
      "Garnish with ginger juliennes and green chilies."
    ]
  }
];
