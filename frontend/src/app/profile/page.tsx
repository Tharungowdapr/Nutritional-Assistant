"use client";

import { useState, useEffect, useRef } from "react";
import { User, Activity, Heart, Briefcase, Zap, Save, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsLayout, SettingsCard } from "@/components/settings-layout";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "personal", label: "Personal Info", icon: User },
  { id: "health", label: "Health Profile", icon: Activity },
  { id: "clinical", label: "Clinical Data", icon: Heart },
  { id: "lifestyle", label: "Lifestyle", icon: Briefcase },
  { id: "wellness", label: "Wellness", icon: Zap },
];

const LIFE_STAGES = [
  "Infant", "Toddler", "Preschool", "School age", "Adolescent", "Young Adult",
  "Adult", "Middle age", "Senior", "Pregnancy 1st Trimester", "Pregnancy 2nd Trimester",
  "Pregnancy 3rd Trimester", "Lactation", "Postmenopausal Female", "Healthy Senior",
];

const PROFESSIONS = [
  "Student", "Office Worker", "Manual Laborer", "Healthcare", "Agriculture", "Retired"
];

const DIET_TYPES = ["VEG", "NON-VEG", "VEGAN"];

const CONDITIONS = [
  "T2DM (Diabetes)", "PCOS", "Hypertension", "Hyperthyroid", "Hypothyroid",
  "Fatty Liver", "CKD Stage 1-2", "IBS", "Anemia", "Obesity", "Underweight", "GERD"
];

const GLP1_MEDICATIONS = ["Semaglutide", "Tirzepatide", "Liraglutide", "Dulaglutide", "Exenatide"];

const PHYSICAL_ACTIVITY_LEVELS = [
  "Sedentary", "Light", "Moderate", "Active", "Very Active"
];

const HEALTH_GOALS = [
  "Weight Loss", "Weight Gain", "Maintain Weight", "Build Muscle", 
  "Manage Condition", "Improve Energy", "Better Sleep"
];

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize form data when user loads
  useEffect(() => {
    if (user && !isInitialized) {
      const profileData = user.profile || {};
      setFormData({
        name: user.name || "",
        age: profileData.age || "",
        sex: profileData.sex || "",
        weight_kg: profileData.weight_kg || "",
        height_cm: profileData.height_cm || "",
        life_stage: profileData.life_stage || "",
        profession: profileData.profession || "",
        diet_type: profileData.diet_type || "",
        conditions: profileData.conditions || [],
        glp1_medication: profileData.glp1_medication || "",
        glp1_phase: profileData.glp1_phase || "",
        sleep_hours: profileData.sleep_hours || "",
        daily_budget_inr: profileData.daily_budget_inr || "",
        physical_activity: profileData.physical_activity || "",
        energy_score: profileData.energy_score || "",
        focus_score: profileData.focus_score || "",
        goals: profileData.goals || "",
      });
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  // Save function - saves all form data
  const saveProfile = async (data: Record<string, any>) => {
    // Convert empty strings to null for proper backend handling
    const cleanedData: Record<string, any> = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value === "" || value === undefined) {
        cleanedData[key] = null;
      } else {
        cleanedData[key] = value;
      }
    });
    
    try {
      await updateProfile(cleanedData);
    } catch (e: any) {
      console.error("Save failed:", e);
      throw e;
    }
  };

  // Auto-save with debounce
  const handleChange = (key: string, value: any) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveProfile(newData);
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 800);
  };

  // Immediate save with loading state
  const handleSave = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    try {
      await saveProfile(formData);
      toast.success("Profile saved successfully");
    } catch (e: any) {
      console.error("Save failed:", e);
      toast.error(e.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle condition toggle (array operations)
  const handleConditionToggle = (condition: string) => {
    const currentConditions = Array.isArray(formData.conditions) ? formData.conditions : [];
    let newConditions: string[];
    if (currentConditions.includes(condition)) {
      newConditions = currentConditions.filter((c: string) => c !== condition);
    } else {
      newConditions = [...currentConditions, condition];
    }
    handleChange("conditions", newConditions);
  };

  if (!user) {
    return <div className="p-8">Please log in to view your profile.</div>;
  }

  // BMI Calculation
  const heightM = (parseFloat(formData.height_cm) || 0) / 100;
  const weight = parseFloat(formData.weight_kg) || 0;
  const bmi = heightM > 0 && weight > 0 ? weight / (heightM * heightM) : null;
  const bmiCategory = bmi ? (
    bmi < 18.5 ? "Underweight" :
    bmi < 25 ? "Normal" :
    bmi < 30 ? "Overweight" : "Obese"
  ) : null;
  const bmiColor = bmiCategory === "Normal" ? "bg-green-100 text-green-700" :
    bmiCategory === "Overweight" ? "bg-orange-100 text-orange-700" :
    bmiCategory === "Obese" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700";

  return (
    <SettingsLayout
      title="Profile"
      description="Your personal information and health data"
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* === OVERVIEW TAB === */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingsCard title="Health Snapshot" description="Your key metrics">
            <div className="space-y-4">
              {bmi && (
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">BMI</p>
                    <p className="text-2xl font-bold">{bmi.toFixed(1)}</p>
                  </div>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", bmiColor)}>
                    {bmiCategory}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Weight</p>
                  <p className="font-semibold">{formData.weight_kg || "—"} kg</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Height</p>
                  <p className="font-semibold">{formData.height_cm || "—"} cm</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-semibold">{formData.age || "—"} years</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-muted-foreground">Diet</p>
                  <p className="font-semibold">{formData.diet_type || "—"}</p>
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Profile Progress" description="Keep your data up to date">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${user.profile_completion || 0}%` }} />
                </div>
                <span className="text-lg font-bold">{user.profile_completion || 0}%</span>
              </div>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* === PERSONAL TAB === */}
      {activeTab === "personal" && (
        <SettingsCard title="Personal Information" description="Your basic details">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <Input value={formData.name || ""} onChange={(e) => handleChange("name", e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Age (years)</label>
              <Input type="number" value={formData.age || ""} onChange={(e) => handleChange("age", e.target.value ? parseInt(e.target.value) : null)} placeholder="25" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sex</label>
              <select value={formData.sex || ""} onChange={(e) => handleChange("sex", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </SettingsCard>
      )}

      {/* === HEALTH TAB === */}
      {activeTab === "health" && (
        <SettingsCard title="Body Metrics" description="Your physical measurements">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Weight (kg)</label>
                <Input type="number" value={formData.weight_kg || ""} onChange={(e) => handleChange("weight_kg", e.target.value ? parseFloat(e.target.value) : null)} placeholder="70" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Height (cm)</label>
                <Input type="number" value={formData.height_cm || ""} onChange={(e) => handleChange("height_cm", e.target.value ? parseFloat(e.target.value) : null)} placeholder="170" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Life Stage</label>
              <select value={formData.life_stage || ""} onChange={(e) => handleChange("life_stage", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select life stage</option>
                {LIFE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Diet Type</label>
              <select value={formData.diet_type || ""} onChange={(e) => handleChange("diet_type", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select diet type</option>
                {DIET_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Profession</label>
              <select value={formData.profession || ""} onChange={(e) => handleChange("profession", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select profession</option>
                {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </SettingsCard>
      )}

      {/* === CLINICAL TAB === */}
      {activeTab === "clinical" && (
        <div className="space-y-6">
          <SettingsCard title="Health Conditions" description="Select from dropdown">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Conditions (hold Ctrl/Cmd to select multiple)</label>
                <select 
                  multiple
                  value={formData.conditions || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, o => o.value);
                    handleChange("conditions", selected);
                  }}
                  className="w-full h-32 px-3 rounded-lg border border-input bg-background"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Selected Conditions" description="Your active conditions">
            <div className="min-h-[60px]">
              {Array.isArray(formData.conditions) && formData.conditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.conditions.map((condition: string) => (
                    <span key={condition} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                      {condition}
                      <button onClick={() => handleConditionToggle(condition)} className="hover:text-primary/70 font-bold">×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No conditions selected</p>
              )}
            </div>
          </SettingsCard>

          <SettingsCard title="GLP-1 Medication" description="If using GLP-1 medications">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Medication</label>
                <select value={formData.glp1_medication || ""} onChange={(e) => handleChange("glp1_medication", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="">Select medication</option>
                  {GLP1_MEDICATIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {formData.glp1_medication && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Phase</label>
                  <select value={formData.glp1_phase || ""} onChange={(e) => handleChange("glp1_phase", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                    <option value="">Select phase</option>
                    <option value="Initiation">Initiation</option>
                    <option value="Escalation">Escalation</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Tapering">Tapering</option>
                  </select>
                </div>
              )}
            </div>
          </SettingsCard>
        </div>
      )}

      {/* === LIFESTYLE TAB === */}
      {activeTab === "lifestyle" && (
        <SettingsCard title="Lifestyle" description="Your daily habits">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sleep Hours</label>
                <Input type="number" step="0.5" value={formData.sleep_hours || ""} onChange={(e) => handleChange("sleep_hours", e.target.value ? parseFloat(e.target.value) : null)} placeholder="7.5" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Daily Budget (₹)</label>
                <Input type="number" value={formData.daily_budget_inr || ""} onChange={(e) => handleChange("daily_budget_inr", e.target.value ? parseFloat(e.target.value) : null)} placeholder="500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Physical Activity Level</label>
              <select value={formData.physical_activity || ""} onChange={(e) => handleChange("physical_activity", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                <option value="">Select activity level</option>
                {PHYSICAL_ACTIVITY_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </SettingsCard>
      )}

      {/* === WELLNESS TAB === */}
      {activeTab === "wellness" && (
        <div className="space-y-6">
          <SettingsCard title="Energy & Focus" description="Your daily energy levels">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Energy Score (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleChange("energy_score", score)}
                      className={cn("flex-1 py-3 rounded-lg border text-sm font-medium", formData.energy_score === score ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary")}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Focus Score (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleChange("focus_score", score)}
                      className={cn("flex-1 py-3 rounded-lg border text-sm font-medium", formData.focus_score === score ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary")}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Health Goals" description="Your wellness objectives">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Primary Goal</label>
                <select value={formData.goals || ""} onChange={(e) => handleChange("goals", e.target.value || null)} className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                  <option value="">Select your main goal</option>
                  {HEALTH_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Current Status" description="Your wellness at a glance">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Sleep</p>
                <p className="text-2xl font-bold">{formData.sleep_hours || "—"}<span className="text-sm font-normal">hrs</span></p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Energy</p>
                <p className="text-2xl font-bold">{formData.energy_score || "—"}/5</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Focus</p>
                <p className="text-2xl font-bold">{formData.focus_score || "—"}/5</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Budget</p>
                <p className="text-2xl font-bold">₹{formData.daily_budget_inr || "—"}</p>
              </div>
            </div>
            {formData.goals && (
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10 text-center">
                <p className="text-sm text-muted-foreground">Primary Goal</p>
                <p className="text-lg font-semibold text-primary">{formData.goals}</p>
              </div>
            )}
          </SettingsCard>
        </div>
      )}
    </SettingsLayout>
  );
}