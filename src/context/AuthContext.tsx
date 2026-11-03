'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfileData: (fullName: string, newPassword?: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILES: Record<string, Profile> = {
  'admin@avancepos.com': {
    id: 'demo-admin-id',
    email: 'admin@avancepos.com',
    full_name: 'Administrador Principal',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
  'operador@avancepos.com': {
    id: 'demo-operador-id',
    email: 'operador@avancepos.com',
    full_name: 'Operador de Caja',
    role: 'operador',
    created_at: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar perfil desde Supabase
  const loadSupabaseProfile = async (userId: string, email: string) => {
    try {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        return data as Profile;
      } else {
        // Si no existe aún en profiles, crear uno básico
        const fallback: Profile = {
          id: userId,
          email,
          full_name: email.split('@')[0],
          role: 'operador',
        };
        await supabase.from('profiles').insert(fallback);
        return fallback;
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Modo Demo local con localStorage
      const savedDemoUser = localStorage.getItem('demo_pos_user');
      if (savedDemoUser) {
        try {
          const parsed = JSON.parse(savedDemoUser);
          setUser({ id: parsed.id, email: parsed.email } as User);
          setProfile(parsed);
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
      return;
    }

    // Inicializar sesión Supabase
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await loadSupabaseProfile(session.user.id, session.user.email || '');
        setProfile(prof);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await loadSupabaseProfile(session.user.id, session.user.email || '');
        setProfile(prof);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        // Login modo Demo
        const normalized = email.toLowerCase().trim();
        const demo = DEMO_PROFILES[normalized] || {
          id: `demo-${Date.now()}`,
          email: normalized,
          full_name: normalized.includes('admin') ? 'Administrador' : 'Operador',
          role: normalized.includes('admin') ? 'admin' : 'operador',
          created_at: new Date().toISOString(),
        };
        setUser({ id: demo.id, email: demo.email } as User);
        setProfile(demo);
        localStorage.setItem('demo_pos_user', JSON.stringify(demo));
        setIsLoading(false);
        return {};
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        const prof = await loadSupabaseProfile(data.user.id, data.user.email || '');
        setProfile(prof);
      }

      setIsLoading(false);
      return {};
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      return { error: msg };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        const normalized = email.toLowerCase().trim();
        const demo: Profile = {
          id: `demo-${Date.now()}`,
          email: normalized,
          full_name: fullName.trim() || 'Usuario Demo',
          role: normalized.includes('admin') ? 'admin' : 'operador',
          created_at: new Date().toISOString(),
        };
        setUser({ id: demo.id, email: demo.email } as User);
        setProfile(demo);
        localStorage.setItem('demo_pos_user', JSON.stringify(demo));
        setIsLoading(false);
        return {};
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        const prof = await loadSupabaseProfile(data.user.id, data.user.email || '');
        setProfile(prof);
      }

      setIsLoading(false);
      return {};
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      return { error: msg };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem('demo_pos_user');
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  const updateProfileData = async (
    fullName: string,
    newPassword?: string
  ): Promise<{ error?: string }> => {
    try {
      if (!isSupabaseConfigured || !supabase) {
        if (profile) {
          const updated = { ...profile, full_name: fullName };
          setProfile(updated);
          localStorage.setItem('demo_pos_user', JSON.stringify(updated));
        }
        return {};
      }

      if (!user) return { error: 'No hay usuario autenticado.' };

      // Actualizar nombre en tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) return { error: profileError.message };

      // Actualizar password si se especificó
      if (newPassword && newPassword.trim().length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passError) return { error: passError.message };
      }

      setProfile(prev => (prev ? { ...prev, full_name: fullName } : null));
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar perfil';
      return { error: msg };
    }
  };

  const role: UserRole = profile?.role || 'operador';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

