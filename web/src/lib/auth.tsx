// src/lib/auth.tsx — auth context (user, login, logout).
import { createContext, useContext, useEffect, useState } from 'react';
import { api, setAuth, clearAuth, getToken } from './api';

type User = { id: number; username: string; name?: string; role: string };
type Ctx = { user: User | null; login: (u: string, p: string) => Promise<void>; logout: () => void; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, login: async () => {}, logout: () => {}, loading: true });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (getToken()) setLoading(false); else setLoading(false); }, []);

  const login = async (username: string, password: string) => {
    const d = await api('POST', '/api/auth/login', { username, password });
    setAuth(d.token, d.refreshToken);
    setUser(d.user);
  };
  const logout = async () => {
    const r = localStorage.getItem('mas_refresh');
    try { if (r) await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: r }) }); } catch {}
    clearAuth(); setUser(null);
  };

  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
}
