"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  User, Activity, Settings, 
  Stethoscope, ShieldCheck, Save,
  RotateCcw, ArrowLeft, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { toast } from "sonner"

export default function ProfilePage() {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
      loading: 'Updating clinical profile...',
      success: 'Profile Synchronized!',
      error: 'Failed to update targets.',
    })
    setTimeout(() => setIsSaving(false), 2000)
  }

  return (
    <div className="container mx-auto p-4 md:p-10 space-y-10 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Clinical Profile</h1>
          <p className="text-muted-foreground">Manage your physiological markers and ICMR-NIN targets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-3 bg-primary/10 text-primary">
            <User className="w-4 h-4" /> Personal Basics
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Activity className="w-4 h-4" /> Clinical Markers
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Stethoscope className="w-4 h-4" /> Medications
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3">
            <ShieldCheck className="w-4 h-4" /> Data & Privacy
          </Button>
        </div>

        {/* Form Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your basic biological data for precise RDA calculation.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input defaultValue="28" className="glass" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input defaultValue="74" className="glass" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="secondary" className="justify-center py-2 cursor-pointer border-primary/40 bg-primary/5 text-primary">Sedentary</Badge>
                  <Badge variant="outline" className="justify-center py-2 cursor-pointer">Moderate</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Medical Context</CardTitle>
              <CardDescription>Clinical modifiers used in the RAG inference engine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Type 2 Diabetes Focus</Label>
                  <p className="text-xs text-muted-foreground">Prioritize low-GI foods and carb counting.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>GLP-1 Medication User</Label>
                  <p className="text-xs text-muted-foreground">Minimize high-fat/fried foods to reduce nausea.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="gap-2"><RotateCcw className="w-4 h-4" /> Reset</Button>
            <Button 
               onClick={handleSave}
               disabled={isSaving}
               className="bg-primary hover:bg-primary/90 text-white min-w-32 gap-2"
            >
              {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
            </Button>
          </div>
          
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-3 text-amber-600">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs leading-relaxed italic">
              Note: Changing these values will immediately recalculate your 7-day Meal Plan and Recipe suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
