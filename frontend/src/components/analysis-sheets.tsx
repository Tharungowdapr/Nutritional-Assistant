import React, { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";

export function AnalysisSheets() {
  const [report, setReport] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/analysis/report");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setReport(data);
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? 'Failed to load analysis');
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (err) {
    return <div className="bg-card border border-border rounded-xl p-5 text-red-700">Error: {err}</div>;
  }

  if (!report || !report.sheets) return null;

  return (
    <>
      {report.sheets.map((sheet: any, idx: number) => (
        <div key={idx} className="bg-card border border-border rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">{sheet.name}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{(sheet.columns || []).length} columns</span>
            <span className="text-xs ml-2 text-muted-foreground">{(sheet.rows || []).length} rows</span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 260 }}>
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {(sheet.columns || []).map((col: string, i: number) => (
                    <th key={i} className="px-2 py-1 text-left text-muted-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sheet.rows || []).slice(0, 50).map((row: any, rIdx: number) => (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white/5' : ''}>
                    {(sheet.columns || []).map((col: string, cIdx: number) => (
                      <td key={cIdx} className="px-2 py-1">{row?.[col] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
