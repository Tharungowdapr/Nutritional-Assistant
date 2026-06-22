"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { energy_score: number; sleep_hours: number; focus_score: number };
  onChange: (field: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepWellness({ data, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-6 fade-in">
      <h2 className="text-xl font-medium">Wellness Metrics</h2>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Energy Level (1-5)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} onClick={() => onChange("energy_score", score)}
                className={`flex-1 py-2 rounded-lg border transition-all ${data.energy_score === score ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >{score}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Average Sleep Hours</Label>
          <Input type="number" min={0} max={24} step={0.5} value={data.sleep_hours} onChange={(e) => onChange("sleep_hours", Number(e.target.value))} className="bg-card" />
        </div>
        <div className="space-y-2">
          <Label>Focus/Concentration (1-5)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((score) => (
              <button key={score} onClick={() => onChange("focus_score", score)}
                className={`flex-1 py-2 rounded-lg border transition-all ${data.focus_score === score ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >{score}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} disabled={!data.energy_score || !data.sleep_hours || !data.focus_score} className="flex-1">
          Continue <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
