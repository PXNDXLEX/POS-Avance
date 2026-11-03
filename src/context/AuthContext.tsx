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
  isSuperAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfileData: (fullName: string, newPassword?: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Perfiles para el modo demo local
const DEMO_PROFILES: Record<string, Profile> = {
  'otto@posavance.com': {
    id: 'demo-superadmin-otto',
    email: 'otto@posavance.com',
    full_name: 'Otto',
    role: 'superadmin',
    is_superadmin: true,
    username: 'otto',
    created_at: new Date().toISOString(),
  },
  'admin@posavance.com': {
    id: 'demo-admin-id',
    email: 'admin@posavance.com',
    full_name: 'Administrador Secundario',
    role: 'admin',
    is_superadmin: false,
    username: 'admin',
    created_at: new Date().toISOString(),
  },
  'operador@posavance.com': {
    id: 'demo-operador-id',
    email: 'operador@posavance.com',
    full_name: 'Operador de Caja',
    role: 'operador',
    is_superadmin: false,
    username: 'operador',
    created_at: new Date().toISOString(),
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Normalizar identificador a email interno para Supabase Auth
  const resolveEmail = (identifier: string): string => {
    const clean = identifier.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (clean === 'otto' || clean === 'otto@posavance.com') {
      return 'otto@posavance.com';
    }
    if (clean.includes('@')) {
      return clean;
    }
    return `${clean}.posavance@gmail.com`;
  };

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
        const isSuper = email.toLowerCase().startsWith('otto@');
        const fallback: Profile = {
          id: userId,
          email,
          full_name: isSuper ? 'Otto' : email.split('@')[0],
          role: isSuper ? 'superadmin' : 'operador',
          is_superadmin: isSuper,
          username: email.split('@')[0],
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

  const signIn = async (
    usernameOrEmail: string,
    password: string
  ): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const email = resolveEmail(usernameOrEmail);

      if (!isSupabaseConfigured || !supabase) {
        // En modo demo
        const demo = DEMO_PROFILES[email] || {
          id: `demo-${Date.now()}`,
          email,
          full_name: email.split('@')[0],
          role: email.startsWith('otto') ? 'superadmin' : 'operador',
          is_superadmin: email.startsWith('otto'),
          username: email.split('@')[0],
          created_at: new Date().toISOString(),
        };

        setUser({ id: demo.id, email: demo.email } as User);
        setProfile(demo);
        localStorage.setItem('demo_pos_user', JSON.stringify(demo));
        setIsLoading(false);
        return {};
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        if (
          error.message.toLowerCase().includes('invalid login credentials') ||
          error.message.toLowerCase().includes('email not confirmed')
        ) {
          return {
            error: 'Credenciales inválidas. Por favor verifica tu usuario y contraseña.',
          };
        }
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

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) return { error: profileError.message };

      if (newPassword && newPassword.trim().length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passError) return { error: passError.message };
      }

      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : null));
      return {};
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar perfil';
      return { error: msg };
    }
  };

  const isSuperAdmin = profile?.role === 'superadmin' || profile?.is_superadmin === true;
  const role: UserRole = isSuperAdmin ? 'superadmin' : profile?.role || 'operador';
  const isAdmin = isSuperAdmin || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isSuperAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signIn,
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
