import Link from "next/link";
import { Leaf, ArrowRight, BarChart3, MessageSquareText, UtensilsCrossed, Search, ShieldCheck, Sparkles, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "1,600+ Indian foods",
    description: "Complete IFCT 2017 database with regional Indian foods, traditional ingredients, and their full nutrient profiles.",
  },
  {
    icon: BarChart3,
    title: "ICMR-NIN 2024 targets",
    description: "Your personal Recommended Dietary Allowances computed using the latest Indian Council of Medical Research guidelines.",
  },
  {
    icon: MessageSquareText,
    title: "AI chat with RAG",
    description: "Ask any nutrition question and get answers cited from official Indian food composition tables and clinical guidelines.",
  },
  {
    icon: UtensilsCrossed,
    title: "AI meal planning",
    description: "Get 7-day meal plans tailored to your diet type, region, budget, health conditions, and taste preferences.",
  },
  {
    icon: BarChart3,
    title: "Track & analyze",
    description: "Log your daily meals and see real-time macro and micronutrient progress against your personal RDA targets.",
  },
  {
    icon: ShieldCheck,
    title: "Clinical protocols",
    description: "Specialized support for Diabetes, PCOS, GLP-1 medication, anaemia, thyroid, and other conditions.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set up your profile",
    description: "Tell us about yourself — age, diet type, region, health conditions and goals. This takes two minutes.",
  },
  {
    step: "02",
    title: "Explore or log meals",
    description: "Browse 1,600+ Indian foods, log what you eat, and watch your nutrition dashboard come to life.",
  },
  {
    step: "03",
    title: "Get AI-powered guidance",
    description: "Chat with our nutrition AI, generate weekly meal plans, and receive personalized health insights.",
  },
];

const STATS = [
  { value: "1,600+", label: "Indian foods in database", detail: "Every entry from IFCT 2017" },
  { value: "12", label: "Excel sheets parsed", detail: "Complete nutrient tables" },
  { value: "100%", label: "ICMR-NIN 2024 compliant", detail: "Latest RDA standards" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden leaf-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 pt-28 pb-24 md:pt-36 md:pb-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Built on ICMR-NIN 2024 & IFCT 2017
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
              Your AI nutritionist for
              <span className="text-primary block mt-3">Indian food & health</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
              Track what you eat, get meal plans that respect your regional palate,
              and understand your body — all grounded in India&apos;s official nutrition data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/30"
              >
                Start your journey
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border/60 glass-strong text-foreground font-medium text-base hover:bg-muted/80 transition-all"
              >
                Sign in
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required. Free for individual use.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why NutriSync?</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Most nutrition tools are built for Western diets. NutriSync is built for India.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="group glass-card rounded-xl p-6 hover-lift animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-200">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Get from zero to your first personalized meal plan in under five minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((item, i) => (
              <div key={item.step} className="text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {STATS.map((stat, i) => (
              <div key={stat.label} className="text-center p-6 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="font-semibold text-foreground">{stat.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="glass-card rounded-2xl p-8 md:p-12 text-center animate-fade-up"
             style={{ boxShadow: '0 0 40px rgba(0, 214, 143, 0.08)' }}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to take control of your nutrition?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Join NutriSync and get AI-powered nutrition guidance built for the way India eats.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/30"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold">AaharAI NutriSync</span>
            </div>
            <p className="text-xs text-muted-foreground text-center md:text-right">
              Built on IFCT 2017 & ICMR-NIN 2024 data. Not a substitute for professional medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
