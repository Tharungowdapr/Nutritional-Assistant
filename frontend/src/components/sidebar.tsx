"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, CalendarDays, CookingPot,
  LogOut, Sparkles, TrendingUp, Settings, Search, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

/**
 * Single NAV array drives BOTH desktop sidebar and mobile bottom bar.
 * mobileHide: true = shown on desktop only (Explore, Settings bottom section)
 * mobileLabel: short label for the 5-item mobile bottom tab bar
 */
const NAV = [
  { href: "/",          label: "Dashboard",  mobileLabel: "Home",    icon: LayoutDashboard },
  { href: "/tracker",   label: "Tracker",    mobileLabel: "Log",     icon: TrendingUp      },
  { href: "/chat",      label: "Chat",       mobileLabel: "Chat",    icon: MessageSquare   },
  { href: "/meal-plan", label: "Meal Plan",  mobileLabel: "Plans",   icon: CalendarDays    },
  { href: "/recipes",   label: "Recipes",    mobileLabel: "Recipes", icon: CookingPot      },
  { href: "/explore",   label: "Explore",    mobileHide: true,       icon: Search          },
  { href: "/settings",  label: "Settings",   mobileHide: true,       icon: Settings        },
] as const;

const MOBILE_NAV = NAV.filter(n => !("mobileHide" in n && n.mobileHide));

function DesktopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">AaharAI</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">NutriSync</p>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.filter(n => n.href !== "/settings").map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />}
                <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-border space-y-1">
        {/* LLM provider badge */}
        {user && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 mb-2">
            <Cpu className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">
              {(user as any).llm_provider || "Groq · llama3-70b"}
            </span>
          </div>
        )}

        {/* Settings */}
        <Link href="/settings">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            pathname === "/settings" || pathname.startsWith("/settings")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}>
            <Settings className="w-[18px] h-[18px]" />
            Settings
          </div>
        </Link>

        {/* User row */}
        {user ? (
          <div className="flex items-center gap-3 px-2 pt-2 border-t border-border mt-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={logout}
              className="w-8 h-8 text-muted-foreground hover:text-destructive shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm" className="w-full mt-2">Sign in</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] border-r border-border bg-card/50 backdrop-blur-sm flex-col z-40">
        <DesktopNav />
      </aside>

      {/* Mobile bottom tab bar — 5 items, no Explore/Settings (Settings via Profile icon) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-around z-40 px-2">
        {MOBILE_NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const mobileLabel = "mobileLabel" in item ? item.mobileLabel : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1 gap-0.5"
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[10px] transition-colors ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {mobileLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
