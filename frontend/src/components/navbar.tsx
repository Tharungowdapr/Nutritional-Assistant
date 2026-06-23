"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, MessageSquare, CalendarDays, CookingPot,
  UserCircle, LogOut, Settings, Menu, X, ChevronDown,
  Database, Utensils, Leaf
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/meal-plan", label: "Meal Plan", icon: CalendarDays },
  { href: "/tracker", label: "Tracker", icon: CookingPot },
  { href: "/explore", label: "Foods", icon: Database },
  { href: "/recipes", label: "Recipes", icon: Utensils },
];

const BOTTOM_NAV_LINKS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/meal-plan", label: "Meal Plan", icon: CalendarDays },
  { href: "/tracker", label: "Tracker", icon: CookingPot },
  { href: "/explore", label: "Foods", icon: Database },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/80 backdrop-blur-xl border-b border-border/60 flex items-center px-4 md:px-8">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 mr-8 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight hidden sm:block group-hover:text-primary transition-colors">NutriSync</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {link.label}
              </Link>
          ))}
        </div>

        <div className="flex-1" />

        {/* Action Area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium hidden md:block">{user.name?.split(' ')[0]}</span>
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", profileMenuOpen && "rotate-180")} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 glass-strong rounded-xl shadow-lg overflow-hidden py-1 animate-scale-in">
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Signed in as</p>
                    <p className="text-sm font-semibold truncate mt-0.5">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-150"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <UserCircle className="w-4 h-4" /> Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all duration-150"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <div className="mx-3 my-1 border-t border-border/60" />
                  <button
                    onClick={() => { logout(); setProfileMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-all duration-150"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Sign in
              </button>
            </Link>
          )}

          <button
            className="lg:hidden p-2 text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Instagram-style) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/90 backdrop-blur-xl border-t border-border/60 safe-area-bottom">
        <div className="flex items-center justify-around py-1">
          {BOTTOM_NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className={cn("w-5 h-5", active && "fill-primary/20")} />
                <span className="text-[10px] font-medium leading-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Overlay Menu (rarely used now but kept for settings/profile) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-16 lg:hidden animate-fade-in">
          <div className="p-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}