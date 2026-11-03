'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Lock,
  Mail,
  User,
  Shield,
  ArrowRight,
  Loader2,
  AlertCircle,
  Database,
  CheckCircle,
  Info,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, isConfigured } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Por favor ingrese su nombre completo.');
          setLoading(false);
          return;
        }

        const res = await signUp(email, password, fullName);
        if (res.error) {
          setError(res.error);
        } else {
          setMessage('¡Cuenta creada con éxito! Redirigiendo...');
          setTimeout(() => router.push('/dashboard'), 800);
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(res.error);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: 'admin' | 'operador') => {
    setError(null);
    setLoading(true);
    const demoEmail = role === 'admin' ? 'admin@avancepos.com' : 'operador@avancepos.com';
    const res = await signIn(demoEmail, 'demo123');
    if (res.error) {
      setError(res.error);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          POS Avance
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Sistema de Gestión y Control de Avances de Efectivo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 sm:px-10 shadow-xl border border-gray-100 dark:border-gray-800 rounded-3xl">
          {/* Banner de Estado de Conexión */}
          {!isConfigured && (
            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Modo Local / Demo Activo</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Configura las variables de Supabase en Vercel o en `.env.local` para conectar la base de datos real.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes('Supabase') && (
                <div className="mt-2 p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 text-[11px] space-y-1.5">
                  <span className="font-bold block text-gray-800 dark:text-gray-200">
                    💡 Solución rápida en Supabase:
                  </span>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ejecuta esto en el <strong>SQL Editor</strong> de Supabase para activar tu cuenta:
                  </p>
                  <code className="block p-1.5 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] rounded text-blue-600 dark:text-blue-400 select-all">
                    UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
                  </code>
                </div>
              )}
            </div>
          )}

          {message && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: José Rodríguez"
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Alternar entre Login y Registro */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setMessage(null);
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isRegister
                ? '¿Ya tienes una cuenta? Inicia sesión aquí'
                : '¿Nuevo usuario? Regístrate aquí'}
            </button>
          </div>

          {/* Accesos Rápidos para Administrador y Emergencia */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-center">
              Acceso Rápido / Emergencia
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Emergencia</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('operador')}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Operador Caja</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

