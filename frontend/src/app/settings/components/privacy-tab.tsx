"use client";

import { useState } from "react";
import { ShieldCheck, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function PrivacyTab() {
  const { user, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleExportData = () => {
    const data = { user, exported_at: new Date().toISOString() };
    const jsonString = JSON.stringify(data, null, 2);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(jsonString));
    element.setAttribute("download", `nutrisync-data-${Date.now()}.json`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Data exported successfully");
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account?\n\n" +
      "This will remove all of your data including meal plans, food logs, chat history, recipes, and preferences. This action cannot be undone."
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "⚠️ FINAL WARNING: This is irreversible. All your data will be lost forever.\n\n" +
      "Click OK to proceed with permanent deletion."
    );
    if (!doubleConfirm) return;

    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
            {[
              "Health data is encrypted at rest",
              "Personal info is never sold to third parties",
              "You have full control over your food logs",
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-foreground/80">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {p}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExportData}
            className="w-full h-14 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all">
            <Download className="w-5 h-5 mr-3" />
            Download My NutriSync Data
          </Button>
        </CardContent>
      </Card>

      <div className="pt-10 flex flex-col items-center">
        <p className="text-xs text-muted-foreground mb-4 uppercase tracking-[0.2em]">Danger Zone</p>
        <Button variant="ghost"
          className="text-destructive hover:bg-destructive/5 hover:text-destructive text-xs font-bold uppercase tracking-widest px-8"
          disabled={deleting}
          onClick={handleDeleteAccount}>
          <AlertTriangle className="w-4 h-4 mr-2" />
          {deleting ? "Deleting..." : "Delete NutriSync Account"}
        </Button>
      </div>
    </div>
  );
}
