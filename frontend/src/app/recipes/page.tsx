"use client";

import { useState } from "react";
import { CookingPot, Wand2, Loader2, Search, Filter, Clock, Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mealPlanApi } from "@/lib/api";
import { MAJOR_RECIPES, Recipe } from "@/lib/recipes";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiRecipe, setAiRecipe] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const categories = ["All", "Breakfast", "Main Course", "Snacks", "Dessert"];

  const filteredRecipes = MAJOR_RECIPES.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleGenerateAi = async () => {
    if (!aiInstructions.trim()) {
      toast.error("Please describe your recipe requirements");
      return;
    }
    setIsGenerating(true);
    try {
      const res: any = await mealPlanApi.recipe({ instructions: aiInstructions });
      setAiRecipe(res.recipe_text || res.recipe?.recipe_text || "Failed to generate.");
      toast.success("AI Recipe Crafted!");
    } catch (err: any) {
      toast.error(err.message || "Crafting failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-10 fade-in pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CookingPot className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Recipe Crafter</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Explore major Indian delicacies or use AI to generate hyper-personalized recipes based on ingredients or health goals.
          </p>
        </div>
        <Button onClick={() => setShowAiModal(true)} size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <Wand2 className="w-4 h-4 mr-2" />
          Customize with AI
        </Button>
      </header>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search recipes..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 border-none bg-secondary/50 focus-visible:ring-1"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === c 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRecipes.map(recipe => (
          <div 
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="glass-card group cursor-pointer flex flex-col overflow-hidden"
          >
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-5">
                 <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${
                   recipe.diet_type === 'VEG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                 }`}>
                   {recipe.diet_type}
                 </span>
                 <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:underline">{recipe.name}</h3>
                 <p className="text-white/80 text-xs line-clamp-1">{recipe.category}</p>
               </div>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
                <div className="bg-secondary/50 p-2 rounded-lg">
                  <p className="text-muted-foreground mb-1">Cals</p>
                  <p className="text-foreground">{recipe.calories}</p>
                </div>
                <div className="bg-secondary/50 p-2 rounded-lg">
                  <p className="text-muted-foreground mb-1">Protein</p>
                  <p className="text-foreground">{recipe.protein}g</p>
                </div>
                <div className="bg-secondary/50 p-2 rounded-lg">
                  <p className="text-muted-foreground mb-1">Carbs</p>
                  <p className="text-foreground">{recipe.carbs}g</p>
                </div>
              </div>
              <Button variant="outline" className="w-full h-10 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                View Recipe <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Modals / Dialogs */}
      <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <div className="flex flex-col md:flex-row h-full min-h-[500px]">
             {/* Left: Input */}
             <div className="md:w-[400px] p-8 border-r border-border space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-primary" />
                    AI Personalizer
                  </h2>
                  <p className="text-sm text-muted-foreground">Describe what you want to cook, including ingredients or diet goals.</p>
                </div>
                <textarea 
                  value={aiInstructions}
                  onChange={e => setAiInstructions(e.target.value)}
                  placeholder="e.g. Make a low-carb chicken curry using coconut milk instead of cream..."
                  className="min-h-[200px] w-full p-4 rounded-2xl bg-muted border-none text-sm focus:ring-1 ring-primary transition-all resize-none"
                />
                <Button 
                  onClick={handleGenerateAi} 
                  disabled={isGenerating} 
                  className="w-full py-6 rounded-2xl text-base shadow-xl"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Generate New Recipe"}
                </Button>
             </div>
             {/* Right: Output */}
             <div className="flex-1 p-8 bg-background relative min-h-[400px]">
                {aiRecipe ? (
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                     <ReactMarkdown>{aiRecipe}</ReactMarkdown>
                   </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
                    <div className="p-4 bg-secondary rounded-full">
                      <Search className="w-8 h-8" />
                    </div>
                    <p>Your AI-crafted recipe will appear here.</p>
                  </div>
                )}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Detail Modal */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-8 border-none shadow-2xl rounded-3xl">
          {selectedRecipe && (
            <div className="space-y-8">
               <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{selectedRecipe.category}</span>
                  </div>
                  <DialogTitle className="text-4xl font-black tracking-tighter">{selectedRecipe.name}</DialogTitle>
               </DialogHeader>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-secondary/30 rounded-3xl border border-border/50">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">Calories</p>
                    <p className="text-xl font-black">{selectedRecipe.calories} kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">Protein</p>
                    <p className="text-xl font-black">{selectedRecipe.protein}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">Carbs</p>
                    <p className="text-xl font-black">{selectedRecipe.carbs}g</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mb-1">Fat</p>
                    <p className="text-xl font-black">{selectedRecipe.fat}g</p>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Filter className="w-4 h-4 text-primary" />
                      Ingredients
                    </h3>
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients.map(ing => (
                        <li key={ing} className="flex items-center gap-3 text-sm text-foreground/80 bg-background p-3 rounded-xl border border-border/50 group hover:border-primary/50 transition-colors">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Preparation Steps
                    </h3>
                    <ol className="space-y-4">
                      {selectedRecipe.steps.map((step, i) => (
                        <li key={i} className="flex gap-4 group">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-black group-hover:bg-primary group-hover:text-white transition-colors">{i + 1}</span>
                          <p className="text-sm text-muted-foreground pt-1.5 group-hover:text-foreground transition-colors">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
