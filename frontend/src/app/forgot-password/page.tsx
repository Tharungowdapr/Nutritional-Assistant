"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm fade-in">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Forgot Password?</h1>
          <p className="text-sm text-muted-foreground mt-2">
            No worries! We'll send you a link to reset your password.
          </p>
        </div>

        {!submitted ? (
          <div className="glass-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-card"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Remember your password? </span>
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 text-center space-y-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Check Your Email</h2>
            <p className="text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>. 
              The link will expire in 1 hour.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn't receive it? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => setSubmitted(false)}
            >
              Try Different Email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
