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
  const { user, profile, isAdmin, updateProfileData } = useAuth();

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
          <p className="text-xs text-gray-400 mt-0.5">{profile?.email || user?.email}</p>

          <div className="mt-4">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isAdmin
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Administrador' : 'Operador'}</span>
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
            {/* Correo Electrónico (Solo Lectura) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Correo Electrónico (No editable)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  disabled
                  value={profile?.email || user?.email || ''}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 cursor-not-allowed"
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

      {/* SECCIÓN USUARIO ADMINISTRADOR DE EMERGENCIA */}
      <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <Shield className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-base">Usuario Administrador de Emergencia</h3>
        </div>
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          En caso de emergencia o pérdida de acceso al administrador principal, cualquier usuario registrado en Supabase puede ser ascendido de forma directa ejecutando la siguiente consulta en el SQL Editor de su proyecto Supabase:
        </p>

        <div className="bg-gray-900 text-amber-400 p-3.5 rounded-xl font-mono text-xs overflow-x-auto border border-gray-800">
          UPDATE public.profiles SET role = &apos;admin&apos; WHERE email = &apos;tu_correo@ejemplo.com&apos;;
        </div>

        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          * Los administradores tienen acceso completo para ajustar los porcentajes de comisión por defecto, ver el historial global de auditoría y eliminar registros si fuera necesario.
        </p>
      </div>
    </div>
  );
}

