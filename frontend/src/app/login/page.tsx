"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-chart-4/5 rounded-full blur-[120px] animate-pulse" />
      
      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md fade-in">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground mt-3 text-lg">
              Sign in to your premium health companion.
            </p>
          </div>
  
          <Card className="glass-card p-8 border-border/50 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-all rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                  <Link href="/forgot-password" title="Forgot Password" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:opacity-70 transition-opacity">
                    Forgot Account?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-muted/30 border-border/50 focus:bg-background transition-all rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Into My Account"}
              </Button>
            </form>
  
            <div className="mt-8 text-center pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">New to NutriSync?</p>
              <Link href="/signup">
                <Button variant="outline" className="w-full h-11 rounded-xl border-border/50 hover:bg-muted font-bold transition-all">
                  Create Premium Account
                </Button>
              </Link>
            </div>
          </Card>
          
          <p className="mt-8 text-center text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
            IFCT 7000+ &bull; AI Powered &bull; Regional Precision
          </p>
        </div>
      </div>
    </div>
  );
}
