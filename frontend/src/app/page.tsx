import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Apple, ActivitySquare, BrainCircuit, ScanSearch, Settings2 } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6 md:p-10 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 mb-2">
            NutriSync Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Your AI-optimized clinical nutrition companion powered by IFCT 2017 & ICMR-NIN.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="glass hover:bg-primary/10">
            <Settings2 className="w-4 h-4 mr-2" />
            Preferences
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30">
            <Link href="/meal-plan">Generate Plan</Link>
          </Button>
        </div>
      </div>

      {/* Hero Stats / Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
        <Card className="glass-card border-l-4 border-l-primary/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily RAG Scans</CardTitle>
            <BrainCircuit className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">14</div>
            <p className="text-xs text-muted-foreground mt-1">Queries grounded in ICMR data</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-l-4 border-l-amber-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Diet Focus</CardTitle>
            <Apple className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">PCOS Regimen</div>
            <p className="text-xs text-muted-foreground mt-1">Low-GI, High Fibre</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-blue-500/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clinical Modifier</CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">GLP-1 Titration</div>
            <p className="text-xs text-muted-foreground mt-1">Nausea-safe foods prioritized</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Modules */}
      <h2 className="text-2xl font-bold tracking-tight">Active Modules</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Module 1 */}
        <Link href="/chat" className="group">
          <Card className="glass-card h-full transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer border-transparent hover:border-primary/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">RAG Assistant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Chat with our advanced AI grounded in Indian Food Composition Tables. Ask anything about local foods and nutrients.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Module 2 */}
        <Link href="/meal-plan" className="group">
          <Card className="glass-card h-full transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer border-transparent hover:border-blue-500/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                <Apple className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Meal Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Generate budget-aware, multi-day Indian meal plans with automatically consolidated grocery lists.
              </p>
            </CardContent>
          </Card>
        </Link>
        
        {/* Module 3 */}
        <Link href="/recipes" className="group">
          <Card className="glass-card h-full transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/20 cursor-pointer border-transparent hover:border-amber-500/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <ScanSearch className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Recipe Crafter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Turn your available household ingredients into healthy, tailored Indian recipes with step-by-step guidance.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Module 4 */}
        <Link href="/profile" className="group">
          <Card className="glass-card h-full transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer border-transparent hover:border-purple-500/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                <ActivitySquare className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Clinical Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configure your life-stage, medical conditions, medications (like GLP-1), and receive exact ICMR-NIN target updates.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
