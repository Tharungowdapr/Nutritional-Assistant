/**
 * AaharAI NutriSync — API Client
 * Centralized fetch wrapper with JWT management.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Get stored JWT token */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nutrisync_token");
}

/** Set JWT token */
export function setToken(token: string) {
  localStorage.setItem("nutrisync_token", token);
}

/** Remove JWT token */
export function clearToken() {
  localStorage.removeItem("nutrisync_token");
}

/** Core fetch wrapper */
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ──
export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    apiFetch("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: () => apiFetch("/api/auth/me"),

  updateProfile: (data: Record<string, any>) =>
    apiFetch("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
};

// ── Chat ──
export const chatApi = {
  send: (message: string, userProfile?: any) =>
    apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, user_profile: userProfile }),
    }),

  history: (limit = 50) => apiFetch(`/api/chat/history?limit=${limit}`),
};

// ── Nutrition ──
export const nutritionApi = {
  searchFoods: (query = "", dietType?: string, foodGroup?: string) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (dietType) params.set("diet_type", dietType);
    if (foodGroup) params.set("food_group", foodGroup);
    return apiFetch(`/api/nutrition/foods?${params}`);
  },

  getFood: (name: string) => apiFetch(`/api/nutrition/foods/${encodeURIComponent(name)}`),

  computeTargets: (profile: any) =>
    apiFetch("/api/nutrition/targets", { method: "POST", body: JSON.stringify(profile) }),

  foodGroups: () => apiFetch("/api/nutrition/food-groups"),
  diseases: () => apiFetch("/api/nutrition/diseases"),
  regions: () => apiFetch("/api/nutrition/regions"),
};

// ── Meal Plan ──
export const mealPlanApi = {
  generate: (data: { user_profile: any; days?: number; budget_per_day_inr?: number }) =>
    apiFetch("/api/meal-plan/generate", { method: "POST", body: JSON.stringify(data) }),

  history: (limit = 10) => apiFetch(`/api/meal-plan/history?limit=${limit}`),

  grocery: (mealPlanText: string, days = 7) =>
    apiFetch(`/api/meal-plan/grocery?meal_plan_text=${encodeURIComponent(mealPlanText)}&days=${days}`, {
      method: "POST",
    }),

  recipe: (data: { meal_name: string; ingredients: string[]; servings?: number }) =>
    apiFetch("/api/meal-plan/recipe", { method: "POST", body: JSON.stringify(data) }),
};

// ── Health ──
export const healthApi = {
  check: () => apiFetch("/api/health"),
};
