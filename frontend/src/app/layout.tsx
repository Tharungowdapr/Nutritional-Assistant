import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { ChatProvider } from "@/lib/chat-context";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AaharAI NutriSync — AI Nutrition Assistant",
  description: "AI-powered Indian nutritional assistant grounded in IFCT 2017 and ICMR-NIN 2024 data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans luxury-bg min-h-screen`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ChatProvider>
              <ProtectedRoute>
                <Navbar />
                <main className="pt-14 min-h-screen">
                  {children}
                </main>
              </ProtectedRoute>
              <Toaster position="top-right" />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}