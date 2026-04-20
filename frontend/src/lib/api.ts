/**
 * AaharAI NutriSync — API Client
 * Centralized fetch wrapper with JWT management.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export { API_BASE };

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

/** Core fetch wrapper with automatic token refresh on 401 */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true
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
    // Handle 401 Unauthorized with automatic token refresh
    if (res.status === 401 && retry) {
      try {
        // Attempt silent token refresh
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setToken(refreshData.access_token);
          // Retry original request with new token
          return apiFetch<T>(path, options, false);
        } else {
          // Refresh failed — clear token and redirect to login
          clearToken();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new ApiError(401, "Session expired. Please log in again.");
        }
      } catch (err: any) {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw err;
      }
    }

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

  refresh: () =>
    apiFetch("/api/auth/refresh", { method: "POST" }),

  me: () => apiFetch("/api/auth/me"),

  updateProfile: (data: Record<string, any>) =>
    apiFetch("/api/auth/profile", { method: "PUT", body: JSON.stringify(data) }),

  forgotPassword: (data: { email: string }) =>
    apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),

  resetPassword: (data: { token: string; new_password: string }) =>
    apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiFetch("/api/auth/change-password", { method: "PUT", body: JSON.stringify(data) }),
};

// ── Chat ──
export const chatApi = {
  send: (message: string, userProfile?: any, sessionId?: string) =>
    apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, user_profile: userProfile, session_id: sessionId }),
    }),

  history: (limit = 50) => apiFetch(`/api/chat/history?limit=${limit}`),

  listSessions: (limit = 20) => apiFetch(`/api/chat/sessions?limit=${limit}`),

  deleteSession: (sessionId: string) =>
    apiFetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" }),

  stream: (message: string, userProfile?: any, sessionId?: string) => {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    return fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, user_profile: userProfile, session_id: sessionId }),
    });
  },
};

// ── Nutrition ──
export const nutritionApi = {
  // Main search function (for spreadsheet)
  search: (
    query = "",
    dietType?: string,
    foodGroup?: string,
    region?: string,
    page = 1,
    limit = 500,
    sortBy = "Food Name",
    sortOrder = "asc"
  ) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (dietType) params.set("diet_type", dietType);
    if (foodGroup) params.set("food_group", foodGroup);
    if (region) params.set("region", region);
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort_by", sortBy);
    params.set("sort_order", sortOrder);
    return apiFetch(`/api/nutrition/foods?${params}`);
  },

  // Legacy alias for tracker compatibility
  searchFoods: (
    query = "",
    dietType?: string,
    foodGroup?: string,
    region?: string,
    page = 1,
    limit = 20,
    sortBy = "Food Name",
    sortOrder = "asc"
  ) => nutritionApi.search(query, dietType, foodGroup, region, page, limit, sortBy, sortOrder),

  getFood: (name: string) => apiFetch(`/api/nutrition/foods/${encodeURIComponent(name)}`),

  compareFoods: (foodNames: string[]) =>
    apiFetch("/api/nutrition/foods/compare", {
      method: "POST",
      body: JSON.stringify({ food_names: foodNames }),
    }),

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

  grocery: (mealPlanText: string, days = 7, numPeople = 1) =>
    apiFetch("/api/meal-plan/grocery", {
      method: "POST",
      body: JSON.stringify({ meal_plan_text: mealPlanText, days, num_people: numPeople }),
    }),

  recipe: (data: { instructions: string }) =>
    apiFetch("/api/meal-plan/recipe", { method: "POST", body: JSON.stringify(data) }),
};

// ── Recipes ──
export const recipesApi = {
  save: (recipe: any) =>
    apiFetch("/api/recipes/save", { method: "POST", body: JSON.stringify(recipe) }),

  list: (limit = 20) => apiFetch(`/api/recipes/list?limit=${limit}`),

  get: (id: string | number) => apiFetch(`/api/recipes/${id}`),

  delete: (id: number) =>
    apiFetch(`/api/recipes/${id}`, { method: "DELETE" }),

  history: (limit = 10) => apiFetch(`/api/recipes/history/list?limit=${limit}`),
};

// ── Health ──
export const healthApi = {
  check: () => apiFetch("/api/health"),
};

// ── Admin ──
export const adminApi = {
  getStats: () => apiFetch("/api/admin/stats"),

  listUsers: (page = 1, limit = 20) =>
    apiFetch(`/api/admin/users?page=${page}&limit=${limit}`),

  getUserActivity: (userId: number) =>
    apiFetch(`/api/admin/users/${userId}/activity`),

  getUsageStats: () => apiFetch("/api/admin/usage"),

  toggleUserAdmin: (userId: number) =>
    apiFetch(`/api/admin/users/${userId}/toggle-admin`, { method: "POST" }),
};

// ── Tracker ──
export const trackerApi = {
  logFood: (mealSlot: string, foodName: string, quantityG: number = 100) =>
    apiFetch("/api/tracker/log-food", {
      method: "POST",
      body: JSON.stringify({ meal_slot: mealSlot, food_name: foodName, quantity_g: quantityG }),
    }),

  getDailySummary: (logDate: string) =>
    apiFetch(`/api/tracker/daily/${logDate}`),

  getSummary: (days = 7) => apiFetch(`/api/tracker/summary?days=${days}`),

  deleteLog: (logId: number) =>
    apiFetch(`/api/tracker/logs/${logId}`, { method: "DELETE" }),
};

// ── Analysis ──
export const analysisApi = {
  getFoodGroupStats: () => apiFetch("/api/analysis/food-group-stats"),

  getVegNonvegStats: () => apiFetch("/api/analysis/veg-nonveg"),

  getTopProteinFoods: (limit = 10) => apiFetch(`/api/analysis/top-protein-foods?limit=${limit}`),

  getIronAnalysis: () => apiFetch("/api/analysis/iron-analysis"),

  getB12Analysis: () => apiFetch("/api/analysis/b12-analysis"),

  getGIDistribution: () => apiFetch("/api/analysis/gi-distribution"),

  getCalorieDistribution: () => apiFetch("/api/analysis/calorie-distribution"),

  getNutrientSummary: () => apiFetch("/api/analysis/nutrient-summary"),
  getPersonalAnalysis: () => apiFetch("/api/analysis/personal"),
  getIntelligence: () => apiFetch("/api/analysis/intelligence"),
};
