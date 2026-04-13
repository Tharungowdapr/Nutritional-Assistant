"use client";

import { useState, useEffect } from "react";
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
  "Athlete", "Office Worker", "Manual Laborer"
];

const PROFESSIONS = [
  "Student", "Office Worker", "Manual Laborer", "Healthcare", "Agriculture", "Retired"
];

const CONDITIONS = [
  "T2DM (Diabetes)", "PCOS", "Hypertension", "Hyperthyroid", "Hypothyroid",
  "Fatty Liver", "CKD Stage 1-2", "IBS", "Anemia", "Obesity", "Underweight", "GERD"
];

const REGIONS = {
  "North": ["Delhi", "Punjab", "Haryana", "Himachal Pradesh", "Jammu & Kashmir"],
  "South": ["Tamil Nadu", "Karnataka", "Telangana", "Andhra Pradesh", "Kerala"],
  "East": ["West Bengal", "Bihar", "Assam", "Odisha", "Jharkhand"],
  "West": ["Gujarat", "Maharashtra", "Goa", "Rajasthan"],
  "Central": ["Madhya Pradesh", "Chhattisgarh", "Uttar Pradesh"]
};

export default function RebuiltProfilePage() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        ...user.profile
      });
    }
  }, [user]);

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
    } catch (e: any) {
      toast.error(e.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div className="p-8">Please log in to view your profile.</div>;
  }

  const bmi = formData.height_cm && formData.weight_kg 
    ? formData.weight_kg / ((formData.height_cm / 100) ** 2) 
    : null;

  const getBMIDisplay = () => {
    if (!bmi) return null;
    if (bmi < 18.5) return { category: "Underweight", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (bmi < 25) return { category: "Normal", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    if (bmi < 30) return { category: "Overweight", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    return { category: "Obese", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  };

  const bmiDisplay = getBMIDisplay();

  return (
    <SettingsLayout
      title="Profile"
      description="Personal info and options to manage your health data."
      sidebarItems={SIDEBAR_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingsCard title="Health Snapshot" description="Quick look at your primary metrics.">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current BMI</p>
                  <p className="text-2xl font-bold">{bmi ? bmi.toFixed(1) : "—"}</p>
                </div>
                {bmiDisplay && (
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold",
                    bmiDisplay.color
                  )}>
                    {bmiDisplay.category}
                  </span>
                )}
              </div>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-sm font-medium text-primary mb-1">Health Goal</p>
                <p className="text-sm text-muted-foreground">{formData.goals || "Set your goals in the Wellness tab"}</p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Profile Completeness" description="Keep your data up to date for better AI plans.">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-muted/30 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-primary stroke-current" strokeWidth="8" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * 0.75)} strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">75%</div>
              </div>
              <div>
                <p className="text-sm font-medium">Almost there!</p>
                <p className="text-xs text-muted-foreground mt-1">Complete your Lifestyle and Wellness tabs to reach 100%.</p>
              </div>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* PERSONAL INFO */}
      {activeTab === "personal" && (
        <SettingsCard title="Basic Information" description="Standard identifier fields.">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Display Name</label>
                <Input value={formData.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email Address</label>
                <Input value={user.email} disabled className="bg-muted text-muted-foreground" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Age</label>
                <Input type="number" value={formData.age || ""} onChange={(e) => handleChange("age", Number(e.target.value))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Sex</label>
                <div className="flex gap-2">
                  {["Male", "Female", "Other"].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleChange("sex", s)}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                        formData.sex === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SettingsCard>
      )}

      {/* HEALTH PROFILE */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <SettingsCard title="Physical Metrics" description="Vital stats for nutritional calculation.">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Height (cm)</label>
                <Input type="number" value={formData.height_cm || ""} onChange={(e) => handleChange("height_cm", Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Weight (kg)</label>
                <Input type="number" value={formData.weight_kg || ""} onChange={(e) => handleChange("weight_kg", Number(e.target.value))} />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Geography & Life Stage" description="Helps in regional recommendation and RDA targets.">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Life Stage</label>
                <select
                  value={formData.life_stage || ""}
                  onChange={(e) => handleChange("life_stage", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background"
                >
                  <option value="">Select Stage</option>
                  {LIFE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Region</label>
                  <select
                    value={formData.region || ""}
                    onChange={(e) => handleChange("region", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background"
                  >
                    <option value="">Select Region</option>
                    {Object.keys(REGIONS).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">State</label>
                  <select
                    value={formData.region_state || ""}
                    onChange={(e) => handleChange("region_state", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background"
                    disabled={!formData.region}
                  >
                    <option value="">Select State</option>
                    {formData.region && REGIONS[formData.region as keyof typeof REGIONS]?.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>
      )}

      {/* CLINICAL DATA */}
      {activeTab === "clinical" && (
        <div className="space-y-6">
          <SettingsCard title="Medical Conditions" description="Critical for safe meal planning.">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left flex items-center justify-between group",
                    (formData.conditions || []).includes(c) 
                      ? "bg-primary/10 border-primary text-primary" 
                      : "bg-card border-border hover:border-primary/50 text-foreground"
                  )}
                >
                  {c}
                  <div className={cn(
                    "w-4 h-4 rounded-full border border-current flex items-center justify-center",
                    (formData.conditions || []).includes(c) ? "bg-primary" : "bg-transparent"
                  )}>
                    {(formData.conditions || []).includes(c) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Restrictions & Allergies" description="Foods to avoid at all costs.">
            <Input 
              value={formData.allergies || ""} 
              onChange={(e) => handleChange("allergies", e.target.value)}
              placeholder="e.g. Peanuts, Lactose, Shellfish"
              className="h-12"
            />
          </SettingsCard>
        </div>
      )}

      {/* LIFESTYLE */}
      {activeTab === "lifestyle" && (
        <SettingsCard title="Daily Lifestyle" description="Activity levels and diet preferences.">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Profession</label>
                <select
                  value={formData.profession || ""}
                  onChange={(e) => handleChange("profession", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background"
                >
                  <option value="">Select Profession</option>
                  {PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Diet Preference</label>
                <select
                  value={formData.diet_pref || ""}
                  onChange={(e) => handleChange("diet_pref", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background"
                >
                  <option value="">Select</option>
                  {["Vegetarian", "Non-Vegetarian", "Vegan", "Jain"].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-3 block text-foreground flex items-center gap-2">
                Exercise Frequency <span className="text-xs text-muted-foreground">(days/week)</span>
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                  <button
                    key={num}
                    onClick={() => handleChange("exercise_frequency", num)}
                    className={cn(
                      "w-10 h-10 rounded-full border text-sm font-bold transition-all",
                      formData.exercise_frequency === num 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-card border-border hover:border-primary/50"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsCard>
      )}

      {/* WELLNESS */}
      {activeTab === "wellness" && (
        <div className="space-y-6">
          <SettingsCard title="Wellness Markers" description="Subjective health metrics (1-10).">
            <div className="space-y-8 py-4">
              {[
                { key: "energy_level", label: "Energy Level", icon: Zap },
                { key: "focus_level", label: "Focus/Clarity", icon: User },
                { key: "sleep_quality", label: "Sleep Quality", icon: Heart },
              ].map(item => (
                <div key={item.key}>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-primary" />
                      {item.label}
                    </label>
                    <span className="text-sm font-bold text-primary">{formData[item.key] || 5}/10</span>
                  </div>
                  <Input
                    type="range"
                    min="1"
                    max="10"
                    value={formData[item.key] || "5"}
                    onChange={(e) => handleChange(item.key, Number(e.target.value))}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </SettingsCard>

          <SettingsCard title="Health Goals & Notes" description="What do you want to achieve?">
            <textarea
              value={formData.goals || ""}
              onChange={(e) => handleChange("goals", e.target.value)}
              className="w-full h-32 p-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="e.g., Weight loss, Muscle gain, Improve energy..."
            />
          </SettingsCard>
        </div>
      )}

      <div className="pt-8 border-t border-border flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="px-10 h-12 text-base rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          Save Profile Changes
        </Button>
      </div>
    </SettingsLayout>
  );
}
