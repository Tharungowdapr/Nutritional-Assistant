"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, Filter, Download, ChevronUp, ChevronDown, ChevronLeft, 
  ChevronRight, X, Eye, EyeOff, ArrowUpDown, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FoodData {
  [key: string]: string | number | null;
}

interface ColumnDef {
  key: string;
  label: string;
  type: "text" | "number" | "category";
  sortable: boolean;
  filterable: boolean;
  width?: string;
}

interface FilterState {
  [key: string]: {
    type: "text" | "range" | "category";
    value: string | { min: number; max: number } | string[];
  };
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "Food Name", label: "Food Name", type: "text", sortable: true, filterable: true },
  { key: "Food Group", label: "Food Group", type: "category", sortable: true, filterable: true },
  { key: "Diet Type", label: "Diet Type", type: "category", sortable: true, filterable: true },
  { key: "Region Availability", label: "Region", type: "category", sortable: true, filterable: true },
  { key: "Energy (kcal)", label: "Energy (kcal)", type: "number", sortable: true, filterable: true, width: "100px" },
  { key: "Protein (g)", label: "Protein (g)", type: "number", sortable: true, filterable: true, width: "90px" },
  { key: "Fat (g)", label: "Fat (g)", type: "number", sortable: true, filterable: true, width: "80px" },
  { key: "Carbs (g)", label: "Carbs (g)", type: "number", sortable: true, filterable: true, width: "90px" },
  { key: "Fibre (g)", label: "Fibre (g)", type: "number", sortable: true, filterable: true, width: "80px" },
  { key: "Iron (mg)", label: "Iron (mg)", type: "number", sortable: true, filterable: true, width: "80px" },
  { key: "Calcium (mg)", label: "Calcium (mg)", type: "number", sortable: true, filterable: true, width: "90px" },
  { key: "Vitamin C (mg)", label: "Vit C (mg)", type: "number", sortable: true, filterable: true, width: "90px" },
];

const API_URL = "http://localhost:8000/api";
const MAX_API_LIMIT = 100;

export default function FoodsDataPage() {
  const [allData, setAllData] = useState<FoodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(DEFAULT_COLUMNS.map(c => c.key))
  );
  const [filters, setFilters] = useState<FilterState>({});

  const categoricalOptions = useMemo(() => {
    const options: { [key: string]: Set<string> } = {};
    DEFAULT_COLUMNS.filter(c => c.type === "category").forEach(col => {
      const values = new Set<string>();
      allData.forEach(row => {
        const val = row[col.key];
        if (val) values.add(String(val));
      });
      options[col.key] = values;
    });
    return options;
  }, [allData]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_URL}/nutrition/foods?page=1&limit=${MAX_API_LIMIT}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load: ${res.status} - ${text}`);
      }
      
      const data = await res.json();
      
      if (!data.foods || !Array.isArray(data.foods)) {
        throw new Error("Invalid data format: foods array not found");
      }
      
      setAllData(data.foods);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Load error:", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    let result = [...allData];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => 
          val !== null && String(val).toLowerCase().includes(query)
        )
      );
    }

    Object.entries(filters).forEach(([colKey, filter]) => {
      if (filter.type === "text" && filter.value) {
        const query = String(filter.value).toLowerCase();
        result = result.filter(row => 
          row[colKey] && String(row[colKey]).toLowerCase().includes(query)
        );
      } else if (filter.type === "range" && filter.value) {
        const range = filter.value as { min: number; max: number };
        result = result.filter(row => {
          const val = Number(row[colKey]);
          return !isNaN(val) && val >= range.min && val <= range.max;
        });
      } else if (filter.type === "category" && filter.value && (filter.value as string[]).length > 0) {
        result = result.filter(row => 
          (filter.value as string[]).includes(String(row[colKey]))
        );
      }
    });

    return result;
  }, [allData, searchQuery, filters]);

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const handleFilterChange = (column: string, type: "text" | "range" | "category", value: any) => {
    setFilters(prev => ({
      ...prev,
      [column]: { type, value }
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setPage(1);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const exportData = (includeFilters: boolean) => {
    const dataToExport = includeFilters ? sortedData : allData;
    const headers = Array.from(visibleColumns);
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(row => 
        headers.map(h => {
          const val = row[h];
          return typeof val === "string" && val.includes(",") ? `"${val}"` : val ?? "";
        }).join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foods_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading food data...</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border bg-background p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowColumns(!showColumns)}>
            <Eye className="w-4 h-4 mr-2" />
            Columns
          </Button>

          <div className="relative group">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => exportData(false)} className="block w-full px-4 py-2 text-left text-sm hover:bg-muted whitespace-nowrap">
                Export All ({allData.length})
              </button>
              <button onClick={() => exportData(true)} className="block w-full px-4 py-2 text-left text-sm hover:bg-muted whitespace-nowrap">
                Export Filtered ({sortedData.length})
              </button>
            </div>
          </div>

          <span className="ml-auto text-sm text-muted-foreground">
            {sortedData.length} rows
          </span>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg border border-border">
            {DEFAULT_COLUMNS.filter(c => c.filterable).map(col => (
              <div key={col.key} className="min-w-[150px]">
                <label className="text-xs font-medium text-muted-foreground block mb-1">{col.label}</label>
                {col.type === "text" && (
                  <Input
                    placeholder={`Filter...`}
                    value={(filters[col.key]?.value as string) || ""}
                    onChange={(e) => handleFilterChange(col.key, "text", e.target.value)}
                    className="h-8 text-sm"
                  />
                )}
                {col.type === "number" && (
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={(filters[col.key]?.value as any)?.min ?? ""}
                      onChange={(e) => handleFilterChange(col.key, "range", { min: parseFloat(e.target.value) || 0, max: (filters[col.key]?.value as any)?.max ?? 999999 })}
                      className="h-8 text-sm w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={(filters[col.key]?.value as any)?.max ?? ""}
                      onChange={(e) => handleFilterChange(col.key, "range", { min: (filters[col.key]?.value as any)?.min ?? 0, max: parseFloat(e.target.value) || 999999 })}
                      className="h-8 text-sm w-20"
                    />
                  </div>
                )}
                {col.type === "category" && categoricalOptions[col.key] && (
                  <select
                    value={(filters[col.key]?.value as string[])?.[0] || ""}
                    onChange={(e) => handleFilterChange(col.key, "category", e.target.value ? [e.target.value] : [])}
                    className="h-8 text-sm px-2 rounded border border-input bg-background w-full"
                  >
                    <option value="">All</option>
                    {Array.from(categoricalOptions[col.key]).sort().map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {showColumns && (
        <div className="shrink-0 p-4 bg-muted/30 border-b border-border">
          <div className="flex flex-wrap gap-2">
            {DEFAULT_COLUMNS.map(col => (
              <button
                key={col.key}
                onClick={() => toggleColumn(col.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors",
                  visibleColumns.has(col.key) ? "bg-primary/10 border-primary text-primary" : "bg-background border-border text-muted-foreground"
                )}
              >
                {visibleColumns.has(col.key) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {col.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border">
              <th className="w-12 p-2 text-center text-xs font-medium text-muted-foreground">#</th>
              {DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                <th
                  key={col.key}
                  className="p-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:bg-muted/50"
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="ml-1">
                        {sortColumn === col.key ? (
                          sortDirection === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="p-2 text-center text-xs text-muted-foreground">
                  {(page - 1) * pageSize + idx + 1}
                </td>
                {DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                  <td
                    key={col.key}
                    className={cn("p-2 text-sm", col.type === "number" ? "text-right font-mono" : "", col.width && "whitespace-nowrap")}
                    style={{ maxWidth: col.width }}
                  >
                    {row[col.key] !== null && row[col.key] !== undefined
                      ? col.type === "number" && typeof row[col.key] === "number"
                        ? Number(row[col.key]).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : String(row[col.key])
                      : "—"}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={DEFAULT_COLUMNS.filter(c => visibleColumns.has(c.key)).length + 1} className="p-8 text-center text-muted-foreground">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="shrink-0 flex items-center justify-between p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-8 px-2 rounded border border-input bg-background text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}