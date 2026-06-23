# NutriSync — Agent Progress Log

## Goal
Fix and polish the NutriSync full-stack application — optimize auth flow (middleware redirect, API refresh logic), resolve dashboard hooks bug, fix food/analysis page UI/UX issues (dark mode text visibility, overflow), and render NutriSync Analysis Report with actual visual charts generated from the main database.

## Constraints & Preferences
- No Ollama — use only cloud LLM providers
- New Groq API key still hitting rate limits, root cause is API call inefficiency (not key validity)
- User testing locally on macOS with `screen` sessions for process persistence
- Dark mode (black bg) and light mode (white bg) must both be supported — all colors must use semantic Tailwind/CSS variable classes

## Progress

### Done
- **LLM call optimization**: Removed redundant `classify_intent` LLM call — switched to keyword-only classification (zero cost), halving API calls per chat query
- **Long-term memory optimization**: Removed `_llm_extract` which created a new `LLMRouter` on every message — now regex-only extraction
- **Prompt token reduction**: Shrunk `SYSTEM_PROMPT` from ~300 to ~100 tokens; removed redundant instructions from user prompt template
- **Coach agent optimization**: `_decompose_and_answer` now only runs for queries >80 chars with compound structure (skips simple queries)
- **DB query cleanup**: `_build_user_context` inlines imports only when needed, avoids useless error handling overhead
- **Streaming smoothness**: Backend `override.py` buffers tokens and yields chunks of ~30+ chars or every 150ms instead of every 1-3 char token. Frontend `chat-context.tsx` and `meal-plan/page.tsx` use `requestAnimationFrame`-throttled state updates (buffer + flush at 60fps)
- **Meal plan day-by-day generation**: Changed `_generate_chunk` to produce exactly 1 day per LLM call with 3 retry attempts. Added validation loop that checks for missing day numbers and regenerates gaps. Days are sorted by number before final assembly. Removed unused `_generate_full_plan` function
- **Recipe link deduplication**: Removed the duplicate inline `ExternalLink` from the Items column in `plan-view.tsx`; kept the dedicated "Recipe" column with heading and single link per item
- **Grocery bill summary**: Added category-level cost breakdown grid and prominent "Total Bill" row above the grocery table in `plan-view.tsx`
- **Grocery total fix**: Added server-side compute fallback in `_generate_grocery` — if LLM omits `grocery_total_inr` or returns 0, it's computed from item costs
- **PDF/Excel export improvements**: Added ☐ checkboxes before every item in PDF and a "✓" column in Excel for tracking. Cleaner table layout with day headers, proper column widths, grocery category headers, per-item nutrition, and total. Line-break and page-break handling
- **Bug fixes**: Added missing `ChevronDown` import in `plan-view.tsx`. Changed `<>` fragment to `<React.Fragment key={ci}>` in grocery section to fix React key warning. Fixed `CORS_ORIGINS` in `.env` to use JSON array format instead of comma-separated string
- **Column toggle fix**: Changed `visibleColumns` from `string[]` to `Set<string>` so toggled columns reappear in their original position instead of at the end (which pushed them off-screen)
- **Middleware JWT expiry check**: `frontend/src/middleware.ts` now decodes JWT payload and checks `exp` claim — expired tokens are cleared instead of blindly trusted. Removed AUTH_ONLY redirect from middleware — `/login` and `/signup` pages are no longer blocked, letting client-side `useEffect` handle authenticated-user redirects
- **apiFetch 401 refresh fix**: Changed `apiFetch` in `frontend/src/lib/api.ts` from `retry` boolean to `skipAuthRefresh` flag. Login/signup calls pass `skipAuthRefresh=true` so 401 responses (wrong credentials) throw the raw backend error (`"Invalid email or password"`) instead of entering the refresh flow and showing `"Session expired"`
- **Created `frontend/.env.local`**: Added `NEXT_PUBLIC_API_URL=http://localhost:8000` for explicit API URL config
- **Login/signup pages**: Added `useEffect` redirect to dashboard when user is already authenticated — handles client-side redirect instead of middleware
- **Nutrition-data-viewer dark mode fix**: Added Recharts CSS to `globals.css` targeting `.recharts-text`, `.recharts-cartesian-axis-tick-value`, `.recharts-legend-item-text`, tooltips, axis lines — uses `hsl(var(--foreground))` / `hsl(var(--muted-foreground))` instead of default SVG black
- **Nutrition-data-viewer overflow fix**: Added `max-w-[220px] truncate` to data grid cells, `max-w-[200px] truncate` to stats column names, `max-w-[300px] truncate` to sheet overview descriptions. Increased Y-axis widths (130→160, 120→140) and chart heights (250→300px). Changed table headers from `text-muted-foreground` to `text-foreground`
- **Analytics view now loads `NutriSync_Analysis_Report.xlsx`**: Added Recharts imports back. Report file pre-processed into typed sections (titles, chart headers, explanation blocks, data tables) using `useMemo`. Added KPI metric card grid for Summary sheet. Added bar chart rendering for data tables with numeric columns
- **Report file copied**: `NutriSync_Analysis_Report.xlsx` copied to `frontend/public/` for loading in the Analytics view
- **Dashboard hooks bug fix**: Moved `nutritionScore` useMemo in `frontend/src/app/dashboard/page.tsx` above conditional returns (lines 97-118) so it's always called, fixing "Rendered more hooks than during the previous render" error
- **Analytics charts from main DB**: Added cross-referencing chart generators in `nutrition-data-viewer.tsx` — loads `Food Composition`, `ICMR-NIN RDA`, `Profession Calorie Guide`, and `GLP-1 Nutrition Protocol` sheets from `AaharAI_NutriSync_Enhanced.xlsx` and generates actual Recharts bar charts for each report section:
  - Food Group Distribution (count by Food Group)
  - Vegetarian vs Non-Vegetarian (count by Diet Type)
  - Top 12 Iron-Rich Foods (sorted by Iron mg)
  - Vitamin B12 Sources (filtered by B12 > 0)
  - Iron RDA Across Life Stages (RDA sheet Profile vs Iron)
  - Caloric Needs by Profession (Profession sheet Male/Female Kcal)
  - GLP-1 Caloric Volume Reduction (parsed % from text column)
  - GLP-1 Protein Floors (Protein g/day per med+dose)

### In Progress
- **Backend deployment to Render**: Requires pushing code to GitHub and connecting to Render dashboard (Docker not installed locally). `render.yaml` and `Procfile` are configured. User needs to:
  1. Push to GitHub
  2. Create a new Web Service on Render (https://render.com)
  3. Connect the repo
  4. Set the `Start Command` to `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`
  5. Add env vars from `render.yaml`
  6. Create a PostgreSQL database via Render Dashboard
  7. Set `GROQ_API_KEY` in Render env

### Blocked
- (none)

## Key Decisions
- **Intent classification**: Moved from LLM call to keyword matching — saves 1 API call per message, completely free, covers >95% of real queries
- **Day-by-day generation**: 1 day per LLM call instead of 2-day chunks — guarantees every day is produced. Higher API call count but each call is smaller (768 tok) and we have the 3s spacing for rate limits anyway
- **Grocery total**: Server-side compute fallback — LLM is unreliable for arithmetic, so we sum item costs ourselves as a safety net
- **Streaming buffering**: 30-char chunks on backend + rAF throttle on frontend — smoother UI with ~10x fewer React re-renders
- **Column toggle storage**: Changed from `string[]` to `Set<string>` — maintains original column order by filtering `columns` array through the Set, instead of appending toggled-back columns at the end
- **Middleware redirect fix**: Removed AUTH_ONLY redirect from middleware entirely; login/signup pages handle client-side redirect via `useEffect` — guarantees users can always reach `/login` and `/signup` regardless of cookie state
- **apiFetch 401 fix**: Changed to `skipAuthRefresh` boolean — prevents login/signup 401s (wrong credentials) from entering the token-refresh flow which masked the real error as "Session expired"
- **Dashboard hooks fix**: Moved `nutritionScore` useMemo before all early returns so React always sees the same hook count regardless of auth state
- **Analytics charts**: Cross-reference main DB sheets to generate actual data-backed Recharts bar charts for each report chart section, instead of showing only text descriptions

## Relevant Files
- `frontend/src/app/dashboard/page.tsx`: Fixed hooks order — `nutritionScore` useMemo moved above conditional returns
- `frontend/src/components/nutrition-data-viewer.tsx`: Added Recharts imports, DB chart generators, chart rendering for report sections, KPI metric cards, swapped header detection
- `frontend/src/app/globals.css`: Recharts CSS variable fix for dark mode SVG text colors
- `frontend/public/NutriSync_Analysis_Report.xlsx`: Analysis report file for Analytics view
- `frontend/public/AaharAI_NutriSync_Enhanced.xlsx`: Main database used for chart data
- `backend/app/services/rag/service.py`: Main RAG pipeline
- `backend/app/services/rag/override.py`: Token-buffered streaming
- `backend/app/services/memory/long_term.py`: Regex-only fact extraction
- `backend/app/services/agents/coach.py`: Conditional decomposer
- `backend/app/api/v1/meal_plan.py`: Day-by-day meal plan generation
- `frontend/src/app/meal-plan/components/plan-view.tsx`: Grocery bill summary, recipe column
- `frontend/src/app/meal-plan/page.tsx`: rAF-throttled streaming, PDF/Excel exports
- `frontend/src/lib/chat-context.tsx`: rAF-throttled SSE token processing
- `frontend/src/middleware.ts`: JWT expiry check, removed AUTH_ONLY redirect
- `frontend/src/lib/api.ts`: `apiFetch` with `skipAuthRefresh` flag
- `frontend/src/lib/auth-context.tsx`: Auth provider
- `frontend/src/app/login/page.tsx`: Login page
- `frontend/src/app/signup/page.tsx`: Signup page
- `frontend/.env.local`: API URL config
- `backend/.env`: CORS_ORIGINS config
