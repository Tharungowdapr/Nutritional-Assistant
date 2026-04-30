"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2, BrainCircuit } from "lucide-react";
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
      toast.success("Welcome back to your concierge.");
      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#FDFCF8] font-sans">
      {/* Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px]" />
      
      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-lg fade-in">
          
          <div className="flex flex-col items-center mb-12 text-center space-y-6">
            <div className="p-5 rounded-[32px] bg-primary/5 border border-primary/10 shadow-sm">
              <BrainCircuit className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-serif luxury-text-gradient">Welcome Back</h1>
              <p className="text-muted-foreground font-medium tracking-tight">
                Re-enter your private nutritional sanctuary.
              </p>
            </div>
          </div>
  
          <Card className="bg-white border border-border/50 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Mandate</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="concierge@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 bg-muted/20 border-border/40 focus:bg-white transition-all rounded-2xl text-base font-medium px-6"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Secure Access</Label>
                  <Link href="/forgot-password" title="Forgot Password" className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-accent transition-colors">
                    Recovery?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 bg-muted/20 border-border/40 focus:bg-white transition-all rounded-2xl text-base font-medium px-6"
                />
              </div>
              <Button type="submit" className="w-full h-16 rounded-full text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Authorize Entry"}
              </Button>
            </form>
  
            <div className="mt-10 text-center pt-8 border-t border-border/40 space-y-4">
              <p className="text-xs font-medium text-muted-foreground">New to the sanctuary?</p>
              <Link href="/signup">
                <Button variant="ghost" className="w-full h-14 rounded-full border border-border/60 hover:bg-muted/30 font-black uppercase tracking-widest text-[10px] transition-all">
                  Initiate Membership
                </Button>
              </Link>
            </div>
          </Card>
          
          <p className="mt-12 text-center text-[10px] text-muted-foreground/30 font-black uppercase tracking-[0.4em]">
            AaharAI &bull; Clinical Intelligence &bull; High Fidelity
          </p>
        </div>
      </div>
    </div>
  );
}
