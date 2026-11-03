'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  Lock,
  User,
  Shield,
  ArrowRight,
  Loader2,
  AlertCircle,
  Database,
  CheckCircle,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isConfigured } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn(usernameOrEmail, password);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillSuperAdmin = () => {
    setUsernameOrEmail('otto');
    setPassword('25156888');
    setError(null);
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
                Configura las variables de Supabase en Vercel o en <code>.env.local</code> para persistencia en base de datos.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <div className="mt-2 p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 text-[11px] space-y-1.5">
                <span className="font-bold block text-gray-800 dark:text-gray-200">
                  💡 Crear / Restablecer Superadmin en Supabase:
                </span>
                <p className="text-gray-600 dark:text-gray-400">
                  Ejecuta el bloque <strong>#10</strong> de <code>supabase_schema.sql</code> en el SQL Editor de Supabase para generar el usuario <strong>otto</strong>.
                </p>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Usuario o Correo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="ej: otto o tu_correo"
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
                <span>Iniciar Sesión</span>
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Tarjeta Informativa de Acceso Superadmin */}
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold block">Superadministrador</span>
                  <span className="text-[11px] text-purple-700 dark:text-purple-300">
                    Usuario: <strong>otto</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillSuperAdmin}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
              >
                Cargar
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              🔒 El registro público está deshabilitado. Los nuevos operadores y administradores se gestionan desde el panel interno.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
