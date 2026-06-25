"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { diet_type: string; life_stage: string; activity_level: string; region_zone: string; region_state: string };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepLifestyle({ data, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-xl font-medium">Lifestyle & Location</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Diet Type</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.diet_type} onChange={(e) => onChange("diet_type", e.target.value)}>
            <option value="VEG">Vegetarian</option>
            <option value="NON-VEG">Non-Vegetarian</option>
            <option value="VEGAN">Vegan</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Life Stage</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.life_stage} onChange={(e) => onChange("life_stage", e.target.value)}>
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
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.activity_level} onChange={(e) => onChange("activity_level", e.target.value)}>
            <option value="Sedentary">Sedentary</option>
            <option value="Light">Light</option>
            <option value="Moderate">Moderate</option>
            <option value="Heavy">Heavy</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Region (Zone)</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.region_zone} onChange={(e) => onChange("region_zone", e.target.value)}>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>State (Optional)</Label>
          <Input placeholder="e.g., Karnataka" value={data.region_state} onChange={(e) => onChange("region_state", e.target.value)} className="bg-card" />
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
      </div>
    </div>
  );
}
