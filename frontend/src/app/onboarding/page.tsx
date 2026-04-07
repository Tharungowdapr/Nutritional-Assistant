"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, Activity, Heart, Utensils, 
  ChevronRight, ChevronLeft, Check, Sparkles 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

const STEPS = [
  { id: "basics", title: "Basics", icon: User },
  { id: "clinical", title: "Clinical", icon: Heart },
  { id: "lifestyle", title: "Lifestyle", icon: Activity },
  { id: "diet", title: "Diet", icon: Utensils },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    age: 30,
    gender: "MALE",
    weight: 70,
    height: 170,
    profession: "Sedentary",
    region: "South",
    diet_type: "VEG",
    conditions: [] as string[],
    glp1_user: false,
    glp1_med: "None",
    glp1_phase: "None",
  })

  const nextStep = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  const handleComplete = async () => {
    toast.success("Profile Analyzed!", {
      description: "AI is computing your ICMR-NIN nutrient targets...",
    })
    // Simulate save/compute
    setTimeout(() => {
      router.push("/")
    }, 1500)
  }

  const currentStepId = STEPS[step].id

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass-card overflow-hidden border-primary/20">
        <div className="h-2 bg-muted overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <CardContent className="p-8 md:p-12">
          {/* Progress Header */}
          <div className="flex justify-between mb-12">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${idx <= step ? "bg-primary text-white" : "bg-muted text-muted-foreground"}
                  ${idx === step ? "ring-4 ring-primary/20 scale-110" : ""}
                `}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${idx <= step ? "text-primary" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepId}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* STEP 1: BASICS */}
              {currentStepId === "basics" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Let's get to know you</h2>
                    <p className="text-muted-foreground">We need these details to compute your base metabolic rate.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Tharun Gowda" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender / Life Stage</Label>
                      <Select 
                        value={formData.gender} 
                        onValueChange={(v) => setFormData({...formData, gender: v})}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          <SelectItem value="MALE">Adult Male</SelectItem>
                          <SelectItem value="FEMALE">Adult Female</SelectItem>
                          <SelectItem value="PREGNANT">Pregnant Woman</SelectItem>
                          <SelectItem value="LACTATING">Lactating Mother</SelectItem>
                          <SelectItem value="CHILD">Child / Adolescent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-6 pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <Label>Age: {formData.age} yrs</Label>
                      </div>
                      <Slider 
                        value={[formData.age]} 
                        max={100} min={10} step={1}
                        onValueChange={([v]) => setFormData({...formData, age: v})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input 
                          type="number" 
                          value={formData.weight}
                          onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})}
                          className="glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (cm)</Label>
                        <Input 
                          type="number" 
                          value={formData.height}
                          onChange={(e) => setFormData({...formData, height: Number(e.target.value)})}
                          className="glass"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: CLINICAL */}
              {currentStepId === "clinical" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Clinical Profile</h2>
                    <p className="text-muted-foreground">Personalizing targets for medical conditions and medications.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-lg">Are you currently on GLP-1 medications?</Label>
                    <div className="flex items-center space-x-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <Switch 
                        checked={formData.glp1_user}
                        onCheckedChange={(v) => setFormData({...formData, glp1_user: v})}
                      />
                      <Label>Yes, I am on GLP-1 (Ozempic, Wegovy, etc.)</Label>
                    </div>
                  </div>

                  {formData.glp1_user && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="grid grid-cols-2 gap-4 pt-2"
                    >
                      <div className="space-y-2">
                        <Label>Medication</Label>
                        <Select 
                          value={formData.glp1_med} 
                          onValueChange={(v) => setFormData({...formData, glp1_med: v})}
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Semaglutide">Semaglutide</SelectItem>
                            <SelectItem value="Tirzepatide">Tirzepatide</SelectItem>
                            <SelectItem value="Liraglutide">Liraglutide</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Treatment Phase</Label>
                        <Select 
                          value={formData.glp1_phase} 
                          onValueChange={(v) => setFormData({...formData, glp1_phase: v})}
                        >
                          <SelectTrigger className="glass">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Titration">Titration (Initial)</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-4 pt-4">
                    <Label>Common Conditions (Select all that apply)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {["Diabetes", "Hypertension", "PCOS", "Thyroid", "Cholesterol", "Anemia"].map((c) => (
                        <div 
                          key={c}
                          onClick={() => {
                            const active = formData.conditions.includes(c)
                            setFormData({
                              ...formData,
                              conditions: active 
                                ? formData.conditions.filter(x => x !== c)
                                : [...formData.conditions, c]
                            })
                          }}
                          className={`
                            p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between
                            ${formData.conditions.includes(c) 
                              ? "border-primary bg-primary/10 text-primary shadow-sm" 
                              : "border-border glass hover:border-primary/50"}
                          `}
                        >
                          <span className="text-sm font-medium">{c}</span>
                          {formData.conditions.includes(c) && <Check className="w-4 h-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: LIFESTYLE */}
              {currentStepId === "lifestyle" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Lifestyle & Work</h2>
                    <p className="text-muted-foreground">Activity levels drastically change your energy requirements.</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Occupation / Activity Level</Label>
                    <RadioGroup 
                      value={formData.profession} 
                      onValueChange={(v) => setFormData({...formData, profession: v})}
                      className="grid gap-4 pt-2"
                    >
                      {[
                        { id: "Sedentary", title: "Sedentary", desc: "Office work, minimal exercise" },
                        { id: "Moderate", title: "Moderate", desc: "Teaching, retail, regular exercise" },
                        { id: "Heavy", title: "Heavy Work", desc: "Construction, athletes, laborers" },
                      ].map((p) => (
                        <Label
                          key={p.id}
                          htmlFor={p.id}
                          className={`
                            flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all
                            ${formData.profession === p.id ? "border-primary bg-primary/10 shadow-sm" : "border-border glass hover:shadow-md hover:border-primary/50"}
                          `}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-base">{p.title}</span>
                            <span className="text-xs text-muted-foreground font-normal">{p.desc}</span>
                          </div>
                          <RadioGroupItem value={p.id} id={p.id} className="sr-only" />
                          {formData.profession === p.id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* STEP 4: DIET */}
              {currentStepId === "diet" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Food Culture</h2>
                    <p className="text-muted-foreground">Localization helps NutriSync suggest familiar ingredients.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label>Diet Type</Label>
                      <RadioGroup 
                        value={formData.diet_type} 
                        onValueChange={(v) => setFormData({...formData, diet_type: v})}
                        className="flex flex-col gap-3"
                      >
                         {["VEG", "NON-VEG", "VEGAN", "JAIN"].map((d) => (
                           <div key={d} className="flex items-center space-x-3">
                             <RadioGroupItem value={d} id={d} />
                             <Label htmlFor={d}>{d}</Label>
                           </div>
                         ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-4">
                      <Label>Regional Zone</Label>
                      <Select 
                        value={formData.region} 
                        onValueChange={(v) => setFormData({...formData, region: v})}
                      >
                        <SelectTrigger className="glass">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="South">South (Idli, Dosa, Ragi)</SelectItem>
                          <SelectItem value="North">North (Roti, Dal, Paneer)</SelectItem>
                          <SelectItem value="West">West (Poha, Misal, Jowar)</SelectItem>
                          <SelectItem value="East">East (Rice, Paturi, Maach)</SelectItem>
                          <SelectItem value="Central">Central (Daliya, Poha)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4 pt-6">
                    <div className="flex gap-3 text-primary">
                      <Sparkles className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium leading-relaxed">
                        NutriSync will use **IFCT 2017** data to match {formData.region} Indian staples to your {formData.conditions.length > 0 ? "clinical" : "nutritional"} targets.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-8 border-t">
            <Button 
              variant="ghost" 
              onClick={prevStep}
              disabled={step === 0}
              className="px-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            {step === STEPS.length - 1 ? (
              <Button 
                onClick={handleComplete}
                className="bg-primary hover:bg-primary/90 text-white px-8 shadow-lg shadow-primary/30"
              >
                Complete Analysis
                <Check className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={nextStep}
                className="bg-primary hover:bg-primary/90 text-white px-8 shadow-lg shadow-primary/30"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
