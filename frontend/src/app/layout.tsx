import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ChatProvider } from "@/lib/chat-context";
import { Navbar } from "@/components/navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AaharAI NutriSync — AI-Powered Indian Nutrition Assistant",
  description: "Your personalized AI nutritional assistant grounded in ICMR-NIN 2024 standards and IFCT 2017 data. Track meals, get AI meal plans, and optimize your health with Indian food intelligence.",
  manifest: "/manifest.json",
  themeColor: "#00D68F",
  keywords: ["nutrition", "AI", "Indian food", "meal planner", "calorie tracker", "ICMR", "IFCT", "health"],
  openGraph: {
    title: "AaharAI NutriSync",
    description: "AI-powered Indian nutrition intelligence platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ChatProvider>
              <Navbar />
              <LeafDecoration />
              <main className="pt-14 pb-20 lg:pb-0 min-h-screen relative z-10">
                {children}
              </main>
              <Toaster position="top-right" />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function LeafDecoration() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {/* Organic gradient orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 blob opacity-[0.03] dark:opacity-[0.04]"
           style={{ background: 'radial-gradient(circle, #00D68F 0%, transparent 70%)' }} />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 blob-2 opacity-[0.02] dark:opacity-[0.03]"
           style={{ background: 'radial-gradient(circle, #7BBE8E 0%, transparent 70%)' }} />
      <div className="absolute top-1/3 left-1/4 w-64 h-64 blob opacity-[0.015] dark:opacity-[0.02]"
           style={{ background: 'radial-gradient(circle, #B8D9C5 0%, transparent 70%)' }} />

      {/* Floating leaf shapes */}
      <svg className="absolute top-[15%] right-[8%] w-12 h-16 text-primary opacity-[0.04] dark:opacity-[0.06] animate-float"
           viewBox="0 0 48 64" fill="currentColor" aria-hidden="true">
        <path d="M24 0C18 20 4 30 0 40c-2 6 0 14 6 18 8 5 20 6 30 2 8-3 14-10 12-18-2-8-14-18-18-32-1-4-4-8-6-10z" />
      </svg>
      <svg className="absolute bottom-[20%] left-[5%] w-10 h-14 text-accent opacity-[0.03] dark:opacity-[0.05] animate-float-delayed"
           viewBox="0 0 40 56" fill="currentColor" aria-hidden="true">
        <path d="M20 0c-5 18-16 26-20 35-2 5 0 12 5 16 7 4 17 5 26 2 7-3 12-9 10-16-1-7-12-16-15-28-1-4-4-7-6-9z" />
      </svg>
      <svg className="absolute top-[40%] right-[3%] w-8 h-10 text-primary opacity-[0.02] dark:opacity-[0.04] animate-float"
           style={{ animationDelay: '4s' }}
           viewBox="0 0 32 40" fill="currentColor" aria-hidden="true">
        <path d="M16 0c-4 14-12 20-15 28-2 4 0 9 4 13 5 3 14 4 21 1 6-2 9-7 8-13-1-5-9-13-12-22 0-3-3-6-6-7z" />
      </svg>
    </div>
  );
}