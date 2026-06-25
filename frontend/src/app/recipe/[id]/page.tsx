"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, Flame, Droplets, Zap, Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function RecipeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || loading) return;

    const fetchRecipe = async () => {
      try {
        const data = await apiFetch(`/api/recipes/${id}`, { method: "GET" });
        setRecipe(data);
      } catch (error) {
        console.error("Failed to fetch recipe:", error);
        toast.error("Failed to load recipe");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecipe();
  }, [id, user, loading]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-card border border-border/60 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Utensils className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Sign in to view recipes</h1>
          <p className="text-muted-foreground mb-6 text-sm">Access IFCT-verified Indian recipes with full nutrition data.</p>
          <Link href="/login"><Button className="w-full">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-24 rounded bg-muted/50" />
            <div className="h-10 w-64 rounded bg-muted/50" />
            <div className="h-40 rounded-xl bg-muted/50" />
            <div className="h-60 rounded-xl bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-card border border-border/60 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <Utensils className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Recipe not found</h1>
          <p className="text-muted-foreground text-sm mb-6">The recipe you're looking for doesn't exist or has been removed.</p>
          <Link href="/recipes"><Button>Back to Recipes</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Recipe Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{recipe.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            {recipe.cook_time_minutes && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{recipe.cook_time_minutes} min</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                {recipe.difficulty}
              </span>
            </div>
            <div className="text-muted-foreground">
              Servings: <span className="font-medium">{recipe.servings}</span>
            </div>
          </div>
        </div>

        {/* Nutrition Card */}
        {(recipe.calories || recipe.protein_g || recipe.fat_g || recipe.carbs_g || recipe.fibre_g) && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Nutrition Facts (per serving)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {recipe.calories && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold">{recipe.calories.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
              )}
              {recipe.protein_g && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold">{recipe.protein_g.toFixed(1)}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
              )}
              {recipe.fat_g && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Droplets className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold">{recipe.fat_g.toFixed(1)}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              )}
              {recipe.carbs_g && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{recipe.carbs_g.toFixed(1)}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
              )}
              {recipe.fibre_g && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{recipe.fibre_g.toFixed(1)}g</p>
                  <p className="text-xs text-muted-foreground">Fibre</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Ingredients */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-primary font-bold mt-1">•</span>
                <span>
                  {ing.quantity} {ing.unit} {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Instructions */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((step: string, idx: number) => (
              <li key={idx} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                  {idx + 1}
                </span>
                <p className="flex-1 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => router.push("/recipes")} variant="outline" className="flex-1">
            Back to Recipes
          </Button>
        </div>
      </div>
    </div>
  );
}
