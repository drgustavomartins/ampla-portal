import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

interface AuthContextType {
  user: SafeUser | null;
  login: (user: SafeUser, token?: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isStudent: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((u: SafeUser, token?: string) => {
    setUser(u);
    if (token) {
      localStorage.setItem("ampla_token", token);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("ampla_token");
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("ampla_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
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

  const isAdmin = user?.role === "admin";
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
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isStudent, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
