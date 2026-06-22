"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { daily_budget_inr: number };
  onChange: (field: string, value: any) => void;
  isSaving: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

export default function StepBudget({ data, onChange, isSaving, onSubmit, onBack }: Props) {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-xl font-medium">Dietary Budget</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Daily Food Budget (₹)</Label>
          <Input type="number" min={0} step={50} value={data.daily_budget_inr}
            onChange={(e) => onChange("daily_budget_inr", Number(e.target.value))}
            className="bg-card" placeholder="e.g., 500" />
          <p className="text-xs text-muted-foreground">Helps personalize meal recommendations based on your budget</p>
        </div>
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground">
            <strong>Review Summary</strong><br />
            Your profile is almost ready! Press &quot;Complete Setup&quot; below to finish.
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onSubmit} disabled={isSaving || !data.daily_budget_inr} className="flex-1">
          {isSaving ? "Saving..." : "Complete Setup"} <Check className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
