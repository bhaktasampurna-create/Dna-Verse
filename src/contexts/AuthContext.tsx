import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, logoutFirebase } from '../lib/firebase.ts';

export interface AppUserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  institution: string;
  researchInterest: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  emailVerified: boolean;
  createdAt?: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUserProfile | null;
  loading: boolean;
  syncError: string | null;
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  getToken: () => Promise<string | null>;
  syncProfile: (extra?: { fullName?: string; institution?: string; researchInterest?: string }) => Promise<void>;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  // Hold token in memory only (never localStorage)
  const tokenRef = useRef<string | null>(null);

  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      tokenRef.current = null;
      return null;
    }
    const token = await user.getIdToken();
    tokenRef.current = token;
    return token;
  }, []);

  const syncProfile = useCallback(
    async (extra?: { fullName?: string; institution?: string; researchInterest?: string }) => {
      const user = auth.currentUser;
      if (!user) {
        setAppUser(null);
        return;
      }
      const token = await user.getIdToken(true);
      tokenRef.current = token;
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(extra || {}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync user account.');
      }
      setAppUser(data.user);
      setSyncError(null);
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        tokenRef.current = null;
        setAppUser(null);
        setSyncError(null);
        setLoading(false);
        return;
      }

      try {
        await syncProfile();
      } catch (err: any) {
        console.error('Auth sync error:', err);
        setSyncError(err.message || 'Unable to verify account session.');
        setAppUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [syncProfile]);

  const apiFetch = useCallback(async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Authentication required. Please sign in.');
    }
    const token = await user.getIdToken();
    tokenRef.current = token;

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      return json as T;
    }

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return (await res.text()) as unknown as T;
  }, []);

  const logout = useCallback(async () => {
    tokenRef.current = null;
    setAppUser(null);
    setDemoMode(false);
    await logoutFirebase();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        syncError,
        demoMode,
        setDemoMode,
        getToken,
        syncProfile,
        apiFetch,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
