"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Calendar, Weight, Ruler, Heart, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Personal Info
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.profile?.phone || "");
  const [location, setLocation] = useState(user?.profile?.location || "");
  const [bio, setBio] = useState(user?.profile?.bio || "");
  
  // Physical Info
  const [age, setAge] = useState(user?.profile?.age?.toString() || "");
  const [weight, setWeight] = useState(user?.profile?.weight?.toString() || "");
  const [height, setHeight] = useState(user?.profile?.height?.toString() || "");
  const [gender, setGender] = useState(user?.profile?.gender || "male");
  const [activityLevel, setActivityLevel] = useState(user?.profile?.activity_level || "moderate");
  
  // Health Info
  const [dietType, setDietType] = useState(user?.profile?.diet_type || "VEG");
  const [goal, setGoal] = useState(user?.profile?.goal || "Maintenance");
  const [allergies, setAllergies] = useState(user?.profile?.conditions?.join(", ") || "");
  const [medicalConditions, setMedicalConditions] = useState(user?.profile?.medical_conditions?.join(", ") || "");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.profile?.phone || "");
      setLocation(user.profile?.location || "");
      setBio(user.profile?.bio || "");
      setAge(user.profile?.age?.toString() || "");
      setWeight(user.profile?.weight?.toString() || "");
      setHeight(user.profile?.height?.toString() || "");
      setGender(user.profile?.gender || "male");
      setActivityLevel(user.profile?.activity_level || "moderate");
      setDietType(user.profile?.diet_type || "VEG");
      setGoal(user.profile?.goal || "Maintenance");
      setAllergies(user.profile?.conditions?.join(", ") || "");
      setMedicalConditions(user.profile?.medical_conditions?.join(", ") || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        name,
        age: age ? parseInt(age) : undefined,
        sex: gender === "male" ? "Male" : gender === "female" ? "Female" : "Other",
        weight_kg: weight ? parseFloat(weight) : undefined,
        height_cm: height ? parseFloat(height) : undefined,
        physical_activity: activityLevel,
        diet_type: dietType,
        goals: goal,
        conditions: allergies.split(",").map(s => s.trim()).filter(Boolean),
        phone,
        location,
        bio,
        activity_level: activityLevel,
        medical_conditions: medicalConditions.split(",").map(s => s.trim()).filter(Boolean),
      });
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const bmi = (weight && height) ? (parseFloat(weight) / ((parseFloat(height)/100) ** 2)).toFixed(1) : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-2">Manage your personal information and health profile</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input value={email} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Bio</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full h-24 px-3 py-2 border border-border rounded-xl bg-background text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Physical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Physical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Age</label>
              <Input value={age} onChange={e => setAge(e.target.value)} type="number" placeholder="Years" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Weight (kg)</label>
              <Input value={weight} onChange={e => setWeight(e.target.value)} type="number" placeholder="kg" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Height (cm)</label>
              <Input value={height} onChange={e => setHeight(e.target.value)} type="number" placeholder="cm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {bmi && (
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">BMI: {bmi}</span>
                <span className="text-xs text-muted-foreground">
                  {parseFloat(bmi) < 18.5 ? "Underweight" : 
                   parseFloat(bmi) < 25 ? "Normal" :
                   parseFloat(bmi) < 30 ? "Overweight" : "Obese"}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Activity Level</label>
            <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background">
              <option value="sedentary">Sedentary (little/no exercise)</option>
              <option value="light">Light (1-3 days/week)</option>
              <option value="moderate">Moderate (3-5 days/week)</option>
              <option value="active">Active (6-7 days/week)</option>
              <option value="very_active">Very Active (2x/day)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Diet & Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Diet & Health Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Diet Type</label>
              <select value={dietType} onChange={e => setDietType(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background">
                <option value="VEG">Vegetarian</option>
                <option value="NON-VEG">Non-Vegetarian</option>
                <option value="VEGAN">Vegan</option>
                <option value="PESCATARIAN">Pescatarian</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Primary Goal</label>
              <select value={goal} onChange={e => setGoal(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border bg-background">
                <option value="Maintenance">Maintain Weight</option>
                <option value="Weight Loss">Weight Loss</option>
                <option value="Muscle Gain">Muscle Gain</option>
                <option value="General Health">General Health</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Allergies & Food Intolerances</label>
            <Input 
              value={allergies} 
              onChange={e => setAllergies(e.target.value)}
              placeholder="e.g., Peanuts, Lactose, Gluten (comma-separated)"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Medical Conditions</label>
            <Input 
              value={medicalConditions} 
              onChange={e => setMedicalConditions(e.target.value)}
              placeholder="e.g., Diabetes, Hypertension (comma-separated)"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} className="px-8 h-12">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
