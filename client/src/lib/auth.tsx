import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "@shared/schema";
import { isLifetimePlan } from "@shared/access-rules";
import { queryClient } from "./queryClient";

type SafeUser = Omit<User, "password">;

interface AuthContextType {
  user: SafeUser | null;
  login: (user: SafeUser, token?: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStudent: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number | null;
  isAccessExpired: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

function getStoredToken(): string | null {
  return localStorage.getItem("ampla_token");
}

function saveToken(token: string) {
  localStorage.setItem("ampla_token", token);
}

function clearToken() {
  localStorage.removeItem("ampla_token");
}

async function fetchMe(): Promise<{ user: SafeUser; token?: string } | null> {
  try {
    const headers: Record<string, string> = {};
    const stored = getStoredToken();
    if (stored) headers["Authorization"] = `Bearer ${stored}`;

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((u: SafeUser, token?: string) => {
    setUser(u);
    if (token) saveToken(token);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    clearToken();
    queryClient.clear();
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
  }, []);

  // Initial session restore on mount
  useEffect(() => {
    fetchMe()
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          // Keep token fresh in localStorage (primary iOS PWA auth)
          if (data.token) saveToken(data.token);
        } else {
          clearToken();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Re-validate session when app comes back to foreground (critical for iOS PWA)
  useEffect(() => {
    let lastCheck = Date.now();

    const revalidate = async () => {
      // Throttle: no more than once every 10 seconds
      if (Date.now() - lastCheck < 10_000) return;
      lastCheck = Date.now();

      const data = await fetchMe();
      if (!data?.user) {
        // Session expired — clear everything so user sees login screen
        setUser(null);
        clearToken();
        queryClient.clear();
      } else {
        // Session still valid — update token to keep it fresh
        if (data.token) saveToken(data.token);
        // Refresh lesson/module data with valid auth
        queryClient.invalidateQueries({ queryKey: ["/api/lessons"] });
        queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidate();
    };
    const onFocus = () => revalidate();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isStudent = user?.role === "student";
  // Trial flag: role 'trial' OU student rebaixado (planKey null/tester).
  // Trial é vitalício para navegação; conteúdo continua gated (2 aulas/módulo).
  const isTrial = user?.role === "trial"
    || (user?.role === "student" && !isLifetimePlan(user?.planKey));
  const trialDaysLeft = isTrial && user?.accessExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.accessExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  // Trial vitalício nunca "expira" para navegação — apenas se accessExpiresAt explícito ficar no passado.
  const isTrialExpired = isTrial && trialDaysLeft !== null && trialDaysLeft <= 0;
  // Access expiration: lifetime plans never expire; trial vitalício sem data tampouco.
  const isAccessExpired = (() => {
    if (!user || isAdmin || isSuperAdmin) return false;
    if (isLifetimePlan(user.planKey)) return false;
    if (!user.accessExpiresAt) return false; // trial vitalício
    return new Date(user.accessExpiresAt).getTime() < Date.now();
  })();

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
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isSuperAdmin, isStudent, isTrial, isTrialExpired, trialDaysLeft, isAccessExpired, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
