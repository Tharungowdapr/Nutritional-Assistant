"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface SettingsLayoutProps {
  sidebarItems: {
    id: string;
    label: string;
    icon: React.ElementType;
  }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsLayout({
  sidebarItems,
  activeTab,
  onTabChange,
  title,
  description,
  children,
}: SettingsLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0F0F0F] pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden md:block w-64 shrink-0">
            <nav className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "google-sidebar-item w-full",
                      isActive && "active"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <span className="font-medium">
              {sidebarItems.find((i) => i.id === activeTab)?.label}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden space-y-1 p-2 bg-card border border-border rounded-xl mb-4">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "google-sidebar-item w-full",
                    activeTab === item.id && "active"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("settings-card", className)}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}
