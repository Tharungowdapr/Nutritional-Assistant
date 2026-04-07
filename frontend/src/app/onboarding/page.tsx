"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    age: 30, sex: "Female", weight_kg: 65, height_cm: 165,
    diet_type: "VEG", life_stage: "Adult", profession: "Sedentary",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to save your profile");
      router.push("/login");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(data);
      toast.success("Profile setup complete!");
      router.push("/");
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen luxury-bg flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-semibold">Welcome to NutriSync</h1>
          <p className="text-muted-foreground mt-2">Let's set up your clinical nutrition profile.</p>
        </div>

        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {step === 1 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Basic Physiology</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={data.age} onChange={e => setData({...data, age: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Sex</Label>
                  <select className="w-full h-10 px-3 rounded-md border bg-background" value={data.sex} onChange={e => setData({...data, sex: e.target.value})}>
                    <option>Female</option>
                    <option>Male</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input type="number" value={data.weight_kg} onChange={e => setData({...data, weight_kg: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input type="number" value={data.height_cm} onChange={e => setData({...data, height_cm: Number(e.target.value)})} />
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full mt-4" size="lg">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 fade-in">
              <h2 className="text-xl font-medium">Diet & Lifestyle</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Diet Type</Label>
                  <select className="w-full h-10 px-3 rounded-md border bg-background" value={data.diet_type} onChange={e => setData({...data, diet_type: e.target.value})}>
                    <option value="VEG">Vegetarian</option>
                    <option value="NON-VEG">Non-Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Life Stage</Label>
                  <select className="w-full h-10 px-3 rounded-md border bg-background" value={data.life_stage} onChange={e => setData({...data, life_stage: e.target.value})}>
                    <option value="Adult">Adult</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Lactating">Lactating</option>
                    <option value="Elderly">Elderly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <select className="w-full h-10 px-3 rounded-md border bg-background" value={data.profession} onChange={e => setData({...data, profession: e.target.value})}>
                    <option value="Sedentary">Sedentary</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Heavy">Heavy</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="flex-[2]">
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
