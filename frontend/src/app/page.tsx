"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Target, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { healthApi } from "@/lib/api";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    healthApi.check().then(setStats).catch(console.error);
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center p-8 min-h-screen"><div className="shimmer w-32 h-8 rounded"></div></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-20 fade-in">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome to NutriSync"}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your AI-powered Indian nutritional assistant, grounded in IFCT 2017 data and ICMR-NIN 2024 guidelines.
        </p>
      </header>

      {/* Stats row - Minimal Luxury Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Food Database", value: stats?.db_stats?.foods || "-", total: "86 IFCT Items" },
          { label: "RDA Profiles", value: stats?.db_stats?.rda_profiles || "-", total: "Active" },
          { label: "Knowledge Chunks", value: "2,968", total: "ChromaDB" },
          { label: "AI Backend", value: "Ready", total: "Gemma4:e2b" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</h3>
            <p className="text-2xl font-semibold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.total}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="glass-card p-6 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3 text-primary">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-medium text-foreground">Your Profile</h2>
            </div>
            <Link href={user ? "/profile" : "/onboarding"}>
              <Button variant="outline" size="sm">
                {user ? "Edit Profile" : "Get Started"}
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {user ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Diet Type</p>
                  <p className="font-medium">{user.profile.diet_type || "Not set"}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">Life Stage</p>
                  <p className="font-medium">{user.profile.life_stage || "Not set"}</p>
                </div>
                <div className="bg-muted/40 p-4 rounded-xl col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Health Conditions</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.profile.conditions?.length ? (
                      user.profile.conditions.map((c: string) => (
                        <span key={c} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-foreground/60">None specified</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-xl p-6 text-center border border-primary/10">
                <p className="text-muted-foreground mb-4">Complete your nutritional profile to get personalized targets and meal plans.</p>
                <Link href="/onboarding">
                  <Button>Start Onboarding <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6">
          <Link href="/chat">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Knowledge Chat</h3>
                  <p className="text-sm text-muted-foreground">Ask questions backed by IFCT & ICMR</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link href="/meal-plan">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Meal Planner</h3>
                  <p className="text-sm text-muted-foreground">Generate hyper-personalized meal plans</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
          
          <Link href="/recipes">
            <div className="glass-card p-6 flex items-center justify-between group cursor-pointer hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary rounded-xl text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-medium text-lg">Recipe Crafter</h3>
                  <p className="text-sm text-muted-foreground">Turn ingredients into healthy meals</p>
                </div>
              </div>
              <ArrowRight className="text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
