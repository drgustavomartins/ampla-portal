import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

interface AuthContextType {
  user: SafeUser | null;
  login: (user: SafeUser) => void;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((u: SafeUser) => {
    setUser(u);
    // Token is now stored in httpOnly cookie by the server — no localStorage needed
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    // Clear legacy localStorage token if present
    localStorage.removeItem("ampla_token");
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
  }, []);

  // Restore session on mount via httpOnly cookie
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers: {
        // Fallback: send legacy Bearer token if cookie not yet set (transition period)
        ...(localStorage.getItem("ampla_token")
          ? { Authorization: `Bearer ${localStorage.getItem("ampla_token")}` }
          : {}),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          // Clean up legacy localStorage token
          localStorage.removeItem("ampla_token");
        }
      })
      .catch(() => {
        localStorage.removeItem("ampla_token");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isStudent = user?.role === "student";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin, isStudent, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
