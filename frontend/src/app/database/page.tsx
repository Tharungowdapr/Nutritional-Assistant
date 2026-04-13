"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface Food {
  [key: string]: any;
}

export default function FoodDatabasePage() {
  const { user, loading } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterDietType, setFilterDietType] = useState("");

  useEffect(() => {
    if (!user || loading) return;
    fetchFoods();
  }, [user, loading, searchQuery, filterRegion, filterDietType]);

  const fetchFoods = async () => {
    try {
      setIsLoading(true);
      let url = "/api/nutrition/foods?limit=5000";
      
      if (searchQuery) url += `&query=${encodeURIComponent(searchQuery)}`;
      if (filterRegion) url += `&region=${encodeURIComponent(filterRegion)}`;
      if (filterDietType) url += `&diet_type=${encodeURIComponent(filterDietType)}`;

      const data = await apiFetch(url, { method: "GET" });
      setFoods(data.foods || []);
    } catch (error) {
      console.error("Failed to fetch foods:", error);
      toast.error("Failed to load food database");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    if (foods.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Create CSV content
      const headers = Object.keys(foods[0] || {});
      const csvContent = [
        headers.join(","),
        ...foods.map(food =>
          headers.map(header => {
            const value = food[header];
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === "string" && value.includes(",")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? "";
          }).join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `food_database_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Food database exported to CSV");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export data");
    }
  };

  if (!user) {
    return <div className="p-8">Please log in to view the food database.</div>;
  }

  const columns = foods.length > 0 ? Object.keys(foods[0]).slice(0, 12) : [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Food Database</h1>
          <p className="text-muted-foreground">Browse and search the nutrition database</p>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">All Regions</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Central">Central</option>
            </select>
            <select
              value={filterDietType}
              onChange={(e) => setFilterDietType(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-background"
            >
              <option value="">All Diet Types</option>
              <option value="Veg">Vegetarian</option>
              <option value="Non-Veg">Non-Vegetarian</option>
              <option value="Vegan">Vegan</option>
            </select>
            <Button onClick={exportToExcel} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {foods.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {foods.length} foods
            </p>
          )}
        </Card>

        {/* Data Table */}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading foods...</div>
        ) : foods.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No foods found. Try a different search.</div>
        ) : (
          <Card className="overflow-hidden">
            <ScrollArea className="w-full">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border sticky top-0">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {foods.map((food, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-3 whitespace-nowrap">
                          <span className="text-foreground">
                            {typeof food[col] === "number" ? food[col].toFixed(2) : food[col]}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-4 mt-6 bg-primary/5 border-primary/10">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Use the search bar to find specific foods, filters to narrow by region or diet type, and export to CSV to download the full database for external analysis.
          </p>
        </Card>
      </div>
    </div>
  );
}
