"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  ScanSearch, CookingPot, Timer, 
  Flame, Salad, Plus, X, Sparkles,
  ArrowRight, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

export default function RecipePage() {
  const [ingredients, setIngredients] = useState<string[]>(["Ragi", "Curd"])
  const [currentInput, setCurrentInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const addIngredient = () => {
    if (currentInput.trim() && !ingredients.includes(currentInput.trim())) {
      setIngredients([...ingredients, currentInput.trim()])
      setCurrentInput("")
    }
  }

  const removeIngredient = (tag: string) => {
    setIngredients(ingredients.filter(i => i !== tag))
  }

  const handleGenerate = () => {
    setIsGenerating(true)
    toast.promise(new Promise(resolve => setTimeout(resolve, 3000)), {
      loading: 'Agent is crafting an ICMR-safe recipe...',
      success: 'Recipe Created!',
      error: 'Failed to find a safe combination',
    })
    setTimeout(() => setIsGenerating(false), 3000)
  }

  return (
    <div className="container mx-auto p-4 md:p-10 space-y-10 max-w-5xl">
       {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Recipe Crafter</h1>
        <p className="text-muted-foreground">Turn current household ingredients into clinical-grade health recipes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Ingredients Input */}
        <div className="space-y-6">
          <Card className="glass-card border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg">What's in your kitchen?</CardTitle>
              <CardDescription>Enter ingredients you have available.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. Soya chunks..." 
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                  className="glass border-primary/20"
                />
                <Button size="icon" onClick={addIngredient} className="bg-primary text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 min-h-24 content-start">
                <AnimatePresence>
                  {ingredients.map((ing) => (
                    <motion.div
                      key={ing}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                    >
                      <Badge variant="secondary" className="pl-3 pr-1 py-1 gap-2 bg-primary/10 text-primary border-primary/20">
                        {ing}
                        <Button 
                          variant="ghost" size="icon" 
                          className="h-4 w-4 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"
                          onClick={() => removeIngredient(ing)}
                        >
                          <X className="w-2 h-2" />
                        </Button>
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={ingredients.length === 0 || isGenerating}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 shadow-lg shadow-amber-500/20"
              >
                {isGenerating ? "Analyzing..." : "Craft AI Recipe"}
                <CookingPot className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3 text-blue-600">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              Our agent checks the **Glycemic Index** and **Protein Rating** of your combinations using the IFCT 2017 database.
            </p>
          </div>
        </div>

        {/* Right Column: Recipe Display */}
        <div className="lg:col-span-2">
          {isGenerating ? (
            <div className="h-full min-h-[400px] glass-card flex flex-col items-center justify-center p-10 space-y-6">
              <CookingPot className="w-16 h-16 text-muted animate-bounce" />
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold">Chef Agent is cooking...</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Combining your 5 ingredients with ICMR-NIN safety guidelines.</p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card className="glass-card shadow-2xl overflow-hidden relative border-amber-500/30">
                <div className="absolute top-0 right-0 p-6 opacity-5"><CookingPot className="w-40 h-40" /></div>
                <CardHeader className="space-y-1">
                  <div className="flex gap-2 mb-2">
                     <Badge className="bg-green-500/10 text-green-600 border-green-500/20">High Protein</Badge>
                     <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Low GI</Badge>
                  </div>
                  <CardTitle className="text-3xl font-extrabold">Instant Ragi-Curd Probiotic Blast</CardTitle>
                  <CardDescription className="flex items-center gap-4 pt-2">
                    <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> 10 mins</span>
                    <span className="flex items-center gap-1"><Flame className="w-4 h-4" /> 180 kcal</span>
                    <span className="flex items-center gap-1 text-primary italic">Expert Suggestion</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                       <h3 className="font-bold flex items-center gap-2"><Salad className="w-5 h-5 text-primary" /> Key Instructions</h3>
                       <ol className="space-y-3 text-sm">
                         <li className="flex gap-3"><span className="font-bold text-primary italic">01.</span> Mix 2 tbsp Ragi flour with 50ml water and boil until thick.</li>
                         <li className="flex gap-3"><span className="font-bold text-primary italic">02.</span> Let it cool completely to preserve probiotic cultures.</li>
                         <li className="flex gap-3"><span className="font-bold text-primary italic">03.</span> Whisk 1 cup thick curd and fold into the ragi paste.</li>
                         <li className="flex gap-3"><span className="font-bold text-primary italic">04.</span> Garnish with curry leaves and a pinch of rock salt.</li>
                       </ol>
                     </div>
                     <div className="bg-muted/30 rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-sm">Clinical Value (per serving)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/50 p-3 rounded-lg border">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Protein</p>
                            <p className="text-xl font-bold">8.4g</p>
                          </div>
                          <div className="bg-white/50 p-3 rounded-lg border">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Calcium</p>
                            <p className="text-xl font-bold">340mg</p>
                          </div>
                          <div className="bg-white/50 p-3 rounded-lg border">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Fiber</p>
                            <p className="text-xl font-bold">4.2g</p>
                          </div>
                          <div className="bg-white/50 p-3 rounded-lg border">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">GI</p>
                            <p className="text-xl font-bold text-green-600 underline decoration-dotted">Low</p>
                          </div>
                        </div>
                     </div>
                   </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
