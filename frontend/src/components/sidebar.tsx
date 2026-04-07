"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, MessageSquare, CalendarDays, CookingPot,
  UserCircle, LogOut, Menu, X, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "RAG Chat", icon: MessageSquare },
  { href: "/meal-plan", label: "Meal Planner", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: CookingPot },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight leading-none">NutriSync</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">by AaharAI</p>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full justify-start text-muted-foreground hover:text-destructive gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        ) : (
          <Link href="/login" onClick={onNavigate}>
            <Button variant="outline" size="sm" className="w-full">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] border-r border-border bg-card/50 backdrop-blur-sm flex-col z-40">
        <NavContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0">
            <NavContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 ml-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">NutriSync</span>
        </div>
      </div>
    </>
  );
}
