"use client";

import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle, MapPin, Activity } from "lucide-react";

interface AnalysisSectionProps {
  profile: any;
  loadingProfile?: boolean;
}

const MetricCard = ({ label, value, unit }: { label: string; value: any; unit: string }) => (
  <div className="bg-muted/40 rounded-lg p-2.5">
    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className="text-base font-bold">{value}<span className="text-xs ml-0.5 text-muted-foreground">{unit}</span></p>
  </div>
);

export function AnalysisSection({ profile, loadingProfile }: AnalysisSectionProps) {
  const metrics = useMemo(() => [
    { label: "Energy", value: profile?.icmr_match?.energy ?? 0, unit: "kcal" },
    { label: "Protein", value: profile?.icmr_match?.protein_g ?? 0, unit: "g" },
    { label: "Iron", value: profile?.icmr_match?.iron_mg ?? 0, unit: "mg" },
    { label: "Calcium", value: profile?.icmr_match?.calcium_mg ?? 0, unit: "mg" },
  ], [ profile ]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <Activity className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading your analysis...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Your Analysis</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">ICMR Profile</span>
            {profile.icmr_match?.profile && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile.icmr_match.profile}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} unit={m.unit} />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Source: ICMR-NIN 2024</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Regional Diet</span>
            {profile.regional_concern?.region && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile.regional_concern.region}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.regional_concern?.detail ?? "Regional diet analysis based on your location."}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-muted-foreground">Nutritional Risks</span>
          </div>
          <div className="space-y-2">
            {profile.deficiency_risks?.slice(0, 3).map((r: any, idx: number) => (
              <div key={idx} className="p-2 text-xs bg-white/5 border border-border rounded">{r.nutrient}: {r.value}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
