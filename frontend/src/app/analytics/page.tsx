"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Loader2, Search, BarChart3, Database, FileSpreadsheet, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis
} from "recharts";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"table"|"charts">("table");

  useEffect(() => {
    fetch("/AaharAI_NutriSync_Enhanced.xlsx")
      .then(res => res.arrayBuffer())
      .then(ab => {
        const wb = XLSX.read(ab, { type: "array" });
        setSheets(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          loadSheetData(wb, wb.SheetNames[0]);
        }
      })
      .catch(e => console.error("Error loading Excel:", e))
      .finally(() => setLoading(false));
  }, []);

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setActiveSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws);
    setData(jsonData);
    setFilteredData(jsonData);
    if (jsonData.length > 0) {
      setColumns(Object.keys(jsonData[0] as object));
    }
  };

  const handleSheetChange = (sheet: string) => {
    setLoading(true);
    fetch("/AaharAI_NutriSync_Enhanced.xlsx")
      .then(res => res.arrayBuffer())
      .then(ab => {
        const wb = XLSX.read(ab, { type: "array" });
        loadSheetData(wb, sheet);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!search) {
      setFilteredData(data);
      return;
    }
    const lower = search.toLowerCase();
    const filtered = data.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(lower)
      );
    });
    setFilteredData(filtered);
  }, [search, data]);

  // Analytics Computations
  const getTop10Protein = () => {
    return [...filteredData]
      .filter(d => d["Protein (g)"] || d["protein"])
      .sort((a, b) => (b["Protein (g)"] || b["protein"] || 0) - (a["Protein (g)"] || a["protein"] || 0))
      .slice(0, 10)
      .map(d => ({
        name: (d["Food Name"] || d["name"] || "Unknown").substring(0, 15),
        Protein: parseFloat(d["Protein (g)"] || d["protein"] || 0)
      }));
  };

  const getMacroDistribution = () => {
    if (filteredData.length === 0) return [];
    let avgProtein = 0, avgCarbs = 0, avgFat = 0;
    filteredData.forEach(d => {
      avgProtein += parseFloat(d["Protein (g)"] || d["protein"] || 0) || 0;
      avgCarbs += parseFloat(d["Carbs (g)"] || d["carbs"] || 0) || 0;
      avgFat += parseFloat(d["Fat (g)"] || d["fat"] || 0) || 0;
    });
    const total = filteredData.length;
    return [
      { name: "Protein", value: Math.round(avgProtein / total), fill: "var(--color-protein)" },
      { name: "Carbs", value: Math.round(avgCarbs / total), fill: "var(--color-carbs)" },
      { name: "Fat", value: Math.round(avgFat / total), fill: "var(--color-fat)" },
    ];
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Raw Data Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Direct rendering and analysis of the complete Excel dataset without losing granularity.
          </p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <button 
            onClick={() => setViewMode("table")}
            className={cn("px-4 py-2 text-sm font-semibold rounded-md transition-colors", viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}
          >
            <FileSpreadsheet className="w-4 h-4 inline-block mr-2" /> Data Grid
          </button>
          <button 
            onClick={() => setViewMode("charts")}
            className={cn("px-4 py-2 text-sm font-semibold rounded-md transition-colors", viewMode === "charts" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2" /> Analytics
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p>Parsing Excel Dataset...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
            <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 w-full md:w-auto flex-1">
              {sheets.map(s => (
                <button
                  key={s}
                  onClick={() => handleSheetChange(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                    activeSheet === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder={`Filter ${filteredData.length} rows...`}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          {viewMode === "table" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[600px] relative">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10 shadow-sm">
                    <tr>
                      {columns.map(col => (
                        <th key={col} className="p-3 font-semibold text-muted-foreground border-b border-border">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredData.slice(0, 100).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        {columns.map(col => (
                          <td key={col} className="p-3">
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-muted/30 text-xs text-center text-muted-foreground border-t border-border">
                Showing {Math.min(100, filteredData.length)} of {filteredData.length} rows (performance limited view)
              </div>
            </div>
          )}

          {viewMode === "charts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Top 10 High Protein Foods</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getTop10Protein()} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor:'hsl(var(--card))', borderColor:'hsl(var(--border))', borderRadius:'8px'}} />
                      <Bar dataKey="Protein" fill="var(--color-protein)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6">Average Macro Distribution</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getMacroDistribution()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getMacroDistribution().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{backgroundColor:'hsl(var(--card))', borderColor:'hsl(var(--border))', borderRadius:'8px'}} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
