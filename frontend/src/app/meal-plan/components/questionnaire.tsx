"use client";

import { ArrowLeft, ArrowRight, Loader2, Sparkles, Target, ChefHat, Heart, MessageSquare, Clock as ClockIcon, Scale, Zap, Dumbbell, ThumbsUp, ThumbsDown, AlertTriangle, Leaf, Coffee, Wheat, Moon, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { QuestionnaireState } from "../types";

function QuestionCard({ label, icon: Icon, description, children }: { label: string; icon?: any; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </label>
      {description && <p className="text-[10px] text-muted-foreground/70">{description}</p>}
      {children}
    </div>
  );
}

interface QuestionnaireProps {
  q: QuestionnaireState;
  slide: number;
  totalSlides: number;
  generating: boolean;
  error: string | null;
  updateQ: (field: keyof QuestionnaireState, value: string | number) => void;
  setSlide: (fn: (prev: number) => number) => void;
  onGenerate: () => void;
}

export default function Questionnaire({ q, slide, totalSlides, generating, error, updateQ, setSlide, onGenerate }: QuestionnaireProps) {
  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-up">
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${((slide + 1) / totalSlides) * 100}%` }} />
      </div>
      <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Step {slide + 1} of {totalSlides}</span>
        <div className="flex gap-1">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className={cn("w-2 h-2 rounded-full transition-colors", i <= slide ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {slide === 0 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-bold">Plan Basics</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuestionCard label="Duration" icon={ClockIcon}>
                <select value={q.days} onChange={e => updateQ("days", +e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                  {[3, 5, 7, 14].map(d => <option key={d} value={d}>{d} Days</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Budget / Day" icon={Scale}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                  <input type="number" value={q.budget} onChange={e => updateQ("budget", +e.target.value)} className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
                </div>
              </QuestionCard>
              <QuestionCard label="People" icon={Heart}>
                <input type="number" min={1} max={10} value={q.people} onChange={e => updateQ("people", +e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary" />
              </QuestionCard>
              <QuestionCard label="Primary Goal" icon={Zap}>
                <select value={q.goal} onChange={e => updateQ("goal", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-primary">
                  {["Maintenance", "Weight loss", "Muscle gain", "Heart health", "Diabetes management"].map(g => <option key={g}>{g}</option>)}
                </select>
              </QuestionCard>
            </div>
            <QuestionCard label="Diet Type">
              <div className="flex gap-2 mt-2">
                {["VEG", "NON-VEG", "VEGAN"].map(d => (
                  <button key={d} onClick={() => updateQ("dietType", d)}
                    className={cn("px-4 py-2 rounded-lg text-xs font-semibold border transition-colors", q.dietType === d ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{d}</button>
                ))}
              </div>
            </QuestionCard>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuestionCard label="Weight Goal">
                <select value={q.weightGoal} onChange={e => updateQ("weightGoal", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["Maintain", "Lose weight", "Gain muscle", "Improve fitness"].map(g => <option key={g}>{g}</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Activity Level" icon={Dumbbell}>
                <select value={q.activityLevel} onChange={e => updateQ("activityLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["Sedentary", "Light", "Moderate", "Active", "Heavy"].map(a => <option key={a}>{a}</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Exercise Frequency">
                <select value={q.exerciseFreq} onChange={e => updateQ("exerciseFreq", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["None", "1-2x/week", "3-4x/week", "5+ x/week"].map(e => <option key={e}>{e}</option>)}
                </select>
              </QuestionCard>
            </div>
          </>
        )}

        {slide === 1 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <ChefHat className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-bold">Food Preferences</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuestionCard label="Favorite Foods" icon={ThumbsUp} description="Foods you love and want included">
                <Input placeholder="E.g., paneer, dal, idli, chicken biryani..." value={q.favoriteFoods} onChange={e => updateQ("favoriteFoods", e.target.value)} className="bg-background h-10" />
              </QuestionCard>
              <QuestionCard label="Disliked Foods" icon={ThumbsDown} description="Foods to avoid in your plan">
                <Input placeholder="E.g., fish, bitter gourd, eggs..." value={q.dislikedFoods} onChange={e => updateQ("dislikedFoods", e.target.value)} className="bg-background h-10" />
              </QuestionCard>
              <QuestionCard label="Food Allergies / Intolerances" icon={AlertTriangle} description="Critical — these will be excluded">
                <Input placeholder="E.g., peanuts, gluten, dairy, soy..." value={q.allergies} onChange={e => updateQ("allergies", e.target.value)} className="bg-background h-10" />
              </QuestionCard>
              <QuestionCard label="Spice Level" icon={Leaf}>
                <div className="flex gap-2 mt-2">
                  {["Mild", "Medium", "Spicy", "Extra Spicy"].map(s => (
                    <button key={s} onClick={() => updateQ("spiceLevel", s)}
                      className={cn("px-3 py-1.5 rounded text-xs font-semibold border transition-colors", q.spiceLevel === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{s}</button>
                  ))}
                </div>
              </QuestionCard>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuestionCard label="Cooking Time Per Meal" icon={ClockIcon}>
                <select value={q.cookingTime} onChange={e => updateQ("cookingTime", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["15 min", "30 min", "45 min", "1 hour+", "No cooking (ready-to-eat)"].map(t => <option key={t}>{t}</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Meals Per Day">
                <select value={q.mealFrequency} onChange={e => updateQ("mealFrequency", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["2", "3", "4", "5 (small frequent meals)"].map(f => <option key={f}>{f}</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Snack Preference">
                <select value={q.snacksPreference} onChange={e => updateQ("snacksPreference", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["Healthy (nuts, fruits)", "Traditional (samosa, pakoda)", "Protein-rich", "Light (tea, biscuits)", "None"].map(s => <option key={s}>{s}</option>)}
                </select>
              </QuestionCard>
            </div>
            <QuestionCard label="Beverage Habits" icon={Coffee}>
              <Input placeholder="E.g., tea 2x/day, black coffee, buttermilk, fresh juice..." value={q.beverages} onChange={e => updateQ("beverages", e.target.value)} className="bg-background h-10" />
            </QuestionCard>
          </>
        )}

        {slide === 2 && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-bold">Health & Lifestyle</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuestionCard label="Health Conditions" icon={Heart} description="Any diagnosed conditions">
                <Input placeholder="E.g., diabetes, PCOS, thyroid, hypertension..." value={q.healthConditions} onChange={e => updateQ("healthConditions", e.target.value)} className="bg-background h-10" />
              </QuestionCard>
              <QuestionCard label="Special Requirements" icon={Wheat} description="Fasting, religious diets, etc.">
                <Input placeholder="E.g., Jain diet, intermittent fasting..." value={q.specialRequirements} onChange={e => updateQ("specialRequirements", e.target.value)} className="bg-background h-10" />
              </QuestionCard>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuestionCard label="Sleep Hours / Night" icon={Moon}>
                <select value={q.sleepHours} onChange={e => updateQ("sleepHours", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["< 5", "5-6", "7", "8", "9+"].map(s => <option key={s}>{s} hours</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Stress Level">
                <select value={q.stressLevel} onChange={e => updateQ("stressLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["Low", "Moderate", "High", "Very High"].map(s => <option key={s}>{s}</option>)}
                </select>
              </QuestionCard>
              <QuestionCard label="Daily Water Intake" icon={Droplets}>
                <select value={q.hydrationLevel} onChange={e => updateQ("hydrationLevel", e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {["< 4 glasses", "4-6 glasses", "6-8 glasses", "8+ glasses"].map(h => <option key={h}>{h}</option>)}
                </select>
              </QuestionCard>
            </div>
            <QuestionCard label="Additional Suggestions" icon={MessageSquare}>
              <Input placeholder="Anything else we should know..." value={q.suggestions} onChange={e => updateQ("suggestions", e.target.value)} className="bg-background h-10" />
            </QuestionCard>
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={() => setSlide(s => Math.max(0, s - 1))}
            disabled={slide === 0}
            className={cn("flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors", slide === 0 ? "text-muted-foreground/30 cursor-not-allowed" : "text-primary hover:bg-primary/5")}
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button key={i} onClick={() => setSlide(() => i)} className={cn("w-2 h-2 rounded-full transition-colors", i === slide ? "bg-primary" : "bg-muted hover:bg-primary/30")} />
            ))}
          </div>
          {slide < totalSlides - 1 ? (
            <button
              onClick={() => setSlide(s => Math.min(totalSlides - 1, s + 1))}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-primary hover:bg-primary/5 transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Button onClick={onGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate {q.days}-Day Plan
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 border-t border-border bg-destructive/5 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
