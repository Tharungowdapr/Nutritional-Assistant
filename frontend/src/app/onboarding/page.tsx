"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const STEPS = ["Physiology", "Lifestyle", "Health", "Wellness", "Budget"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({
    // Step 1: Physiology
    age: 30,
    sex: "Female",
    weight_kg: 65,
    height_cm: 165,

    // Step 2: Lifestyle
    diet_type: "VEG",
    life_stage: "Adult",
    profession: "Sedentary",
    region_zone: "South",
    region_state: "",

    // Step 3: Health
    conditions: [] as string[],
    glp1_medication: "",
    glp1_phase: "",

    // Step 4: Wellness
    energy_score: 3,
    sleep_hours: 7,
    focus_score: 3,

    // Step 5: Budget
    daily_budget_inr: 500,
  });

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem("nutrisync_onboarding_draft");
    if (draft) {
      try {
        setData(JSON.parse(draft));
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, []);

  // Save draft to localStorage on every change
  useEffect(() => {
    localStorage.setItem("nutrisync_onboarding_draft", JSON.stringify(data));
  }, [data]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to save your profile");
      router.push("/login?from=onboarding");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(data);
      localStorage.removeItem("nutrisync_onboarding_draft");
      toast.success("Profile setup complete!");
      router.push("/");
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCondition = (condition: string) => {
    setData({
      ...data,
      conditions: data.conditions.includes(condition)
        ? data.conditions.filter(c => c !== condition)
        : [...data.conditions, condition]
    });
  };

  const canProceed = () => {
    if (step === 1) return data.age && data.sex && data.weight_kg && data.height_cm;
    if (step === 2) return data.diet_type && data.life_stage && data.profession && data.region_zone;
    if (step === 3) return true;
    if (step === 4) return data.energy_score && data.sleep_hours && data.focus_score;
    if (step === 5) return data.daily_budget_inr;
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Welcome to NutriSync</h1>
          <p className="text-muted-foreground text-sm mt-1">Let's set up your nutrition profile</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-8">
          {/* Step Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;

              return (
                <div key={i} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                  <div
                    className={`text-[10px] font-medium transition-colors ${
                      isCurrent || isCompleted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 ${step > stepNum ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Physiology */}
          {step === 1 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Basic Physiology</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age (years)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={data.age}
                    onChange={(e) => setData({ ...data, age: Number(e.target.value) })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sex</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.sex}
                    onChange={(e) => setData({ ...data, sex: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={data.weight_kg}
                    onChange={(e) => setData({ ...data, weight_kg: Number(e.target.value) })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    min={50}
                    max={250}
                    value={data.height_cm}
                    onChange={(e) => setData({ ...data, height_cm: Number(e.target.value) })}
                    className="bg-card"
                  />
                </div>
              </div>
              <Button onClick={() => setStep(2)} disabled={!canProceed()} className="w-full" size="lg">
                Continue <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Lifestyle */}
          {step === 2 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Lifestyle & Location</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Diet Type</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.diet_type}
                    onChange={(e) => setData({ ...data, diet_type: e.target.value })}
                  >
                    <option value="VEG">Vegetarian</option>
                    <option value="NON-VEG">Non-Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Life Stage</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.life_stage}
                    onChange={(e) => setData({ ...data, life_stage: e.target.value })}
                  >
                    <option value="Child">Child</option>
                    <option value="Teen">Teen</option>
                    <option value="Adult">Adult</option>
                    <option value="Elderly">Elderly</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Lactating">Lactating</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.profession}
                    onChange={(e) => setData({ ...data, profession: e.target.value })}
                  >
                    <option value="Sedentary">Sedentary</option>
                    <option value="Light">Light</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Heavy">Heavy</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Region (Zone)</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.region_zone}
                    onChange={(e) => setData({ ...data, region_zone: e.target.value })}
                  >
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>State (Optional)</Label>
                  <Input
                    placeholder="e.g., Karnataka"
                    value={data.region_state}
                    onChange={(e) => setData({ ...data, region_state: e.target.value })}
                    className="bg-card"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canProceed()} className="flex-1">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Health Conditions */}
          {step === 3 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Health & Medications</h2>
              <div className="space-y-4">
                <div>
                  <Label className="mb-3 block">Health Conditions (select if applicable)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {["T2DM", "Hypertension", "PCOS", "Thyroid", "CKD", "GERD", "IBS"].map((cond) => (
                      <label
                        key={cond}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                          data.conditions.includes(cond)
                            ? "bg-primary/10 border-primary"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={data.conditions.includes(cond)}
                          onChange={() => handleToggleCondition(cond)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm">{cond}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>GLP-1 Medication (if applicable)</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-card"
                    value={data.glp1_medication}
                    onChange={(e) => setData({ ...data, glp1_medication: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="Semaglutide">Semaglutide</option>
                    <option value="Tirzepatide">Tirzepatide</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {data.glp1_medication && (
                  <div className="space-y-2">
                    <Label>GLP-1 Phase</Label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-card"
                      value={data.glp1_phase}
                      onChange={(e) => setData({ ...data, glp1_phase: e.target.value })}
                    >
                      <option value="">Select phase</option>
                      <option value="Titration">Titration</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Wellness */}
          {step === 4 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Wellness Metrics</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Energy Level (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => setData({ ...data, energy_score: score })}
                        className={`flex-1 py-2 rounded-lg border transition-all ${
                          data.energy_score === score
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Average Sleep Hours</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={data.sleep_hours}
                    onChange={(e) => setData({ ...data, sleep_hours: Number(e.target.value) })}
                    className="bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Focus/Concentration (1-5)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => setData({ ...data, focus_score: score })}
                        className={`flex-1 py-2 rounded-lg border transition-all ${
                          data.focus_score === score
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(5)} disabled={!canProceed()} className="flex-1">
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Dietary Budget</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Food Budget (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={data.daily_budget_inr}
                    onChange={(e) => setData({ ...data, daily_budget_inr: Number(e.target.value) })}
                    className="bg-card"
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-muted-foreground">Helps personalize meal recommendations based on your budget</p>
                </div>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground">
                    <strong>Review Summary</strong>
                    <br />
                    Your profile is almost ready! Press "Complete Setup" below to finish.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving || !canProceed()} className="flex-1">
                  {isSaving ? "Saving..." : "Complete Setup"} <Check className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
