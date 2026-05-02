"use client";

import React, { useMemo } from "react";
import {
  Target, AlertTriangle, CheckCircle, MapPin,
  FlaskConical, Pill, Activity
} from "lucide-react";

interface AnalysisSectionProps {
  profile: any;
  loadingProfile: boolean;
}

const MetricCard = React.memo(({ label, value, unit }: { label: string; value: number; unit: string }) => (
  <div className="bg-muted/40 rounded-lg p-2.5">
    <p className="text-[10px] text-muted-foreground font-medium mb-0.5">{label}</p>
    <p className="text-base font-bold">{value}<span className="text-xs ml-0.5 text-muted-foreground">{unit}</span></p>
  </div>
));

const RiskCard = React.memo(({ risk }: { risk: any }) => (
  <div className={`p-3 rounded-lg text-xs ${risk.severity === "high" ? "bg-destructive/5 border border-destructive/10" : "bg-accent/5 border border-accent/10"}`}>
    <div className="flex items-center gap-1.5 mb-0.5">
      <div className={`w-1.5 h-1.5 rounded-full ${risk.severity === "high" ? "bg-destructive" : "bg-accent"}`} />
      <p className="font-semibold">{risk.nutrient}</p>
    </div>
    <p className="text-muted-foreground">{risk.fix}</p>
  </div>
));

export function AnalysisSection({ profile, loadingProfile }: AnalysisSectionProps) {
  const metrics = useMemo(() => [
    { label: "Energy", value: profile?.icmr_match?.energy, unit: "kcal" },
    { label: "Protein", value: profile?.icmr_match?.protein_g, unit: "g" },
    { label: "Iron", value: profile?.icmr_match?.iron_mg, unit: "mg" },
    { label: "Calcium", value: profile?.icmr_match?.calcium_mg, unit: "mg" },
  ], [profile]);

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
        <Activity className="w-6 h-6 animate-spin text-primary mr-2" />
        <p className="text-sm text-muted-foreground">Loading your analysis...</p>
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
            {metrics.map((s) => <MetricCard key={s.label} {...s} />)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Source: ICMR-NIN 2024</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Body Metrics</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">BMI</p>
              <p className={`text-3xl font-bold ${profile.body_metrics?.status === "Normal" ? "text-emerald-500" : "text-amber-500"}`}>
                {profile.body_metrics?.bmi}
              </p>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">{profile.body_metrics?.status}</span>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">TDEE</p>
              <p className="text-2xl font-bold text-primary">{profile.body_metrics?.tdee}</p>
              <p className="text-[10px] text-muted-foreground">kcal/day</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-muted-foreground">Nutritional Risks</span>
          </div>
          <div className="space-y-2">
            {profile.deficiency_risks?.slice(0, 3).map((r: any, i: number) => <RiskCard key={i} risk={r} />)}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Regional Diet</span>
            {profile.regional_concern?.region && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{profile.regional_concern.region}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {profile.regional_concern?.detail || "Regional diet analysis based on your location."}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Health Notes</span>
          </div>
          {profile.disease_protocol ? (
            <div className="space-y-2 text-xs">
              <p className="font-semibold">{profile.disease_protocol.condition}</p>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">Increase</p>
                <p className="text-muted-foreground">{profile.disease_protocol.foods_increase?.split(";")[0]}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <p className="font-medium text-red-700 dark:text-red-400 mb-0.5">Reduce</p>
                <p className="text-muted-foreground">{profile.disease_protocol.foods_restrict?.split(";")[0]}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> No chronic conditions detected.</p>
              <p className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Preventive nutrition active.</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Medications</span>
          </div>
          {profile.medicine_watch?.length > 0 ? (
            <div className="space-y-2">
              {profile.medicine_watch.slice(0, 2).map((m: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                  <p className="font-semibold text-primary mb-0.5">{m.medication}</p>
                  <p className="text-muted-foreground">{m.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-4 opacity-50">
              <CheckCircle className="w-6 h-6 mb-1.5 text-emerald-500" />
              <p className="text-xs font-medium">No drug-nutrient interactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
