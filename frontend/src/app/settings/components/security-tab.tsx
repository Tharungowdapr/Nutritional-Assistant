"use client";

import { useState } from "react";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { toast } from "sonner";

export default function SecurityTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) { toast.error("Please enter your current password"); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("New passwords do not match"); return; }
    if (passwordForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setIsLoading(true);
    try {
      await authApi.changePassword({ current_password: passwordForm.currentPassword, new_password: passwordForm.newPassword });
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Current Password</label>
              <div className="relative">
                <Input type={showPwd.current ? "text" : "password"} value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="h-12 pr-12" />
                <button type="button" onClick={() => setShowPwd({ ...showPwd, current: !showPwd.current })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium mb-2 block">New Password</label>
                <div className="relative">
                  <Input type={showPwd.new ? "text" : "password"} value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="h-12 pr-12" />
                  <button type="button" onClick={() => setShowPwd({ ...showPwd, new: !showPwd.new })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Confirm Password</label>
                <div className="relative">
                  <Input type={showPwd.confirm ? "text" : "password"} value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="h-12 pr-12" />
                  <button type="button" onClick={() => setShowPwd({ ...showPwd, confirm: !showPwd.confirm })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="h-12 px-8">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
