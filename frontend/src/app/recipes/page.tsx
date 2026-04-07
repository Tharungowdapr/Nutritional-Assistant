"use client";

import { useState } from "react";
import { CookingPot, Wand2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mealPlanApi } from "@/lib/api";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function RecipesPage() {
  const [mealName, setMealName] = useState("");
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [servings, setServings] = useState(2);
  const [recipe, setRecipe] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const addIngredient = () => {
    if (ingredientInput.trim() && !ingredients.includes(ingredientInput.trim())) {
      setIngredients([...ingredients, ingredientInput.trim()]);
      setIngredientInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleGenerate = async () => {
    if (!mealName.trim()) {
      toast.error("Please enter a meal name (e.g. Masala Oats)");
      return;
    }
    if (ingredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    setIsGenerating(true);
    try {
      const res: any = await mealPlanApi.recipe({
        meal_name: mealName,
        ingredients,
        servings
      });
      setRecipe(res.recipe?.recipe_text || "Failed to generate recipe text.");
      toast.success("Recipe crafted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to craft recipe");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 fade-in pb-20">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <CookingPot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Recipe Crafter</h1>
          <p className="text-sm text-muted-foreground">Turn ingredients into healthy, IFCT-measured Indian meals</p>
        </div>
      </header>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Input Form */}
        <div className="md:col-span-5 space-y-6">
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">What do you want to make?</label>
              <Input 
                placeholder="e.g. Ragi Dosa, Moong Dal Chilla..." 
                value={mealName}
                onChange={e => setMealName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Servings</label>
              <div className="flex items-center bg-background border rounded-md">
                <button 
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >-</button>
                <div className="flex-1 text-center font-medium">{servings}</div>
                <button 
                  onClick={() => setServings(servings + 1)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground"
                >+</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ingredients you have</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. Ragi flour" 
                  value={ingredientInput}
                  onChange={e => setIngredientInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-background"
                />
                <Button variant="secondary" onClick={addIngredient}>Add</Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {ingredients.map(ing => (
                  <div key={ing} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                    <span>{ing}</span>
                    <button onClick={() => removeIngredient(ing)} className="hover:text-foreground ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full mt-4">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Craft Recipe
            </Button>
          </div>
        </div>

        {/* Output */}
        <div className="md:col-span-7">
          {recipe ? (
            <div className="glass-card p-6 md:p-8 relative">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                  AI Crafted
                </span>
              </div>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                <ReactMarkdown>{recipe}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground max-w-[250px]">
                Enter a meal name and ingredients to generate a step-by-step recipe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
