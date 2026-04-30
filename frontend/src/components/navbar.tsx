"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, MessageSquare, CalendarDays, CookingPot,
  UserCircle, LogOut, Settings, Sparkles, Menu, X, ChevronDown,
  Database, Utensils
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Concierge", icon: LayoutDashboard },
  { href: "/chat", label: "AI Advisor", icon: MessageSquare },
  { href: "/meal-plan", label: "Planner", icon: CalendarDays },
  { href: "/tracker", label: "Log", icon: CookingPot },
  { href: "/explore", label: "Database", icon: Database },
  { href: "/recipes", label: "Library", icon: Utensils },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-border/40 flex items-center px-6 md:px-10">
        
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 mr-12 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl tracking-tight luxury-text-gradient hidden sm:block">AaharAI</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  isActive 
                    ? "bg-primary/5 text-primary" 
                    : "text-muted-foreground/60 hover:text-primary hover:bg-primary/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Action Area */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-3 px-2 py-1.5 rounded-full border border-border/40 hover:bg-muted/30 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">{user.name?.split(' ')[0]}</span>
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", profileMenuOpen && "rotate-180")} />
              </button>
              
              {profileMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-card rounded-[24px] border border-border/50 shadow-2xl overflow-hidden py-2 fade-in">
                  <div className="px-5 py-4 border-b border-border/40 mb-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-bold truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-5 py-3 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <UserCircle className="w-4 h-4" /> Profile Protocol
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-5 py-3 text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" /> Preferences
                  </Link>
                  <div className="mx-2 my-2 border-t border-border/40" />
                  <button
                    onClick={() => { logout(); setProfileMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-5 py-3 text-xs font-bold text-red-600 hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Terminate Session
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <button className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                Member Access
              </button>
            </Link>
          )}

          <button
            className="lg:hidden p-2 text-muted-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-20 md:hidden fade-in">
          <div className="p-6 space-y-2">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}