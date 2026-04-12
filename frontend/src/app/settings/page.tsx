"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Lock, Bell, Eye, EyeOff, AlertCircle, Loader2, Moon, Sun, Settings2 } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Account Tab
  const [nameForm, setNameForm] = useState(user?.name || "");

  // Preferences Tab
  const [preferences, setPreferences] = useState({
    theme: "system" as "light" | "dark" | "system",
    language: "en" as "en" | "hi",
    units: "metric" as "metric" | "imperial",
    mealPlanDays: 7,
  });

  // Notifications Tab
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    mealReminders: true,
    reminderTime: "08:00",
    weeklySummary: true,
  });

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameForm.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile({ name: nameForm });
      toast.success("Name updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsLoading(true);
    try {
      // TODO: Call authApi.changePassword when backend endpoint is ready
      toast.success("Password changed successfully (feature coming soon)");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Are you sure? This action cannot be undone. Type your email to confirm.")) {
      const confirmation = prompt(`Type "${user?.email}" to confirm account deletion:`);
      if (confirmation === user?.email) {
        // TODO: Call authApi.deleteAccount when backend endpoint is ready
        toast.error("Account deletion not yet implemented");
      } else {
        toast.error("Confirmation text did not match");
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto pb-20 fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">Manage your account, preferences, and privacy</p>
      </header>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4 gap-2">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            {/* Profile Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={nameForm}
                    onChange={(e) => setNameForm(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted/40 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support to update.</p>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </div>

            {/* Password Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Change Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      className="bg-card pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="bg-card pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="bg-card pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={preferences.theme}
                    onChange={(e) =>
                      setPreferences({ ...preferences, theme: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="units">Units</Label>
                  <select
                    id="units"
                    value={preferences.units}
                    onChange={(e) =>
                      setPreferences({ ...preferences, units: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="metric">Metric (kg, cm)</option>
                    <option value="imperial">Imperial (lbs, ft)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    value={preferences.language}
                    onChange={(e) =>
                      setPreferences({ ...preferences, language: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meal-plan-days">Default Meal Plan Days</Label>
                  <Input
                    id="meal-plan-days"
                    type="number"
                    min={1}
                    max={30}
                    value={preferences.mealPlanDays}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        mealPlanDays: parseInt(e.target.value),
                      })
                    }
                    className="bg-card"
                  />
                </div>
              </div>
              <Button type="button" disabled={isLoading}>
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notification Settings
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive important updates via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        emailNotifications: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30">
                  <div>
                    <p className="font-medium">Meal Reminders</p>
                    <p className="text-sm text-muted-foreground">Get reminded to log your meals</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.mealReminders}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        mealReminders: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                </div>

                {notifications.mealReminders && (
                  <div className="space-y-2 ml-4">
                    <Label htmlFor="reminder-time">Reminder Time</Label>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={notifications.reminderTime}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          reminderTime: e.target.value,
                        })
                      }
                      className="bg-card max-w-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30">
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-muted-foreground">Receive a weekly nutrition report</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.weeklySummary}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        weeklySummary: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded"
                  />
                </div>
              </div>

              <Button type="button" disabled={isLoading}>
                Save Notification Settings
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Data & Privacy</h3>

              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-sm text-foreground">
                  <strong>Download Your Data</strong>
                  <br />
                  Export all your personal information and chat history as a JSON file.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Download Data
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm text-foreground mb-2">
                  <strong className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Danger Zone
                  </strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
