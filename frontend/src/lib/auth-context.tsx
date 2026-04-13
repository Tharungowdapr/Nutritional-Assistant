"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, setToken, clearToken, ApiError } from "@/lib/api";

interface User {
  id: number;
  email: string;
  name: string;
  profile: Record<string, any>;
  profile_completion: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Record<string, any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing token on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("nutrisync_token") : null;
    if (token) {
      authApi
        .me()
        .then((data: any) => setUser(data))
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data: any = await authApi.login({ email, password });
    setToken(data.access_token);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const data: any = await authApi.signup({ name, email, password });
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const updateProfile = async (profileData: Record<string, any>) => {
    const data: any = await authApi.updateProfile(profileData);
    // Profile endpoint returns UserResponse directly (not wrapped in .user like login/signup)
    const user: User = data as User;
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
