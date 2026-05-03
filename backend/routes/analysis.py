"""
AaharAI NutriSync — Analysis API (No Docker)
Expose a full sheet dump from the NutriSync_Analysis_Report.xlsx in data/
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from config import settings
import pandas as pd
from pathlib import Path

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/report")
async def analysis_report():
    """Return full sheet data for NutriSync analysis report as JSON."""
    path = settings.DATA_DIR / "NutriSync_Analysis_Report.xlsx"
    try:
        xls = pd.ExcelFile(path)
        sheets = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(path, sheet_name=sheet_name)
            sheets.append({
                "name": sheet_name,
                "columns": list(df.columns),
                "rows": df.to_dict(orient="records"),
            })
        summary = {
            "sheet_count": len(sheets),
            "rows_total": sum(len(s.get("rows", [])) for s in sheets),
        }
        return {"sheets": sheets, "summary": summary}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
