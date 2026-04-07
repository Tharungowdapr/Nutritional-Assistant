"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Calendar, ShoppingBasket, Calculator, 
  RefreshCw, Download, Share2, Info, 
  CheckCircle2, Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"

export default function MealPlanPage() {
  const [budget, setBudget] = useState(500)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    toast.info("Agent is planning your meals...", {
      description: "Optimizing for ₹" + budget + " daily budget + ICMR-NIN targets."
    })
    setTimeout(() => {
      setIsGenerating(false)
      toast.success("Meal Plan Ready!")
    }, 3000)
  }

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  return (
    <div className="container mx-auto p-4 md:p-10 space-y-10 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Agentic Meal Planner</h1>
          <p className="text-muted-foreground mt-2">Personalized weekly schedules with budget-aware grocery consolidation.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="glass"><Download className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="glass"><Share2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Configuration */}
      <Card className="glass-card border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Calculator className="w-20 h-20 text-primary" /></div>
        <CardHeader>
          <CardTitle>Plan Parameters</CardTitle>
          <CardDescription>Adjust your constraints for the AI agent.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex justify-between">
              <label className="text-sm font-semibold">Daily Budget (INR): ₹{budget}</label>
              <Badge variant="secondary" className="bg-primary/10 text-primary">Budget-Aware Mode</Badge>
            </div>
            <Slider 
              value={[budget]} 
              max={2000} min={100} step={50}
              onValueChange={([v]) => setBudget(v)}
            />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>₹100 (Economic)</span>
              <span className="flex-1 text-center">₹500 (Moderate)</span>
              <span>₹2000+ (Premium)</span>
            </div>
          </div>
          <div className="flex items-end">
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white h-14 text-lg shadow-xl shadow-primary/20"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <><RefreshCw className="w-5 h-5 mr-3 animate-spin"/> Thinking...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-3 font-bold"/> Generate 7-Day Plan</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-8">
          <TabsTrigger value="calendar" className="gap-2 px-8 py-3"><Calendar className="w-4 h-4" /> Weekly Calendar</TabsTrigger>
          <TabsTrigger value="grocery" className="gap-2 px-8 py-3"><ShoppingBasket className="w-4 h-4" /> Grocery List</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2 px-8 py-3"><Info className="w-4 h-4" /> Nutrients</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {days.map((day, idx) => (
              <motion.div 
                key={day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`glass-card hover:border-primary/50 cursor-pointer overflow-hidden ${idx === 0 ? "border-primary bg-primary/5" : ""}`}>
                  <div className="p-3 border-b text-center font-bold text-sm bg-muted/30">{day}</div>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Breakfast</p>
                      <p className="text-xs font-medium">Ragi Porridge + Almonds</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lunch</p>
                      <p className="text-xs font-medium">Bajra Roti + Moong Dal</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Dinner</p>
                      <p className="text-xs font-medium">Paneer Bhurji + Veggies</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="grocery">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Consolidated Grocery List</CardTitle>
                <CardDescription>Automated shopping list for 1 week based on your plan.</CardDescription>
              </div>
              <Button size="sm" className="bg-primary text-white">Order via Blinkit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Grains & Pulses
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between text-sm"><span>Ragi Flour</span> <span className="text-muted-foreground">1 kg</span></li>
                    <li className="flex justify-between text-sm"><span>Moong Dal</span> <span className="text-muted-foreground">500g</span></li>
                    <li className="flex justify-between text-sm"><span>Bajra</span> <span className="text-muted-foreground">2 kg</span></li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2 text-blue-500 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Vegetables & Dairy
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex justify-between text-sm"><span>Paneer</span> <span className="text-muted-foreground">400g</span></li>
                    <li className="flex justify-between text-sm"><span>Spinach</span> <span className="text-muted-foreground">2 Bunches</span></li>
                    <li className="flex justify-between text-sm"><span>Curd</span> <span className="text-muted-foreground">1 liter</span></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
