"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, Search, Database, FileSpreadsheet, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface NutritionDataViewerProps {
  title?: string;
  description?: string;
  sheetSelectorType?: "dropdown" | "tabs";
  enableColumnToggle?: boolean;
  excludeColumns?: string[];
  headerRowDetection?: boolean;
  searchPlaceholder?: string;
}

const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1Qm3f-eEOYL6z4tJYpkTv33k5sgFVG2v1";

export default function NutritionDataViewer({
  title = "Raw Data Analytics",
  description = "Direct rendering and analysis of the complete Excel dataset without losing granularity.",
  sheetSelectorType = "dropdown",
  enableColumnToggle = false,
  excludeColumns = [],
  headerRowDetection = false,
  searchPlaceholder,
}: NutritionDataViewerProps) {
  const [loading, setLoading] = useState(true);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [workbook, setWorkbook] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const res = await fetch("/AaharAI_NutriSync_Enhanced.xlsx");
        const ab = await res.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        setWorkbook(wb);
        setSheets(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          loadSheetData(wb, wb.SheetNames[0]);
        }
      } catch (e) {
        console.error("Error loading Excel:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    setActiveSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    let rows: any[];
    let cols: string[];

    if (headerRowDetection) {
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      if (rawData.length < 2) return;

      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        if (rawData[i] && rawData[i].length > 5) {
          headerRowIdx = i;
          break;
        }
      }

      const headers = rawData[headerRowIdx] as string[];
      rows = rawData
        .slice(headerRowIdx + 1)
        .map((row) => {
          let obj: any = {};
          headers.forEach((h, i) => {
            if (h && typeof h === "string") {
              obj[h] = row[i];
            }
          });
          return obj;
        })
        .filter((row) => Object.keys(row).length > 0);

      cols = headers.filter((h) => h && typeof h === "string");
    } else {
      rows = XLSX.utils.sheet_to_json(ws);
      cols = rows.length > 0 ? Object.keys(rows[0] as object) : [];
    }

    const filteredCols = cols.filter((c) => !excludeColumns.includes(c));
    setData(rows);
    setFilteredData(rows);
    setColumns(filteredCols);
    setVisibleColumns(new Set(filteredCols));
  };

  const handleSheetChange = (sheet: string) => {
    if (sheetSelectorType === "dropdown" && workbook) {
      loadSheetData(workbook, sheet);
    } else if (workbook) {
      setLocalLoading(true);
      (async () => {
        try {
          const XLSX = await import("xlsx");
          const res = await fetch("/AaharAI_NutriSync_Enhanced.xlsx");
          const ab = await res.arrayBuffer();
          const wb = XLSX.read(ab, { type: "array" });
          loadSheetData(wb, sheet);
        } finally {
          setLocalLoading(false);
        }
      })();
    }
  };

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!search) {
      setFilteredData(data);
      return;
    }
    const lower = search.toLowerCase();
    setFilteredData(
      data.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(lower))
      )
    );
  }, [search, data]);

  const isLoading = loading || localLoading;

  const placeholder = searchPlaceholder || `Search ${filteredData.length} rows...`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            {title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
        <a
          href={SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Analytics
        </a>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p>Parsing Excel Dataset...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
            <div className="flex flex-col w-full md:w-auto flex-1 gap-2">
              <div className="flex items-center gap-2 pb-2 md:pb-0">
                <span className="text-xs font-semibold text-muted-foreground self-center">Sheet:</span>
                {sheetSelectorType === "dropdown" ? (
                  <select
                    value={activeSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  >
                    {sheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex overflow-x-auto gap-2">
                    {sheets.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSheetChange(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                          activeSheet === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {enableColumnToggle && columns.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground">Show/Hide Columns:</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {columns.map((c) => {
                      const isVisible = visibleColumns.has(c);
                      return (
                        <button
                          key={c}
                          onClick={() => toggleColumn(c)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[10px] md:text-xs font-medium whitespace-nowrap transition-colors border",
                            isVisible
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:bg-muted"
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="relative w-full md:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="pl-9 bg-background"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[600px] relative">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-muted/95 backdrop-blur z-10 shadow-sm">
                  <tr>
                    {(enableColumnToggle ? columns.filter((c) => visibleColumns.has(c)) : columns).map((col) => (
                      <th key={col} className="p-3 font-semibold text-foreground border-b border-border whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredData.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      {(enableColumnToggle ? columns.filter((c) => visibleColumns.has(c)) : columns).map((col) => (
                        <td key={col} className="p-3">
                          <span className="block max-w-[220px] truncate" title={String(row[col] ?? "-")}>
                            {row[col] !== undefined && row[col] !== null ? String(row[col]) : "-"}
                          </span>
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
        </div>
      )}
    </div>
  );
}
