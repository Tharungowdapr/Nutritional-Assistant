"use client";

import { useState, useEffect } from "react";
import { UserCircle, Save, Loader2, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { nutritionApi } from "@/lib/api";
import { toast } from "sonner";

const CONDITIONS_LIST = [
  "T2DM (Diabetes)", "PCOS", "Hypertension", "Hyperthyroid",
  "Hypothyroid", "Fatty Liver", "CKD Stage 1-2"
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [targets, setTargets] = useState<any>(null);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        ...user.profile
      });
      loadTargets(user.profile);
    }
  }, [user]);

  const loadTargets = async (profileData: any) => {
    setIsLoadingTargets(true);
    try {
      const res = await nutritionApi.computeTargets(profileData);
      setTargets(res.targets);
    } catch (e) {
      console.error("Failed to load targets", e);
    } finally {
      setIsLoadingTargets(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const toggleCondition = (condition: string) => {
    const current = formData.conditions || [];
    if (current.includes(condition)) {
      handleChange("conditions", current.filter((c: string) => c !== condition));
    } else {
      handleChange("conditions", [...current, condition]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(formData);
      toast.success("Profile saved successfully");
      loadTargets(formData);
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div className="p-8">Please log in to view your profile.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col gap-8 fade-in pb-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <UserCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Clinical Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your physical and dietary state</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Basics */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>Full Name</Label>
                <Input value={formData.name || ""} onChange={e => handleChange("name", e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>Age</Label>
                <Input type="number" value={formData.age || ""} onChange={e => handleChange("age", parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" value={formData.weight_kg || ""} onChange={e => handleChange("weight_kg", parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Diet Type</Label>
                <select 
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                  value={formData.diet_type || ""}
                  onChange={e => handleChange("diet_type", e.target.value)}
                >
                  <option value="">Select Diet</option>
                  <option value="VEG">Vegetarian</option>
                  <option value="NON-VEG">Non-Vegetarian</option>
                  <option value="VEGAN">Vegan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clinical */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium mb-4">Health Conditions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {CONDITIONS_LIST.map(cond => (
                <div key={cond} className="flex items-center space-x-2">
                  <Switch 
                    id={`cond-${cond}`} 
                    checked={(formData.conditions || []).includes(cond)}
                    onCheckedChange={() => toggleCondition(cond)}
                  />
                  <Label htmlFor={`cond-${cond}`}>{cond}</Label>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t space-y-4">
              <div>
                <Label className="text-base text-primary font-medium">GLP-1 Medication (Optional)</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Ensure strict protein floors and calorie limits</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>Medication</Label>
                  <select 
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                    value={formData.glp1_medication || "None"}
                    onChange={e => handleChange("glp1_medication", e.target.value === "None" ? null : e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="Semaglutide">Semaglutide</option>
                    <option value="Liraglutide">Liraglutide</option>
                    <option value="Tirzepatide">Tirzepatide</option>
                  </select>
                </div>
                {formData.glp1_medication && formData.glp1_medication !== "None" && (
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label>Phase</Label>
                    <select 
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                      value={formData.glp1_phase || "Titration"}
                      onChange={e => handleChange("glp1_phase", e.target.value)}
                    >
                      <option value="Titration">Titration</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Targets Side Panel */}
        <div className="md:col-span-1">
          <div className="glass-card p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-primary">Inference Engine</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
              Live computed nutrient targets based on ICMR-NIN 2024 and your active condition modifiers.
            </p>

            {isLoadingTargets ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : targets ? (
              <div className="space-y-4">
                {[
                  { label: "Daily Calories", value: targets.energy_kcal, unit: "kcal" },
                  { label: "Optimal Protein", value: targets.protein_g, unit: "g" },
                  { label: "Fat Limit", value: targets.fat_g, unit: "g" },
                  { label: "Iron Needs", value: targets.iron_mg, unit: "mg", hilight: true },
                  { label: "Calcium", value: targets.calcium_mg, unit: "mg" },
                  { label: "Fibre Minimum", value: targets.fibre_g, unit: "g" },
                ].map((t, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-border/50 pb-2">
                    <span className="text-sm text-foreground/80">{t.label}</span>
                    <span className={`text-base font-semibold ${t.hilight ? 'text-primary' : ''}`}>
                      {t.value ? Math.round(t.value) : 0}<span className="text-xs font-normal text-muted-foreground ml-0.5">{t.unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                Save your profile to compute targets.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
