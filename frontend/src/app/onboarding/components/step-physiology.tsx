"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { age: number; gender: string; weight_kg: number; height_cm: number };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
}

export default function StepPhysiology({ data, onChange, onNext }: Props) {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-xl font-medium">Basic Physiology</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Age (years)</Label>
          <Input type="number" min={1} max={120} value={data.age} onChange={(e) => onChange("age", Number(e.target.value))} className="bg-card" />
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.gender} onChange={(e) => onChange("gender", e.target.value)}>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input type="number" min={10} max={300} value={data.weight_kg} onChange={(e) => onChange("weight_kg", Number(e.target.value))} className="bg-card" />
        </div>
        <div className="space-y-2">
          <Label>Height (cm)</Label>
          <Input type="number" min={50} max={250} value={data.height_cm} onChange={(e) => onChange("height_cm", Number(e.target.value))} className="bg-card" />
        </div>
      </div>
      <Button onClick={onNext} className="w-full" size="lg">
        Continue <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
}
