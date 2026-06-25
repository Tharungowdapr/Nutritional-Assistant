# NutriSync — Agent Progress Log

## Goal
Complete Q2 journal publication for AaharAI NutriSync — statistical validation, RAGAS evaluation, ground truth dataset (NutriSyncBench v2.0), failure analysis, cross-encoder ablation, chunk size ablation, retrieval quality improvements, and account deletion.

## Constraints & Preferences
- Ollama primary (gemma3:4b local), Groq fallback (llama-3.3-70b-versatile), no-LLM safe mode — circuit breaker with 60s retry
- Render free tier (512MB) — avoid torch/transformers OOM; lazy RAG init
- Frontend on Vercel, backend on Render, Neon PostgreSQL
- Dark mode (black bg) and light mode (white bg) both supported — all colors use semantic Tailwind/CSS variable classes

## Progress

### Done
- **LLM call optimization**: Removed redundant `classify_intent` LLM call — switched to keyword-only classification (zero cost), halving API calls per chat query
- **Long-term memory optimization**: Regex-only fact extraction (was `_llm_extract` creating new `LLMRouter` on every message)
- **Prompt token reduction**: `SYSTEM_PROMPT` ~100 tokens; coach agent `_decompose_and_answer` only for >80 char compound queries
- **Streaming smoothness**: Backend `override.py` buffers 30+ char chunks / 150ms. Frontend rAF-throttled updates (60fps)
- **Meal plan day-by-day**: 1 day per LLM call with validation loop for missing days; grocery total server-side fallback
- **Recipe link dedup / grocery bill summary**: Recipe column with link; category cost grid + Total Bill row
- **PDF/Excel export**: Checkboxes, day headers, column widths, grocery categories, per-item nutrition
- **Column toggle fix**: `string[]` → `Set<string>` to preserve column order
- **Middleware JWT expiry**: Decodes JWT payload, checks `exp`, clears stale cookies; no AUTH_ONLY redirect
- **apiFetch 401 fix**: `skipAuthRefresh` flag prevents login/signup 401s from entering refresh flow
- **Dashboard hooks bug**: `nutritionScore` useMemo moved above conditional returns
- **Nutrition-data-viewer**: Recharts dark mode CSS, overflow truncation, KPI metric cards, DB-backed bar charts
- **Statistical significance tests**: Paired Wilcoxon signed-rank test, Cohen's d, 95% CIs. Hybrid vs Vector: p=0.71, d=0.07 (not significant). Hybrid vs BM25: p=0.002, d=1.01 (significant)
- **MRR@5 / nDCG@5**: Both 0.440
- **Cross-encoder reranker ablation**: 44% positive-first rank, 56% all-negative
- **Failure mode analysis**: 13 failures (low chunk relevance 11, LLM hallucination 4, citation verifier error 6, unknown 2)
- **Component-level timing**: `backend/app/services/rag/timing.py` with `ComponentTimer` — per-component latency (retrieve, build_context, llm_generation, citation_verification, format_sources) returned in chat response
- **RAGAS evaluation (Groq judge)**: Faithfulness 0.512, Relevancy 0.518, Context Precision 0.160, Context Recall 0.370
- **Security hardening**: Secure/HttpOnly cookies (production), CSP/HSTS/X-Frame-Options headers, TrustedHostMiddleware, SECRET_KEY enforcement in production
</parameter=production
- **ROUGE-L**: Mean 0.165 (37/50 queries matched to gold answers)
- **NutriSyncBench v2.0**: 200 QA pairs across 8 categories (Food Composition 46, Clinical Nutrition 31, RDA Guidelines 25, Regional Nutrition 22, Food Substitution 20, Gap Analysis 20, Medicine-Nutrition 18, Supplement Guidance 18)
- **BERTScore**: roberta-large cached, F1=0.022 (length divergence — fixed with 3000-char capture + gold-length truncation)
- **Citation verifier upgraded**: Multi-signal (keyword 30% + ngram 25% + medical 30% + sentence 15% + cross-encoder as modifier + negation check)
- **Retrieval fix**: `top_k` increased 3→10, hybrid candidates `k=5` → `k=top_k+5`, score threshold 0.3→0.1
- **BERTScore fix**: Predictions truncated to gold answer length (`len(gold)*2`) for fair length-matched comparison
- **Chunk size ablation script**: `backend/scripts/chunk_size_ablation.py` — tests 256/512/1024 chunk sizes
- **Publication folder**: `/publication/` with benchmark, evaluation results, features, README — 10/11 Q2 criteria (human eval pending)
- **Backend deployed on Render**: `https://nutritional-assistant-jg6k.onrender.com` — health endpoint returns 200
- **Frontend deployed on Vercel**: `https://frontend-azure-omega-45f4cqwbni.vercel.app`
- **Account deletion**: `DELETE /api/auth/delete-account` — cascade deletes from all 9 child tables + user record. Frontend double-confirmation dialog in privacy settings

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- **Direct RAGAS over ragas package**: Conflicting deps with `ragas 0.4.3` — implemented metrics via Groq API
- **Groq as LLM judge**: `llama-3.3-70b-versatile` — free on Groq free tier (30 RPM, 6K/min)
- **Honest statistical framing**: Hybrid-vs-vector not significant — framed as "hybrid matches vector + adds keyword capabilities"
- **Citation verifier cross-encoder**: `cross-encoder/ms-marco-MiniLM-L-6-v2` (~400MB) fits Render 512MB limit; lazy-loaded
- **Retrieval top_k=10**: More candidates for reranker to improve Context Precision (was 3 — too few)
- **Account deletion pattern**: Direct cascade delete (no soft-delete / is_active flag) — GDPR compliance, user expectation
- **Publication separate from source**: `/publication/` at repo root for easy journal submission ZIP

## Next Steps
1. Recruit 2+ dietitians for human evaluation of 100 responses (4-6 weeks, needed for 11/11 Q2 criteria)
2. Submit NutriSyncBench to HuggingFace Datasets
3. Submit to Applied Sciences (MDPI) or JMIR AI

## Relevant Files
- `backend/app/api/v1/auth.py`: Account deletion endpoint (line 266)
- `backend/app/core/config.py`: RAG_TOP_K=10, RAG_SCORE_THRESHOLD=0.1, ALLOWED_HOSTS
- `backend/app/services/rag/service.py`: Retrieval pipeline with hybrid + reranker (top_k fix, hybrid k fix) + ComponentTimer integration
- `backend/app/services/rag/timing.py`: ComponentTimer for per-component latency
- `backend/scripts/evaluation.py`: 92 test queries across 8 categories, 3000-char answer capture
- `backend/scripts/evaluation_v2.py`: Enhanced eval with BERTScore, stats, MRR/nDCG, failure analysis
- `backend/scripts/nutrisync_bench.py`: Benchmark seed (200 entries, v2.0 JSON)
- `backend/scripts/chunk_size_ablation.py`: 256/512/1024 chunk size comparison
- `backend/app/services/agents/tools/citation_verifier.py`: Multi-signal verifier with cross-encoder NLI (keyword 30%, ngram 25%, medical 30%, sentence 15%, negation check)
- `backend/main.py`: Security headers middleware, TrustedHostMiddleware, CSP/HSTS/X-Frame-Options
- `frontend/src/app/settings/components/privacy-tab.tsx`: Account deletion UI with double-confirmation
- `frontend/src/lib/auth-context.tsx`: deleteAccount() in AuthContext
- `frontend/src/lib/api.ts`: authApi.deleteAccount(), Secure/HttpOnly cookies
- `frontend/src/lib/chat-context.tsx`: rAF-throttled SSE token processing
- `frontend/src/proxy.ts`: JWT expiry check (was middleware.ts)
- `publication/README.md`: Q2 checklist, 10/11 criteria
- `publication/results-summary.md`: All metrics
- `publication/benchmark/benchmark_v2.json`: 200 entries, 8 categories
- `publication/evaluation/`: Full eval results
