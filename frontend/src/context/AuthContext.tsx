import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';

export type Role = 'candidate' | 'hr' | 'admin';
export interface AuthUser { id: string; name: string; email: string; role: Role; isVerified: boolean; }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'candidate' | 'hr') => Promise<void>;
  resendOtp: (email: string, purpose: 'register' | 'reset_password') => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aptura_token');
    if (!token) { setLoading(false); return; }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('aptura_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('aptura_token', res.data.token);
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string, role: 'candidate' | 'hr') {
    await api.post('/auth/register', { name, email, password, role });
  }

  async function resendOtp(email: string, purpose: 'register' | 'reset_password') {
    await api.post('/auth/resend-otp', { email, purpose });
  }

  async function verifyOtp(email: string, code: string) {
    const res = await api.post('/auth/verify-otp', { email, code });
    localStorage.setItem('aptura_token', res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem('aptura_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
