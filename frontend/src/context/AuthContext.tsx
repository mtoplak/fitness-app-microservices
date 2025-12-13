import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api, getTokenPayload } from "../lib/api";

type User = { id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: "admin" | "trainer" | "member" } | null;

type TokenInfo = {
  sub: string;      // User ID
  name: string;     // User's full name
  email: string;    // User's email
  role: string;     // User's role
  iat: number;      // Issued at timestamp
  exp: number;      // Expiration timestamp
  expiresAt: Date;  // Expiration as Date
  isExpired: boolean;
} | null;

type AuthContextValue = {
  user: User;
  loading: boolean;
  tokenInfo: TokenInfo;
  login: (email: string, password: string) => Promise<{ id: string; email: string; firstName?: string; lastName?: string; fullName: string; address?: string; role: "admin" | "trainer" | "member" }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; address?: string; role?: "admin" | "trainer" | "member" }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Get token info from JWT
  const getTokenInfo = useCallback((): TokenInfo => {
    const payload = getTokenPayload();
    if (!payload) return null;
    
    const expiresAt = new Date(payload.exp * 1000);
    const isExpired = Date.now() >= payload.exp * 1000;
    
    return {
      ...payload,
      expiresAt,
      isExpired,
    };
  }, []);

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(getTokenInfo);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setUser(null);
    setTokenInfo(null);
  }, []);

  useEffect(() => {
    // Listen for auth logout events from API
    const handleAuthLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    
    // Update token info
    setTokenInfo(getTokenInfo());
    
    api
      .me()
      .then((u) => setUser(u as User))
      .catch(() => {
        localStorage.removeItem("auth_token");
        setUser(null);
        setTokenInfo(null);
      })
      .finally(() => setLoading(false));
  }, [getTokenInfo]);

  // Check token expiration periodically
  useEffect(() => {
    if (!user) return;

    const checkExpiration = () => {
      const info = getTokenInfo();
      if (info?.isExpired) {
        logout();
      } else {
        setTokenInfo(info);
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [user, getTokenInfo, logout]);

  async function login(email: string, password: string) {
    const res = await api.login({ email, password });
    localStorage.setItem("auth_token", res.token);
    const userData = res.user as User;
    setUser(userData);
    setTokenInfo(getTokenInfo());
    return userData!;
  }

  async function register(data: { email: string; password: string; firstName: string; lastName: string; address?: string; role?: "admin" | "trainer" | "member" }) {
    const res = await api.register(data);
    localStorage.setItem("auth_token", res.token);
    setUser(res.user as User);
    setTokenInfo(getTokenInfo());
  }

  const value = useMemo(() => ({ user, loading, tokenInfo, login, register, logout }), [user, loading, tokenInfo, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

