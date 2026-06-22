"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { getStorageKey } from "@/lib/utils";
import StepPhysiology from "./components/step-physiology";
import StepLifestyle from "./components/step-lifestyle";
import StepHealth from "./components/step-health";
import StepWellness from "./components/step-wellness";
import StepBudget from "./components/step-budget";

const STEPS = ["Physiology", "Lifestyle", "Health", "Wellness", "Budget"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState({
    age: 30, gender: "Female", weight_kg: 65, height_cm: 165,
    diet_type: "VEG", life_stage: "Adult", activity_level: "Sedentary",
    region_zone: "South", region_state: "",
    conditions: [] as string[], glp1_medication: "", glp1_phase: "",
    energy_score: 3, sleep_hours: 7, focus_score: 3,
    daily_budget_inr: 500,
  });

  useEffect(() => {
    if (!user?.id) return;
    const storageKey = getStorageKey("nutrisync_onboarding_draft", user.id);
    try {
      const draft = localStorage.getItem(storageKey);
      if (draft) setData(JSON.parse(draft));
    } catch (e) { console.error("Failed to load draft", e); }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(getStorageKey("nutrisync_onboarding_draft", user.id), JSON.stringify(data));
    }
  }, [data, user?.id]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Please login to save your profile"); router.push("/login?from=onboarding"); return; }
    setIsSaving(true);
    try {
      await updateProfile(data);
      localStorage.removeItem("nutrisync_onboarding_draft");
      toast.success("Profile setup complete!");
      router.push("/dashboard");
    } catch { toast.error("Failed to save profile"); }
    finally { setIsSaving(false); }
  };

  const onChange = (field: string, value: any) => setData(prev => ({ ...prev, [field]: value }));
  const handleToggleCondition = (condition: string) => {
    setData(prev => ({ ...prev, conditions: prev.conditions.includes(condition) ? prev.conditions.filter(c => c !== condition) : [...prev.conditions, condition] }));
  };

  const canProceed = () => {
    if (step === 1) return data.age && data.gender && data.weight_kg && data.height_cm;
    if (step === 2) return data.diet_type && data.life_stage && data.activity_level && data.region_zone;
    if (step === 4) return data.energy_score && data.sleep_hours && data.focus_score;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Welcome to NutriSync</h1>
          <p className="text-muted-foreground text-sm mt-1">Let's set up your nutrition profile</p>
        </div>

        <div className="glass-card rounded-xl p-6 md:p-8 space-y-8">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const stepNum = i + 1;
              const isCompleted = step > stepNum;
              const isCurrent = step === stepNum;
              return (
                <div key={i} className="flex items-center gap-1.5 flex-1">
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                  <div className={`text-[10px] font-medium transition-colors ${isCurrent || isCompleted ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > stepNum ? "bg-primary" : "bg-muted"}`} />}
                </div>
              );
            })}
          </div>

          {step === 1 && <StepPhysiology data={data} onChange={onChange} onNext={() => canProceed() && setStep(2)} />}
          {step === 2 && <StepLifestyle data={data} onChange={onChange} onNext={() => canProceed() && setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <StepHealth data={data} onToggleCondition={handleToggleCondition} onChange={onChange} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
          {step === 4 && <StepWellness data={data} onChange={onChange} onNext={() => canProceed() && setStep(5)} onBack={() => setStep(3)} />}
          {step === 5 && <StepBudget data={data} onChange={onChange} isSaving={isSaving} onSubmit={handleSubmit} onBack={() => setStep(4)} />}
        </div>
      </div>
    </div>
  );
}
