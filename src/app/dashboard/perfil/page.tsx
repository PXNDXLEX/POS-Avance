'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Lock,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
  Terminal,
} from 'lucide-react';

export default function PerfilPage() {
  const { user, profile, isAdmin, isSuperAdmin, updateProfileData } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('El nombre completo no puede estar vacío.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await updateProfileData(fullName.trim(), newPassword ? newPassword : undefined);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('¡Perfil y credenciales actualizados exitosamente!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-blue-600" />
          Mi Perfil y Credenciales
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestiona tu nombre visible, contraseña de acceso y privilegios en el sistema.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta de Resumen del Usuario */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/25 mb-4">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {profile?.full_name || 'Usuario'}
          </h3>
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            @{profile?.username || (profile?.email ? profile.email.split('@')[0] : 'usuario')}
          </p>

          <div className="mt-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isSuperAdmin
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300'
                  : isAdmin
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? '👑 Superadmin' : isAdmin ? '🛡️ Admin' : 'Operador'}</span>
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 w-full text-left space-y-2 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>ID Usuario:</span>
              <span className="font-mono text-gray-400 truncate max-w-[120px]">
                {profile?.id || user?.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tipo de cuenta:</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">
                {profile?.role || 'operador'}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario de Modificación de Nombre y Clave */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-600" />
            Editar Datos y Contraseña
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Usuario de Acceso (Solo Lectura) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Usuario de Acceso (No editable)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-sm text-gray-400">
                  @
                </span>
                <input
                  type="text"
                  disabled
                  value={profile?.username || (profile?.email ? profile.email.split('@')[0] : 'usuario')}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono font-bold text-gray-700 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Nombre Completo */}
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
                  placeholder="Tu nombre y apellido"
                  className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Separador de Cambio de Clave */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
                Cambio de Contraseña (Opcional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECCIÓN SUPERADMIN OTTO */}
      <div className="bg-purple-500/10 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800/60 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-200">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-base">Superadministrador Principal (otto)</h3>
        </div>
        <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
          El usuario principal es <strong>otto</strong>. Nadie puede borrarlo ni verlo desde las cuentas de otros administradores. En caso de requerir restablecer sus credenciales (clave: <code>25156888</code>), ejecute el bloque #10 de <code>supabase_schema.sql</code> en el SQL Editor de Supabase.
        </p>
      </div>
    </div>
  );
}

