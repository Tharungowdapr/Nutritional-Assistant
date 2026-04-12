# NutriSync (AaharAI) — Complete Professional Improvement Guide

> NOTE: This document is a detailed audit and improvement guide. For day-to-day setup and developer instructions, prefer `README.md`, `SETUP.md`, and `ARCHITECTURE.md` which contain the canonical, up-to-date instructions.
### Component-wise Problems & Solutions
**Repo:** `github.com/Tharungowdapr/Nutritional-Assistant`  
**Stack:** Next.js 15 · FastAPI · SQLite · ChromaDB · Ollama/Groq  
**Audit date:** April 2026

---

## Table of Contents

1. [Authentication System](#1-authentication-system)
2. [Frontend — Core Infrastructure](#2-frontend--core-infrastructure)
3. [Frontend — Dashboard (/)](#3-frontend--dashboard-)
4. [Frontend — Chat Page (/chat)](#4-frontend--chat-page-chat)
5. [Frontend — Profile Page (/profile)](#5-frontend--profile-page-profile)
6. [Frontend — Onboarding (/onboarding)](#6-frontend--onboarding-onboarding)
7. [Frontend — Meal Plan (/meal-plan)](#7-frontend--meal-plan-meal-plan)
8. [Frontend — Recipes (/recipes)](#8-frontend--recipes-recipes)
9. [Frontend — Sidebar & Navigation](#9-frontend--sidebar--navigation)
10. [Missing Frontend Pages](#10-missing-frontend-pages)
11. [Backend — Auth Routes](#11-backend--auth-routes)
12. [Backend — Nutrition Routes](#12-backend--nutrition-routes)
13. [Backend — Chat Routes](#13-backend--chat-routes)
14. [Backend — Meal Plan Routes](#14-backend--meal-plan-routes)
15. [Backend — Security & Infrastructure](#15-backend--security--infrastructure)
16. [Database Layer](#16-database-layer)
17. [API Client (lib/api.ts)](#17-api-client-libapits)
18. [UI Design System](#18-ui-design-system)
19. [Data Display — Food & Nutrition](#19-data-display--food--nutrition)
20. [DevOps & Deployment](#20-devops--deployment)

---

## 1. Authentication System

### Problem 1.1 — No protected route enforcement
**File:** All frontend pages  
**Severity:** CRITICAL

**Current state:**  
Every page (`/`, `/chat`, `/meal-plan`, `/profile`, `/recipes`) is fully accessible without a JWT token. The `auth-context.tsx` exposes `user` and `loading` states but no page uses them to block unauthenticated access. A user can visit `/profile` without being logged in and see a plain text message rather than being redirected.

**Solution:**  
Create a `ProtectedRoute` wrapper component and wrap all app pages with it. Place it in `src/components/protected-route.tsx`:

```tsx
// src/components/protected-route.tsx
"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_ROUTES = ["/login", "/signup", "/onboarding"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, pathname, router]);

  if (loading) return <FullPageSkeleton />;
  if (!user && !PUBLIC_ROUTES.includes(pathname)) return null;
  return <>{children}</>;
}
```

Then wrap your root layout in `src/app/layout.tsx`:
```tsx
<AuthProvider>
  <ProtectedRoute>
    {children}
  </ProtectedRoute>
</AuthProvider>
```

After login, redirect the user to their originally-requested page using `const redirect = searchParams.get('redirect') || '/'`.

---

### Problem 1.2 — No JWT refresh token mechanism
**File:** `backend/auth/security.py`, `frontend/src/lib/api.ts`  
**Severity:** CRITICAL

**Current state:**  
`create_access_token()` creates a token that expires in `JWT_EXPIRE_MINUTES = 1440` (24 hours). When the token expires, `apiFetch` throws a 401 error but there is no retry or refresh mechanism. The user silently gets broken responses until they manually log out and log in again.

**Solution:**

Backend — add a refresh token route in `backend/routes/auth.py`:
```python
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    """Issue a new access token for the currently authenticated user."""
    new_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=new_token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, profile=user.profile)
    )
```

Frontend — add an interceptor in `src/lib/api.ts`:
```ts
async function apiFetch<T = any>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  // ... existing headers setup ...
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    // Attempt silent token refresh
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setToken(data.access_token);
      return apiFetch(path, options, false); // Retry once
    } else {
      clearToken();
      window.location.href = "/login";
      throw new ApiError(401, "Session expired");
    }
  }
  // ... rest of existing code ...
}
```

---

### Problem 1.3 — No forgot password / reset password flow
**Files:** `backend/routes/auth.py`, missing frontend pages  
**Severity:** HIGH

**Current state:**  
There are no password reset endpoints on the backend and no `/forgot-password` or `/reset-password` pages on the frontend. Users who forget their password have no recovery path.

**Solution:**

Backend — add these fields to `UserDB` in `auth/database.py`:
```python
reset_token = Column(String(255), nullable=True)
reset_token_expires = Column(DateTime, nullable=True)
email_verified = Column(Boolean, default=False)
```

Backend — add these routes in `auth/routes.py`:
```python
import secrets

@router.post("/forgot-password")
async def forgot_password(email: str, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == email.lower()).first()
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}  # Don't reveal existence
    
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.commit()
    
    # Send email via your notification service
    # await send_reset_email(user.email, token)
    return {"message": "Reset link sent if email exists."}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(
        UserDB.reset_token == token,
        UserDB.reset_token_expires > datetime.utcnow()
    ).first()
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")
    
    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password updated successfully"}
```

Frontend — create `src/app/forgot-password/page.tsx` (email input form) and `src/app/reset-password/page.tsx` (new password form that reads `?token=...` from the URL query string).

---

### Problem 1.4 — No rate limiting on auth endpoints
**File:** `backend/routes/auth.py`  
**Severity:** HIGH

**Current state:**  
`/api/auth/login` and `/api/auth/signup` have no rate limiting. An attacker can make thousands of requests per second to brute-force passwords or spam registrations.

**Solution:**  
Install `slowapi` (`pip install slowapi`) and add to `backend/main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

Then decorate auth routes:
```python
from main import limiter

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...

@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, ...):
    ...
```

---

### Problem 1.5 — No account deletion endpoint
**File:** `backend/routes/auth.py`  
**Severity:** MEDIUM

**Current state:**  
Users cannot delete their own accounts. This is both a UX issue (no exit path) and a GDPR/privacy concern.

**Solution:**
```python
@router.delete("/account")
async def delete_account(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Permanently delete the user's account and all associated data."""
    db.query(ChatHistoryDB).filter(ChatHistoryDB.user_id == user.id).delete()
    db.query(MealPlanDB).filter(MealPlanDB.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}
```

Frontend — add a "Danger Zone" section on the `/settings` page with a confirmation dialog before calling this endpoint.

---

### Problem 1.6 — No change password endpoint
**File:** `backend/routes/auth.py`  
**Severity:** MEDIUM

**Current state:**  
Logged-in users cannot change their own passwords. There is no such endpoint and no UI for it.

**Solution:**
```python
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

@router.put("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    user.hashed_password = hash_password(request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
```

Frontend — add a password change form to the `/settings` page with fields for current password and new password (with confirmation).

---

### Problem 1.7 — Hardcoded SECRET_KEY in config
**File:** `backend/config.py`  
**Severity:** HIGH

**Current state:**  
`SECRET_KEY: str = "nutrisync_dev_secret_change_in_production"` is committed in the repo. Anyone who forks or clones can forge valid JWTs.

**Solution:**  
Remove the default value entirely. The field should fail startup if not provided in production:
```python
SECRET_KEY: str  # No default — MUST be set in .env
```

Generate a strong key: `python -c "import secrets; print(secrets.token_hex(32))"`  
Add to `.env.example`: `SECRET_KEY=your-32-char-random-hex-here`  
Add to `.gitignore`: `.env`

---

## 2. Frontend — Core Infrastructure

### Problem 2.1 — No global error boundary
**Files:** `src/app/layout.tsx`, all pages  
**Severity:** HIGH

**Current state:**  
API errors are silently caught with `console.error` in several places. If an unhandled error occurs (e.g., Ollama is down, ChromaDB fails), the page silently breaks with no user feedback. There is no React error boundary at the app level.

**Solution:**  
Create `src/components/error-boundary.tsx`:
```tsx
"use client";
import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-xl font-medium">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wire all API calls to display toast errors instead of silently failing:
```ts
// In api.ts — update apiFetch error handling
if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  const error = new ApiError(res.status, body.detail || "Request failed");
  // Dispatch global error event
  window.dispatchEvent(new CustomEvent("api-error", { detail: error }));
  throw error;
}
```

---

### Problem 2.2 — No loading skeleton states
**Files:** All page components  
**Severity:** MEDIUM

**Current state:**  
Only the home page has a shimmer skeleton state. Chat, meal plan, and profile pages render either a blank white area or partial data while loading. This makes the app feel unfinished.

**Solution:**  
Create a reusable skeleton system. Add to `src/components/ui/skeleton.tsx` (already exists but is not used consistently). Create page-specific skeletons:

```tsx
// Example: ChatPageSkeleton
export function ChatPageSkeleton() {
  return (
    <div className="space-y-4 p-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={`flex gap-4 ${i % 2 === 0 ? '' : 'justify-end'}`}>
          <div className="shimmer w-8 h-8 rounded-full" />
          <div className="shimmer h-16 rounded-2xl" style={{ width: `${40 + Math.random() * 40}%` }} />
        </div>
      ))}
    </div>
  );
}
```

Use `Suspense` boundaries and loading states in every page that fetches data.

---

### Problem 2.3 — No theme toggle in UI
**Files:** `src/components/sidebar.tsx`, `globals.css`  
**Severity:** LOW

**Current state:**  
The CSS fully supports both `.dark` and light themes with well-defined variables. The `theme-provider.tsx` component exists. But there is no toggle button anywhere in the UI. Users cannot switch between light and dark mode.

**Solution:**  
Add a theme toggle button to the sidebar footer next to the user avatar:
```tsx
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
```

---

### Problem 2.4 — No PWA support
**Files:** `frontend/public/`, `next.config.ts`  
**Severity:** LOW

**Current state:**  
There is no `manifest.json`, no service worker, and no install prompt. The implementation plan explicitly mentions PWA. On mobile, users get a raw browser tab instead of a native-feeling app.

**Solution:**  
Install `next-pwa` and add a `public/manifest.json`:
```json
{
  "name": "NutriSync by AaharAI",
  "short_name": "NutriSync",
  "description": "AI-powered Indian nutrition assistant",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF8",
  "theme_color": "#2D6A4F",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

In `next.config.ts`:
```ts
const withPWA = require("next-pwa")({ dest: "public", disable: process.env.NODE_ENV === "development" });
module.exports = withPWA({ /* your existing config */ });
```

---

## 3. Frontend — Dashboard (/)

### Problem 3.1 — Stats are partially hardcoded
**File:** `src/app/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
The stats grid shows `"2,968"` for Knowledge Chunks and `"Gemma4:e2b"` for AI Backend as hardcoded strings. These values are stale and misleading. The `healthApi.check()` call already returns `db_stats.foods`, `ollama_available`, `groq_available`, and `chroma_ready`.

**Solution:**  
Replace hardcoded strings with data from the API call:
```tsx
const [stats, setStats] = useState<any>(null);
useEffect(() => { healthApi.check().then(setStats).catch(console.error); }, []);

// Replace hardcoded values:
{ label: "Knowledge Chunks", value: stats?.chroma_ready ? "Ready" : "Loading", total: "ChromaDB" },
{ label: "AI Backend", value: stats?.ollama_available ? "Ollama" : stats?.groq_available ? "Groq" : "Offline", total: stats?.ollama_available ? settings.OLLAMA_MODEL : "Fallback" },
```

---

### Problem 3.2 — Dashboard has no real user analytics
**File:** `src/app/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
The dashboard shows platform-level stats (food DB size, RDA profiles) but nothing user-specific. A logged-in user sees no personalised data: no today's calorie target, no last meal plan date, no chat count.

**Solution:**  
Add a user stats row on the dashboard. Fetch from:
- `GET /api/meal-plan/history?limit=1` → show last meal plan date
- `GET /api/chat/history?limit=1` → show total conversation count
- `GET /api/nutrition/targets` with user profile → show today's calorie target

Display these as a row of personalised cards below the system stats:
```tsx
{user && (
  <div className="grid grid-cols-3 gap-4">
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground">Daily Calorie Target</p>
      <p className="text-2xl font-semibold">{userTargets?.energy_kcal || "—"}</p>
      <p className="text-xs text-muted-foreground mt-1">kcal · based on your profile</p>
    </div>
    {/* ... */}
  </div>
)}
```

---

## 4. Frontend — Chat Page (/chat)

### Problem 4.1 — No new chat / clear chat button
**File:** `src/app/chat/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
The chat page loads and shows all history since account creation in one long thread. There is no way to start a fresh conversation. The only option is to continue the same endless thread.

**Solution:**  
Add a "New Chat" button in the page header:
```tsx
const handleNewChat = async () => {
  setMessages([{
    role: "assistant",
    content: "Hello! I'm your IFCT-grounded nutrition assistant. How can I help you today?"
  }]);
  // Optionally: POST /api/chat/sessions to create a new session
};

// In header:
<Button variant="outline" size="sm" onClick={handleNewChat}>
  <Plus className="w-4 h-4 mr-2" /> New Chat
</Button>
```

Add a backend route `DELETE /api/chat/history` that clears all history for the current user (with confirmation dialog in the frontend).

---

### Problem 4.2 — No copy button on messages
**File:** `src/app/chat/page.tsx`  
**Severity:** LOW

**Current state:**  
Users cannot copy AI responses. For a nutrition assistant that generates meal plans and detailed advice, copy functionality is essential.

**Solution:**  
Add a copy button that appears on hover on each assistant message:
```tsx
<div className="relative group">
  <div className="p-4 rounded-2xl rounded-tl-sm bg-muted/50 ...">
    <ReactMarkdown>{msg.content}</ReactMarkdown>
  </div>
  <button
    onClick={() => navigator.clipboard.writeText(msg.content)}
    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted"
  >
    <Copy className="w-3.5 h-3.5" />
  </button>
</div>
```

---

### Problem 4.3 — Sources UI is too minimal
**File:** `src/app/chat/page.tsx`  
**Severity:** LOW

**Current state:**  
Sources are shown as small pills (`IFCT PDF • page 42`) but there is no way to expand them, see the source text excerpt, or understand their relevance score. Users cannot verify where answers come from.

**Solution:**  
Make sources expandable with a collapsible section showing the source text snippet:
```tsx
const [sourcesOpen, setSourcesOpen] = useState(false);

{msg.sources && msg.sources.length > 0 && (
  <div>
    <button 
      onClick={() => setSourcesOpen(!sourcesOpen)}
      className="text-xs text-primary flex items-center gap-1 mt-1"
    >
      <BookOpen className="w-3 h-3" /> {msg.sources.length} sources
      <ChevronDown className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
    </button>
    {sourcesOpen && (
      <div className="mt-2 space-y-2">
        {msg.sources.map((src, i) => (
          <div key={i} className="text-xs bg-muted/30 rounded-lg p-3 border-l-2 border-primary/30">
            <p className="font-medium text-primary">{src.source} — {src.identifier}</p>
            {src.text && <p className="text-muted-foreground mt-1 line-clamp-3">{src.text}</p>}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## 5. Frontend — Profile Page (/profile)

### Problem 5.1 — Missing avatar upload UI
**File:** `src/app/profile/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
The profile page has no avatar. The user is identified only by their initials in the sidebar. There is no way to upload a profile photo.

**Solution:**  
Add avatar upload at the top of the profile page:
```tsx
<div className="flex items-center gap-4 mb-6">
  <label className="relative cursor-pointer group">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
      {user.avatar_url 
        ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        : <span className="text-2xl font-bold text-primary">{user.name.charAt(0)}</span>
      }
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity">
        <Camera className="w-5 h-5 text-white" />
      </div>
    </div>
    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
  </label>
  <div>
    <p className="font-medium">{user.name}</p>
    <p className="text-sm text-muted-foreground">{user.email}</p>
  </div>
</div>
```

Requires `POST /api/auth/avatar` backend endpoint (see Backend section 11.3).

---

### Problem 5.2 — Profile page lacks email field (read-only)
**File:** `src/app/profile/page.tsx`  
**Severity:** LOW

**Current state:**  
The profile form does not show the user's email address at all. Users cannot see what email is associated with their account.

**Solution:**  
Add a read-only email field in the Basic Information section:
```tsx
<div className="space-y-2 col-span-2">
  <Label>Email Address</Label>
  <Input value={user.email} disabled className="bg-muted/40 cursor-not-allowed" />
  <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support to update.</p>
</div>
```

---

### Problem 5.3 — No BMI / health summary display
**File:** `src/app/profile/page.tsx`  
**Severity:** LOW

**Current state:**  
The profile page collects `weight_kg` and `height_cm` but never computes or displays the user's BMI or a simple health summary.

**Solution:**  
Add a computed BMI display in the sidebar panel alongside the nutrition targets:
```tsx
const bmi = formData.weight_kg && formData.height_cm
  ? (formData.weight_kg / ((formData.height_cm / 100) ** 2)).toFixed(1)
  : null;

const bmiCategory = bmi
  ? Number(bmi) < 18.5 ? "Underweight" : Number(bmi) < 25 ? "Normal" : Number(bmi) < 30 ? "Overweight" : "Obese"
  : null;
```

Display with a colour-coded badge: green for Normal, amber for Overweight, red for Obese.

---

## 6. Frontend — Onboarding (/onboarding)

### Problem 6.1 — Only 2 steps covering 4 of 17 fields
**File:** `src/app/onboarding/page.tsx`  
**Severity:** HIGH

**Current state:**  
The onboarding wizard has only 2 steps and collects only: `age`, `sex`, `weight_kg`, `height_cm`, `diet_type`, `life_stage`, `profession`. The profile model has 17 fields including `region_zone`, `conditions`, `glp1_medication`, `energy_score`, `sleep_hours`, `focus_score`, and `daily_budget_inr` — none of which are asked during onboarding.

**Solution:**  
Expand to a 5-step wizard:
- **Step 1:** Basic physiology (age, sex, weight, height) — already exists
- **Step 2:** Lifestyle (diet type, life stage, activity level, region) — partially exists
- **Step 3:** Health conditions (toggle list of conditions, GLP-1 medication)
- **Step 4:** Wellness inputs (energy score 1–5, sleep hours, focus score 1–5)
- **Step 5:** Budget & region (daily budget in INR, region zone, state)

Add animated step transitions using CSS transitions:
```tsx
// Replace step progress bar with labelled dots
<div className="flex items-center gap-2 mb-8">
  {["Physiology", "Lifestyle", "Health", "Wellness", "Budget"].map((label, i) => (
    <React.Fragment key={i}>
      <div className={`flex flex-col items-center gap-1`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
          ${step > i + 1 ? 'bg-primary text-primary-foreground' : step === i + 1 ? 'bg-primary/20 text-primary ring-2 ring-primary' : 'bg-muted text-muted-foreground'}`}>
          {step > i + 1 ? <Check className="w-3.5 h-3.5" /> : i + 1}
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      {i < 4 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-primary' : 'bg-muted'} mt-[-12px]`} />}
    </React.Fragment>
  ))}
</div>
```

---

### Problem 6.2 — Onboarding accessible to logged-out users but saves nothing
**File:** `src/app/onboarding/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
A logged-out user who visits `/onboarding` is shown the form. On submit, the code checks `if (!user)` and redirects to `/login`. The form data is lost. The user has to re-enter everything.

**Solution:**  
Store onboarding data in `localStorage` temporarily:
```tsx
// On each step, save progress
localStorage.setItem("nutrisync_onboarding_draft", JSON.stringify(data));

// On page mount, restore draft
useEffect(() => {
  const draft = localStorage.getItem("nutrisync_onboarding_draft");
  if (draft) setData(JSON.parse(draft));
}, []);

// After successful signup + onboarding save, clear draft
localStorage.removeItem("nutrisync_onboarding_draft");
```

After login, redirect back to `/onboarding` to complete the flow (use `?from=onboarding` in the login redirect).

---

## 7. Frontend — Meal Plan (/meal-plan)

### Problem 7.1 — No meal plan history list
**File:** `src/app/meal-plan/page.tsx`  
**Severity:** HIGH

**Current state:**  
The backend already has `GET /api/meal-plan/history` which returns saved meal plans per user, but the frontend does not display this history. Users who generate a meal plan cannot see their previous plans.

**Solution:**  
Add a sidebar or tab on the meal plan page showing past plans:
```tsx
const [history, setHistory] = useState<any[]>([]);
useEffect(() => {
  mealPlanApi.history(5).then(res => setHistory(res.plans));
}, []);

// Sidebar column showing past plans as clickable cards
<div className="space-y-3">
  <h3 className="text-sm font-medium text-muted-foreground">Recent Plans</h3>
  {history.map(plan => (
    <div key={plan.id} onClick={() => setCurrentPlan(plan)} className="glass-card p-4 cursor-pointer hover:border-primary/30">
      <p className="text-sm font-medium">{plan.days}-day plan</p>
      <p className="text-xs text-muted-foreground">{new Date(plan.created_at).toLocaleDateString()}</p>
      {plan.budget && <p className="text-xs text-muted-foreground">Budget: ₹{plan.budget}/day</p>}
    </div>
  ))}
</div>
```

---

### Problem 7.2 — No PDF / print export for meal plans
**File:** `src/app/meal-plan/page.tsx`  
**Severity:** MEDIUM

**Current state:**  
Generated meal plans are shown as text in the UI but cannot be exported. Users who want to share or print their weekly meal plan have no option.

**Solution:**  
Add a download button that generates a PDF using `window.print()` with a print-specific CSS stylesheet, or use the `jsPDF` library:

```tsx
import jsPDF from "jspdf";

const handleExportPDF = () => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("My NutriSync Meal Plan", 20, 20);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(mealPlanText, 170);
  doc.text(lines, 20, 35);
  doc.save(`nutrisync-meal-plan-${new Date().toISOString().slice(0,10)}.pdf`);
};
```

---

## 8. Frontend — Recipes (/recipes)

### Problem 8.1 — Recipes page is unconfirmed / likely stub
**File:** `src/app/recipes/page.tsx`  
**Severity:** HIGH

**Current state:**  
The recipes page was not fully audited but based on the codebase pattern (a route in the sidebar linking to `/recipes`) it is likely a basic stub. The backend `POST /api/meal-plan/recipe` endpoint exists and accepts `meal_name`, `ingredients`, and `servings` but the frontend likely does not use it effectively.

**Solution:**  
Build a complete recipe crafter page with three sections:
1. **Input section:** Text input for meal name, tag-style ingredient input (add/remove tags), servings slider
2. **Generate button:** Calls `POST /api/meal-plan/recipe`
3. **Recipe card output:** Shows the generated recipe in a formatted card with: title, ingredients table with quantities, step-by-step instructions, nutritional estimate, servings adjuster

Add a "Save Recipe" button that bookmarks the generated recipe to the user's account.

---

## 9. Frontend — Sidebar & Navigation

### Problem 9.1 — No mobile bottom tab bar
**File:** `src/components/sidebar.tsx`  
**Severity:** MEDIUM

**Current state:**  
On mobile, navigation uses a hamburger menu that opens a sheet overlay. This is non-standard for nutrition apps and requires 2 taps to navigate. Standard mobile apps (MyFitnessPal, Cronometer, Healthifyme) use a persistent bottom tab bar.

**Solution:**  
Add a mobile bottom navigation bar in `sidebar.tsx`. Replace the hamburger-only mobile header:
```tsx
{/* Mobile bottom tab bar — replaces sheet trigger */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-t border-border flex items-center justify-around z-40 safe-area-pb">
  {[
    { href: "/", icon: LayoutDashboard, label: "Home" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/tracker", icon: Activity, label: "Track" },
    { href: "/meal-plan", icon: CalendarDays, label: "Meals" },
    { href: "/profile", icon: UserCircle, label: "Profile" },
  ].map(item => {
    const isActive = pathname === item.href;
    return (
      <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 py-2 px-3">
        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={`text-[10px] ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
          {item.label}
        </span>
      </Link>
    );
  })}
</nav>
```

Add `pb-16` to all page content wrappers on mobile to prevent content being hidden behind the tab bar.

---

### Problem 9.2 — Sidebar has no badge counters
**File:** `src/components/sidebar.tsx`  
**Severity:** LOW

**Current state:**  
Navigation items show no counts or badges. For a professional app, unread notification count on an Inbox link or new meal plan suggestions should be visible in the sidebar.

**Solution:**  
Add optional badge props to nav items:
```tsx
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Knowledge Chat", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell, badgeKey: "unreadNotifications" },
  // ...
];
```

Fetch unread notification count on sidebar mount and display as a small red badge: `<span className="ml-auto w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{count}</span>`

---

## 10. Missing Frontend Pages

### Problem 10.1 — No Food Database Explorer (/foods)
**Severity:** CRITICAL — Core feature completely missing

**What's missing:**  
The IFCT database with hundreds of Indian foods, their complete nutrient profiles, food groups, regional data, and disease protocols — is all hidden behind API routes that no page renders. This is the single most valuable dataset in the project and it's invisible to users.

**Solution:**  
Build `src/app/foods/page.tsx` with these sections:

**Section A — Searchable table:**
```
Columns: Name | Food Group | Cal/100g | Protein | Carbs | Fat | Macro Bar
Filters: food_group (dropdown), diet_type (VEG/NON-VEG/VEGAN), search text
Pagination: 20 items per page with next/prev
```

**Section B — Food detail modal/page (click any row):**  
Full nutrient breakdown in a radar chart (8 micronutrients vs RDA %), a bar chart for macro breakdown, and a "Compare" button.

**Section C — Compare mode:**  
Select 2-4 foods and show them side by side in a grouped bar chart (recharts `BarChart` with `groupMode="grouped"`).

Requires updating the backend `GET /api/nutrition/foods` to support `page`, `limit`, and `sort` parameters.

---

### Problem 10.2 — No Nutrition Tracker (/tracker)
**Severity:** HIGH — Core engagement feature missing

**What's missing:**  
There is no daily food logging. Users cannot track what they ate, see their macro progress vs targets, or build the habit loop that makes nutrition apps sticky. This is the most-used feature in every competing app.

**Solution:**  
Build `src/app/tracker/page.tsx` with:
- **Macro rings:** 4 radial progress charts (calories, protein, carbs, fat) using SVG or recharts `RadialBarChart`
- **Meal slots:** Breakfast, Lunch, Dinner, Snack — each expandable, each with an "Add food" button that opens the food search
- **Food search:** Same search from `/foods` but in a modal. On selecting a food, ask for quantity in grams
- **Daily log list:** Stacked list of all logged foods for today
- **Date navigator:** Go back/forward to previous days

Requires new backend endpoints:
- `POST /api/nutrition/daily-log` — log a food entry
- `GET /api/nutrition/daily-log?date=YYYY-MM-DD` — get day's entries
- `DELETE /api/nutrition/daily-log/:id` — remove entry

---

### Problem 10.3 — No Settings Page (/settings)
**Severity:** HIGH

**What's missing:**  
Users have no way to change notification preferences, theme preference, language, measurement units, or account security settings. All of this is expected in any professional web app.

**Solution:**  
Build `src/app/settings/page.tsx` with 4 tabs:

**Account tab:** Name, email (read-only), avatar upload, change password form  
**Preferences tab:** Theme (light/dark/system), language (English/Hindi), units (kg/lbs, cm/ft), default meal plan days  
**Notifications tab:** Email notifications toggle, reminder time picker, weekly summary toggle  
**Privacy tab:** Download your data (exports JSON), delete account (requires typing "DELETE" to confirm)

---

### Problem 10.4 — No Admin Dashboard (/admin)
**Severity:** HIGH

**What's missing:**  
There is no admin interface. No way to see how many users have signed up, how many meal plans were generated, which LLM is being used most, or to manage user accounts. Critical for any production app.

**Solution:**  
Build `src/app/admin/page.tsx`, protected by `is_admin` flag check. Sections:
- **KPI row:** Total users, active users (7-day), total chats, total meal plans — as metric cards
- **User table:** Paginated list with email, name, signup date, last active, chat count, ban button
- **Activity chart:** Line chart of daily active users over 30 days (recharts `LineChart`)
- **LLM usage chart:** Pie chart of Ollama vs Groq usage
- **Top food queries:** Bar chart of most-searched foods

Requires new backend routes (see Backend section 12).

---

### Problem 10.5 — No Data Analysis Page (/analysis)
**Severity:** MEDIUM

**What's missing:**  
The `NutriSync_Analysis.ipynb` notebook is 2.5MB and contains rich exploratory analysis of the IFCT database. This analysis is completely invisible to users. Surfacing it as an interactive page would be a major differentiator.

**Solution:**  
Build `src/app/analysis/page.tsx`. Extract key charts from the notebook and recreate them as interactive recharts visualisations:
- Food group distribution pie chart
- Top 10 protein-rich foods (sorted bar chart)
- Top 10 calcium-rich foods (sorted bar chart)
- Nutrient density heatmap (a 2D grid of food groups vs nutrients)
- RDA gap analysis: which nutrients are hardest to hit on VEG diet vs NON-VEG diet (grouped bar chart)
- Regional dietary character breakdown (India map or bar chart by zone)

---

### Problem 10.6 — No Forgot Password / Reset Password Pages
**Severity:** HIGH (see Auth section 1.3 for backend solution)

Build:
- `src/app/forgot-password/page.tsx` — single email input, submit sends reset email
- `src/app/reset-password/page.tsx` — reads `?token=` from URL, shows new password + confirm password inputs

---

## 11. Backend — Auth Routes

### Problem 11.1 — UserDB missing critical columns
**File:** `backend/auth/database.py`  
**Severity:** HIGH

**Current state:**  
`UserDB` is missing: `is_admin`, `email_verified`, `last_login_at`, `reset_token`, `reset_token_expires`, `avatar_url`.

**Solution:**  
Add to `UserDB`:
```python
is_admin = Column(Boolean, default=False)
email_verified = Column(Boolean, default=False)
last_login_at = Column(DateTime, nullable=True)
reset_token = Column(String(255), nullable=True)
reset_token_expires = Column(DateTime, nullable=True)
avatar_url = Column(String(500), nullable=True)
```

Also update `login()` to set `last_login_at = datetime.utcnow()` on every successful login.

Since you use SQLite and no migrations library is configured, add an Alembic setup:
```bash
pip install alembic
alembic init alembic
# Then create and run migrations instead of using create_all()
```

---

### Problem 11.2 — No user preferences storage
**File:** `backend/auth/database.py`  
**Severity:** HIGH

**Current state:**  
All preferences (theme, language, notification settings) would need to go into `profile_json` alongside medical data. This creates a messy blob with no type safety.

**Solution:**  
Add a separate `UserPreferencesDB` table:
```python
class UserPreferencesDB(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    theme = Column(String(20), default="system")  # "light" | "dark" | "system"
    language = Column(String(10), default="en")
    units = Column(String(10), default="metric")  # "metric" | "imperial"
    notify_email = Column(Boolean, default=True)
    notify_whatsapp = Column(Boolean, default=False)
    reminder_time = Column(String(5), default="08:00")  # HH:MM
    daily_goal_calories = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Add routes:
```python
@router.get("/preferences")
async def get_preferences(user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreferencesDB).filter_by(user_id=user.id).first()
    if not prefs:
        prefs = UserPreferencesDB(user_id=user.id)
        db.add(prefs); db.commit(); db.refresh(prefs)
    return prefs

@router.put("/preferences")
async def update_preferences(data: PreferencesUpdateRequest, user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreferencesDB).filter_by(user_id=user.id).first()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(prefs, field, value)
    db.commit(); db.refresh(prefs)
    return prefs
```

---

### Problem 11.3 — No avatar upload endpoint
**File:** `backend/routes/auth.py`  
**Severity:** MEDIUM

**Solution:**
```python
import shutil, uuid
from fastapi import UploadFile, File

AVATAR_DIR = BASE_DIR / "uploads" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Only JPEG, PNG, and WebP images are allowed")
    if file.size and file.size > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(400, "Image must be under 2MB")
    
    ext = file.filename.split(".")[-1]
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = AVATAR_DIR / filename
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    return {"avatar_url": user.avatar_url}
```

Also serve the uploads directory as a static mount in `main.py`:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=str(BASE_DIR / "uploads")), name="uploads")
```

---

## 12. Backend — Nutrition Routes

### Problem 12.1 — Foods endpoint has hardcoded limit of 50
**File:** `backend/routes/nutrition.py`  
**Severity:** HIGH

**Current state:**  
```python
foods = results.head(50).to_dict(orient="records")
```
This hardcoded `head(50)` means the frontend can never paginate or load more items. For a food database, this is severely limiting.

**Solution:**
```python
@router.get("/foods")
async def search_foods(
    query: str = "",
    diet_type: str = None,
    food_group: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
):
    results = db.search_foods(query, diet_type, food_group)
    total = len(results)
    
    if sort_by in results.columns:
        results = results.sort_values(sort_by, ascending=(sort_order == "asc"))
    
    start = (page - 1) * limit
    paginated = results.iloc[start:start + limit].to_dict(orient="records")
    
    return {
        "foods": paginated,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
```

---

### Problem 12.2 — No food comparison endpoint
**File:** `backend/routes/nutrition.py`  
**Severity:** MEDIUM

**Solution:**
```python
@router.post("/compare")
async def compare_foods(food_names: list[str]):
    """Return nutrient profiles for multiple foods side by side."""
    if len(food_names) > 5:
        raise HTTPException(400, "Maximum 5 foods can be compared at once")
    
    results = []
    for name in food_names:
        food = db.get_food_by_name(name)
        if food:
            results.append(food)
    
    if not results:
        raise HTTPException(404, "No foods found")
    
    return {"foods": results, "count": len(results)}
```

---

### Problem 12.3 — No daily log endpoints
**File:** Missing — need new route file `routes/tracker.py`  
**Severity:** HIGH (required for tracker page)

**Solution:**  
Create `backend/routes/tracker.py`:
```python
router = APIRouter(prefix="/api/nutrition", tags=["Tracker"])

@router.post("/daily-log")
async def log_food(entry: DailyLogEntry, user=Depends(require_user), db=Depends(get_db)):
    log = DailyLogDB(
        user_id=user.id,
        date=entry.date or date.today(),
        food_name=entry.food_name,
        quantity_g=entry.quantity_g,
        meal_slot=entry.meal_slot,
        # Calculate nutrients from quantity
        calories=round(entry.calories_per_100g * entry.quantity_g / 100, 1),
        protein_g=round(entry.protein_per_100g * entry.quantity_g / 100, 1),
    )
    db.add(log); db.commit(); db.refresh(log)
    return log

@router.get("/daily-log")
async def get_daily_log(date: str = None, user=Depends(require_user), db=Depends(get_db)):
    target_date = date or str(date.today())
    entries = db.query(DailyLogDB).filter(
        DailyLogDB.user_id == user.id,
        DailyLogDB.date == target_date
    ).all()
    
    total_calories = sum(e.calories for e in entries)
    total_protein = sum(e.protein_g for e in entries)
    
    return {"entries": entries, "totals": {"calories": total_calories, "protein_g": total_protein}}
```

---

## 13. Backend — Chat Routes

### Problem 13.1 — Chat history is one endless thread
**File:** `backend/routes/chat.py`  
**Severity:** MEDIUM

**Current state:**  
All chat messages for a user are stored in one flat table ordered by `created_at`. There is no concept of conversation sessions. The history endpoint returns the last 50 messages globally, not per-conversation.

**Solution:**  
Add a `session_id` column to `ChatHistoryDB`:
```python
session_id = Column(String(36), nullable=True, index=True)  # UUID
```

Update the chat route to accept and return `session_id`. If not provided, create a new one:
```python
import uuid

@router.post("")
async def chat(request: ChatRequest, ...):
    session_id = request.session_id or str(uuid.uuid4())
    # ... existing RAG code ...
    db.add(ChatHistoryDB(user_id=user.id, session_id=session_id, role="user", ...))
    db.add(ChatHistoryDB(user_id=user.id, session_id=session_id, role="assistant", ...))
    return ChatResponse(..., session_id=session_id)
```

Add a sessions list endpoint:
```python
@router.get("/sessions")
async def list_sessions(user=Depends(require_user), db=Depends(get_db)):
    sessions = db.query(
        ChatHistoryDB.session_id,
        func.min(ChatHistoryDB.created_at).label("started_at"),
        func.count(ChatHistoryDB.id).label("message_count"),
        func.max(ChatHistoryDB.content).label("last_message"),
    ).filter(ChatHistoryDB.user_id == user.id).group_by(ChatHistoryDB.session_id).all()
    return {"sessions": sessions}
```

---

### Problem 13.2 — No per-user rate limiting on chat
**File:** `backend/routes/chat.py`  
**Severity:** HIGH

**Current state:**  
Any authenticated user can send unlimited chat messages. With an Ollama LLM backend, this can saturate the server for all users.

**Solution:**  
Add per-user rate limiting using Redis (or an in-memory counter for dev):
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

@router.post("")
@limiter.limit("30/minute")
async def chat(request: Request, ...):
    # existing code
```

For more precise per-user limits, use a `user_id`-keyed limiter:
```python
def get_user_key(request: Request):
    # Extract user ID from JWT for per-user limiting
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    payload = decode_access_token(token)
    return payload.get("sub", get_remote_address(request))

limiter = Limiter(key_func=get_user_key)
```

---

## 14. Backend — Meal Plan Routes

### Problem 14.1 — No request timeout on meal plan generation
**File:** `backend/routes/meal_plan.py`  
**Severity:** HIGH

**Current state:**  
`generate_meal_plan()` calls the LLM with no timeout. If Ollama hangs or is under load, the request will wait indefinitely, blocking a FastAPI worker thread.

**Solution:**  
Wrap the agent call in a timeout:
```python
import asyncio

@router.post("/generate")
async def generate_meal_plan(request: MealPlanRequest, ...):
    try:
        result = await asyncio.wait_for(
            agent.generate_meal_plan(
                profile=request.user_profile.model_dump(),
                days=request.days,
                budget_per_day=request.budget_per_day_inr,
            ),
            timeout=120.0  # 2 minute max
        )
    except asyncio.TimeoutError:
        raise HTTPException(503, "Meal plan generation timed out. The AI backend may be busy. Please try again.")
    
    # ... rest of existing code ...
```

---

## 15. Backend — Security & Infrastructure

### Problem 15.1 — CORS allows localhost only
**File:** `backend/config.py`  
**Severity:** HIGH

**Current state:**  
`CORS_ORIGINS: list[str] = ["http://localhost:3001", "http://localhost:8000", "http://localhost:3000"]`  
This is fine for development but will block all requests in production when the frontend is deployed to Vercel or a custom domain.

**Solution:**  
Make CORS origins configurable via environment variable:
```python
CORS_ORIGINS: list[str] = ["http://localhost:3000"]
CORS_ORIGINS_EXTRA: str = ""  # Comma-separated additional origins from .env

@property
def all_cors_origins(self) -> list[str]:
    extras = [o.strip() for o in self.CORS_ORIGINS_EXTRA.split(",") if o.strip()]
    return self.CORS_ORIGINS + extras
```

In `.env.example`:
```
CORS_ORIGINS_EXTRA=https://nutrisync.vercel.app,https://aaharai.com
```

---

### Problem 15.2 — SQLite is not production-ready
**File:** `backend/config.py`, `backend/auth/database.py`  
**Severity:** MEDIUM

**Current state:**  
SQLite with `check_same_thread: False` works fine for a single-user dev environment but will cause data corruption under concurrent writes in production. The implementation plan specifies PostgreSQL (Supabase).

**Solution:**  
Make the database engine configurable. The SQLAlchemy code doesn't need to change — only the URL:
```python
# In config.py:
DATABASE_URL: str = f"sqlite:///{SQLITE_DB_PATH}"  # default for dev
# In production .env:
# DATABASE_URL=postgresql://user:password@host/dbname

# In database.py:
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,  # Verify connection before use
    pool_size=10,         # Connection pool for PostgreSQL
    max_overflow=20,
)
```

Add Alembic for migrations so you can evolve the schema without dropping and recreating tables.

---

### Problem 15.3 — No admin routes exist
**Severity:** HIGH

**Solution:**  
Create `backend/routes/admin.py`:
```python
from auth.dependencies import require_admin  # New dependency

router = APIRouter(prefix="/api/admin", tags=["Admin"])

def require_admin(user: UserDB = Depends(require_user)):
    if not user.is_admin:
        raise HTTPException(403, "Admin access required")
    return user

@router.get("/users")
async def list_users(
    page: int = 1, limit: int = 20,
    search: str = "",
    admin=Depends(require_admin), db=Depends(get_db)
):
    query = db.query(UserDB)
    if search:
        query = query.filter(UserDB.email.contains(search) | UserDB.name.contains(search))
    total = query.count()
    users = query.offset((page-1)*limit).limit(limit).all()
    return {"users": [{"id": u.id, "email": u.email, "name": u.name, "created_at": u.created_at, "is_active": u.is_active} for u in users], "total": total}

@router.get("/stats")
async def platform_stats(admin=Depends(require_admin), db=Depends(get_db)):
    return {
        "total_users": db.query(UserDB).count(),
        "total_chats": db.query(ChatHistoryDB).count(),
        "total_meal_plans": db.query(MealPlanDB).count(),
        "users_last_7_days": db.query(UserDB).filter(UserDB.created_at >= datetime.utcnow() - timedelta(days=7)).count(),
    }

@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: int, admin=Depends(require_admin), db=Depends(get_db)):
    user = db.query(UserDB).get(user_id)
    if not user: raise HTTPException(404, "User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"is_active": user.is_active}
```

---

## 16. Database Layer

### Problem 16.1 — No DailyLogDB table
**File:** `backend/auth/database.py`  
**Severity:** HIGH (required for tracker feature)

**Solution:**
```python
class DailyLogDB(Base):
    __tablename__ = "daily_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    log_date = Column(String(10), nullable=False, index=True)  # "YYYY-MM-DD"
    meal_slot = Column(String(20), default="any")  # breakfast/lunch/dinner/snack
    food_name = Column(String(255), nullable=False)
    food_group = Column(String(100), nullable=True)
    quantity_g = Column(Float, nullable=False)
    calories = Column(Float, default=0)
    protein_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    fibre_g = Column(Float, default=0)
    logged_at = Column(DateTime, default=datetime.utcnow)
```

---

### Problem 16.2 — No BookmarkDB table
**File:** `backend/auth/database.py`  
**Severity:** MEDIUM

**Solution:**
```python
class BookmarkDB(Base):
    __tablename__ = "bookmarks"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    item_type = Column(String(20), nullable=False)  # "food" | "meal_plan" | "recipe"
    item_name = Column(String(255), nullable=False)
    item_snapshot_json = Column(Text, default="{}")  # Full item data snapshot
    created_at = Column(DateTime, default=datetime.utcnow)
```

Routes:
```python
@router.post("/bookmarks")
@router.get("/bookmarks")
@router.delete("/bookmarks/{bookmark_id}")
```

---

### Problem 16.3 — MealPlanDB and ChatHistoryDB have no foreign key constraints
**File:** `backend/auth/database.py`  
**Severity:** LOW

**Current state:**  
`user_id` in `MealPlanDB` and `ChatHistoryDB` is `Column(Integer, nullable=True)` with no `ForeignKey` reference. This means orphaned records can exist and cascade deletes won't work.

**Solution:**
```python
from sqlalchemy import ForeignKey

class MealPlanDB(Base):
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

class ChatHistoryDB(Base):
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
```

This enables `ON DELETE CASCADE` so when a user account is deleted, all their data is automatically cleaned up.

---

## 17. API Client (lib/api.ts)

### Problem 17.1 — No admin API functions
**File:** `src/lib/api.ts`  
**Severity:** HIGH

**Solution:**  
Add admin API functions:
```ts
export const adminApi = {
  getUsers: (page = 1, limit = 20, search = "") =>
    apiFetch(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  
  getStats: () => apiFetch("/api/admin/stats"),
  
  toggleUserActive: (userId: number) =>
    apiFetch(`/api/admin/users/${userId}/toggle-active`, { method: "PUT" }),
  
  deleteUser: (userId: number) =>
    apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
};
```

---

### Problem 17.2 — No tracker API functions
**File:** `src/lib/api.ts`  
**Severity:** HIGH

**Solution:**
```ts
export const trackerApi = {
  logFood: (entry: { food_name: string; quantity_g: number; meal_slot: string; date?: string; calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) =>
    apiFetch("/api/nutrition/daily-log", { method: "POST", body: JSON.stringify(entry) }),
  
  getDailyLog: (date?: string) =>
    apiFetch(`/api/nutrition/daily-log${date ? `?date=${date}` : ""}`),
  
  deleteLogEntry: (id: number) =>
    apiFetch(`/api/nutrition/daily-log/${id}`, { method: "DELETE" }),
  
  getWeeklySummary: () => apiFetch("/api/nutrition/weekly-summary"),
};
```

---

### Problem 17.3 — No preferences API functions
**File:** `src/lib/api.ts`  
**Severity:** MEDIUM

**Solution:**
```ts
export const preferencesApi = {
  get: () => apiFetch("/api/auth/preferences"),
  update: (data: Partial<UserPreferences>) =>
    apiFetch("/api/auth/preferences", { method: "PUT", body: JSON.stringify(data) }),
};
```

---

### Problem 17.4 — Grocery list API endpoint is incorrectly constructed
**File:** `src/lib/api.ts`  
**Severity:** MEDIUM

**Current state:**
```ts
grocery: (mealPlanText: string, days = 7) =>
  apiFetch(`/api/meal-plan/grocery?meal_plan_text=${encodeURIComponent(mealPlanText)}&days=${days}`, {
    method: "POST",
  }),
```

A `POST` request with a body serialized as query parameters is incorrect and will fail for long meal plan text (URL length limits). This is also inconsistent with the FastAPI route which expects `meal_plan_text` as a body parameter.

**Solution:**
```ts
grocery: (mealPlanText: string, days = 7) =>
  apiFetch("/api/meal-plan/grocery", {
    method: "POST",
    body: JSON.stringify({ meal_plan_text: mealPlanText, days }),
  }),
```

Update the FastAPI route accordingly:
```python
class GroceryRequest(BaseModel):
    meal_plan_text: str
    days: int = 7

@router.post("/grocery")
async def generate_grocery_list(request: GroceryRequest):
    ...
```

---

## 18. UI Design System

### Problem 18.1 — Font is generic (Inter)
**File:** `src/app/layout.tsx`, `globals.css`  
**Severity:** MEDIUM

**Current state:**  
`--font-sans: var(--font-inter)` — Inter is the most overused font in the design world. It conveys no personality for a nutrition app targeting Indian users.

**Solution:**  
Replace with Plus Jakarta Sans (modern, works well for Indian content) + DM Sans for body:
```tsx
// layout.tsx
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";

const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading", weight: ["500", "600", "700"] });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500"] });
```

```css
/* globals.css */
h1, h2, h3, h4 { font-family: var(--font-heading); }
body { font-family: var(--font-body); }
```

---

### Problem 18.2 — No colour coding for nutrition data
**File:** `globals.css`  
**Severity:** MEDIUM

**Current state:**  
All nutrition values use the same green primary colour. Calories, protein, carbs, and fat should have distinct colours so users can scan data tables and charts instantly.

**Solution:**  
Add semantic nutrition colour variables to `globals.css`:
```css
:root {
  --color-calories: #E07B39;   /* amber-orange */
  --color-protein:  #3B82F6;   /* blue */
  --color-carbs:    #F59E0B;   /* yellow */
  --color-fat:      #A855F7;   /* purple */
  --color-fibre:    #22C55E;   /* green */
  --color-iron:     #EF4444;   /* red */
  --color-calcium:  #06B6D4;   /* cyan */
}
```

Use these consistently across charts, progress bars, and food detail displays.

---

### Problem 18.3 — No macro progress ring component
**Severity:** MEDIUM

**Current state:**  
The dashboard shows static number cards with no visual progress indication. The most recognisable UI pattern in nutrition apps is the circular macro progress ring.

**Solution:**  
Create `src/components/macro-ring.tsx`:
```tsx
interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  color: string;
  unit: string;
  size?: number;
}

export function MacroRing({ label, current, target, color, unit, size = 80 }: MacroRingProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="text-center" style={{ marginTop: -size * 0.6 }}>
        <p className="text-xs font-semibold" style={{ color }}>{Math.round(current)}</p>
        <p className="text-[10px] text-muted-foreground">/{target}{unit}</p>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
```

---

## 19. Data Display — Food & Nutrition

### Problem 19.1 — IFCT food data is completely hidden
**Severity:** CRITICAL

**What to build:**  
The `AaharAI_NutriSync_Enhanced.xlsx` and `IFCT.pdf` are loaded into memory by `database/loader.py` and exposed via `/api/nutrition/foods`. But no frontend page renders this data in a user-friendly way. Build the foods explorer page (Problem 10.1) as the primary solution.

**Quick win — add food search to the chat page:**  
Add a "Browse Foods" quick button below the chat input that opens a search modal. This surfaces the data without requiring a full new page.

---

### Problem 19.2 — Analysis notebook not surfaced
**Severity:** MEDIUM

**Solution:**  
Run these commands to extract chart-ready data from the notebook:
```bash
pip install nbconvert jupyter
jupyter nbconvert --to script NutriSync_Analysis.ipynb
```

Then add backend routes that return the pre-computed analysis as JSON:
```python
@router.get("/analysis/food-groups")
async def food_group_distribution():
    return {"data": db.food[["Food Group"]].value_counts().to_dict()}

@router.get("/analysis/top-protein-foods")
async def top_protein_foods():
    return {"data": db.food.nlargest(10, "Protein (g)")[["Food Name", "Protein (g)"]].to_dict("records")}
```

---

## 20. DevOps & Deployment

### Problem 20.1 — Docker Compose does not include frontend
**File:** `docker-compose.yml`  
**Severity:** MEDIUM

**Current state:**  
`docker-compose.yml` likely only configures the backend service. The frontend requires a separate build and serve step.

**Solution:**  
Add a frontend service to `docker-compose.yml`:
```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    env_file: .env
```

Create `frontend/Dockerfile.frontend`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

### Problem 20.2 — No GitHub Actions CI/CD pipeline
**Severity:** MEDIUM

**Solution:**  
Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r backend/requirements.txt --break-system-packages
      - run: cd backend && python -m pytest tests/ -v

  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd frontend && npm ci && npm run lint && npm run build
```

---

### Problem 20.3 — `.env` file with real secrets may be committed
**File:** `backend/.env.example`  
**Severity:** HIGH

**Current state:**  
`.env.example` exists (good) but it's unclear if `.env` itself is in `.gitignore`. The hardcoded `SECRET_KEY` in `config.py` suggests that the actual `.env` may not contain one.

**Solution:**  
Verify and ensure `.gitignore` in the root contains:
```
.env
backend/.env
*.db
backend/nutrisync.db
data/chroma_db/
uploads/
__pycache__/
.next/
node_modules/
```

Run `git rm --cached backend/.env` if the file was previously committed to purge it from history.

---

## Priority Order — Recommended Implementation Sequence

| Priority | Task | Files Affected | Estimated Effort |
|----------|------|----------------|-----------------|
| 1 | Protected routes + ProtectedRoute component | `layout.tsx`, new component | 2 hours |
| 2 | JWT refresh + 401 interceptor | `api.ts`, `routes/auth.py` | 3 hours |
| 3 | Food database explorer page | New `app/foods/page.tsx`, update nutrition routes | 6 hours |
| 4 | Admin routes + admin dashboard | New `routes/admin.py`, new `app/admin/page.tsx` | 8 hours |
| 5 | Forgot/reset password flow | New routes + pages | 4 hours |
| 6 | Nutrition tracker page | New `app/tracker/page.tsx`, new DB table + routes | 8 hours |
| 7 | Settings page | New `app/settings/page.tsx`, preferences table | 5 hours |
| 8 | Rate limiting on all routes | Install slowapi, decorate routes | 2 hours |
| 9 | Mobile bottom tab bar | Update `sidebar.tsx` | 2 hours |
| 10 | Macro rings on dashboard | New `MacroRing` component | 3 hours |
| 11 | Expanded onboarding (5 steps) | Rewrite `onboarding/page.tsx` | 4 hours |
| 12 | Chat sessions support | Update `ChatHistoryDB`, update routes | 4 hours |
| 13 | Analysis page | New `app/analysis/page.tsx`, new analysis routes | 6 hours |
| 14 | PostgreSQL migration | Update `config.py`, add Alembic | 3 hours |
| 15 | Docker Compose full stack | Update `docker-compose.yml` | 2 hours |

---

*Generated by Claude (Sonnet 4.6) — April 2026*  
*Repo: github.com/Tharungowdapr/Nutritional-Assistant*