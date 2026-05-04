const fs = require('fs');

const baseRecipes = [
  { name:"Ragi Mudde + Sambar", category:"Breakfast", diet_type:"VEG", region:"Karnataka", prep_time_min:20, servings:2, cal:390, protein_g:11, iron_mg:8.2, calcium_mg:620 },
  { name:"Rajma Rice Bowl", category:"Lunch", diet_type:"VEG", region:"North India", prep_time_min:15, servings:2, cal:545, protein_g:20, iron_mg:6.1, calcium_mg:134 },
  { name:"Bajra Roti + Methi Sabzi", category:"Dinner", diet_type:"VEG", region:"Rajasthan", prep_time_min:30, servings:2, cal:424, protein_g:13.8, iron_mg:12.8, calcium_mg:228 },
  { name:"Moong Dal Cheela", category:"Breakfast", diet_type:"VEG", region:"All India", prep_time_min:20, servings:3, cal:210, protein_g:14, iron_mg:2.8, calcium_mg:48 },
  { name:"Chicken Tikka Masala", category:"Dinner", diet_type:"NON-VEG", region:"North India", prep_time_min:45, servings:4, cal:550, protein_g:35, iron_mg:3.2, calcium_mg:100 },
  { name:"Fish Curry", category:"Lunch", diet_type:"NON-VEG", region:"Bengal", prep_time_min:30, servings:3, cal:400, protein_g:28, iron_mg:2.5, calcium_mg:150 },
  { name:"Paneer Bhurji", category:"Breakfast", diet_type:"VEG", region:"North India", prep_time_min:15, servings:2, cal:350, protein_g:18, iron_mg:1.5, calcium_mg:400 },
  { name:"Egg Curry", category:"Dinner", diet_type:"NON-VEG", region:"All India", prep_time_min:25, servings:2, cal:300, protein_g:16, iron_mg:2.5, calcium_mg:80 },
];

const variants = [
  { prefix: "Spicy", calMod: 1.1, protMod: 1 },
  { prefix: "Mild", calMod: 0.9, protMod: 1 },
  { prefix: "Healthy", calMod: 0.8, protMod: 1.2 },
  { prefix: "Protein-Rich", calMod: 1.2, protMod: 1.5 },
  { prefix: "Low-Carb", calMod: 0.7, protMod: 1.1 },
  { prefix: "Homestyle", calMod: 1.0, protMod: 1.0 },
  { prefix: "Restaurant Style", calMod: 1.4, protMod: 0.9 },
  { prefix: "Instant", calMod: 0.9, protMod: 0.9 },
  { prefix: "Garlic", calMod: 1.05, protMod: 1.0 },
  { prefix: "Lemon", calMod: 0.95, protMod: 1.0 }
];

const mainIngredients = ["with Spinach", "with Mixed Veggies", "with Mushrooms", "with Tofu", "with Extra Cheese", "with Bell Peppers", "with Peas", "with Almonds", "with Cashews", "with Coconut"];

let generated = [];

for (let b of baseRecipes) {
  for (let v of variants) {
    for (let m of mainIngredients) {
      if (generated.length >= 250) break;
      
      let newCal = Math.round(b.cal * v.calMod);
      let newProt = Math.round(b.protein_g * v.protMod);
      
      let badge = "";
      let badgeColor = "teal";
      if (newProt > 25) { badge = "High Protein"; badgeColor = "teal"; }
      else if (b.iron_mg > 5) { badge = "High Iron"; badgeColor = "red"; }
      else if (b.calcium_mg > 200) { badge = "High Calcium"; badgeColor = "purple"; }
      
      generated.push({
        id: "r" + (generated.length + 1),
        name: `${v.prefix} ${b.name} ${m}`,
        category: b.category,
        diet_type: b.diet_type,
        region: b.region,
        prep_time_min: b.prep_time_min + Math.floor(Math.random() * 10),
        servings: b.servings,
        cal: newCal,
        protein_g: newProt,
        iron_mg: b.iron_mg,
        calcium_mg: b.calcium_mg,
        badge: badge,
        badge_color: badgeColor,
        ingredients: [`Base ingredient for ${b.name}`, "Spices", "Oil", "Salt"],
        steps: ["Prepare ingredients", "Cook thoroughly", "Serve hot"]
      });
    }
  }
}

fs.writeFileSync('frontend/src/lib/recipes-db.json', JSON.stringify(generated.slice(0, 200), null, 2));
console.log(`Generated ${Math.min(generated.length, 200)} recipes.`);
