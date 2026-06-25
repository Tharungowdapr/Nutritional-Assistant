"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  data: { conditions: string[]; glp1_medication: string; glp1_phase: string };
  onToggleCondition: (cond: string) => void;
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const CONDITIONS = ["T2DM", "Hypertension", "PCOS", "Thyroid", "CKD", "GERD", "IBS"];

export default function StepHealth({ data, onToggleCondition, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-xl font-medium">Health & Medications</h2>
      <div className="space-y-4">
        <div>
          <Label className="mb-3 block">Health Conditions (select if applicable)</Label>
          <div className="grid grid-cols-2 gap-3">
            {CONDITIONS.map((cond) => (
              <label key={cond}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${data.conditions.includes(cond) ? "bg-primary/10 border-primary" : "border-border hover:bg-muted/30"}`}
              >
                <input type="checkbox" checked={data.conditions.includes(cond)} onChange={() => onToggleCondition(cond)} className="w-4 h-4 rounded accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
                <span className="text-sm">{cond}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>GLP-1 Medication (if applicable)</Label>
          <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.glp1_medication} onChange={(e) => onChange("glp1_medication", e.target.value)}>
            <option value="">None</option>
            <option value="Semaglutide">Semaglutide</option>
            <option value="Tirzepatide">Tirzepatide</option>
            <option value="Other">Other</option>
          </select>
        </div>
        {data.glp1_medication && (
          <div className="space-y-2">
            <Label>GLP-1 Phase</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" value={data.glp1_phase} onChange={(e) => onChange("glp1_phase", e.target.value)}>
              <option value="">Select phase</option>
              <option value="Titration">Titration</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
      </div>
    </div>
  );
}
