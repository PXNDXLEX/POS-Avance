'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Profile, UserRole } from '@/lib/types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  User,
  Trash2,
  Lock,
  Mail,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function UsuariosPage() {
  const { profile, isAdmin, isSuperAdmin, isConfigured } = useAuth();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Crear Usuario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'operador'>('operador');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Estados de retroalimentación general
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Usuario a eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      if (!isConfigured) {
        // En modo demo local
        const localUsersStr = localStorage.getItem('demo_pos_managed_users');
        let initialList: Profile[] = [];
        if (localUsersStr) {
          initialList = JSON.parse(localUsersStr);
        } else {
          initialList = [
            {
              id: 'demo-superadmin-otto',
              email: 'otto@posavance.com',
              full_name: 'Otto',
              role: 'superadmin',
              is_superadmin: true,
              username: 'otto',
              created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            },
            {
              id: 'demo-admin-id',
              email: 'admin@posavance.com',
              full_name: 'Administrador Secundario',
              role: 'admin',
              is_superadmin: false,
              username: 'admin',
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
            {
              id: 'demo-operador-id',
              email: 'operador@posavance.com',
              full_name: 'Operador de Caja',
              role: 'operador',
              is_superadmin: false,
              username: 'operador',
              created_at: new Date().toISOString(),
            },
          ];
          localStorage.setItem('demo_pos_managed_users', JSON.stringify(initialList));
        }

        // El superadmin principal es invisible en la lista web
        const filtered = initialList.filter(
          (u) =>
            !u.is_superadmin &&
            u.role !== 'superadmin' &&
            u.email !== 'otto@posavance.com' &&
            u.username !== 'otto'
        );
        setUsers(filtered);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/users', {
        headers: {
          'x-is-superadmin': isSuperAdmin ? 'true' : 'false',
        },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      } else if (data.error) {
        setGlobalError(data.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar usuarios';
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, isSuperAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acceso Restringido</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Solo los usuarios con rol de Administrador o Superadministrador pueden gestionar y crear nuevos usuarios en el sistema.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!username.trim() || !fullName.trim() || !password.trim()) {
      setModalError('Todos los campos son obligatorios.');
      return;
    }

    if (password.length < 6) {
      setModalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@posavance.com`;

      if (!isConfigured) {
        // Guardar en demo local
        const currentList: Profile[] = JSON.parse(
          localStorage.getItem('demo_pos_managed_users') || '[]'
        );
        const newUser: Profile = {
          id: `usr-${Date.now()}`,
          email,
          full_name: fullName.trim(),
          role,
          is_superadmin: false,
          username: cleanUsername,
          created_at: new Date().toISOString(),
        };
        const updated = [...currentList, newUser];
        localStorage.setItem('demo_pos_managed_users', JSON.stringify(updated));

        setGlobalSuccess(`Usuario "${cleanUsername}" creado exitosamente.`);
        setIsModalOpen(false);
        resetForm();
        loadUsers();
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          fullName: fullName.trim(),
          password,
          role,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setModalError(json.error || 'Error al crear el usuario.');
      } else {
        setGlobalSuccess(`Usuario "${cleanUsername}" creado exitosamente.`);
        setIsModalOpen(false);
        resetForm();
        loadUsers();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userToDelete: Profile) => {
    if (userToDelete.is_superadmin || userToDelete.role === 'superadmin') {
      alert('El Superadministrador no puede ser eliminado bajo ninguna circunstancia.');
      return;
    }

    const confirm = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente al usuario "${userToDelete.full_name}" (@${userToDelete.username || 'usuario'})?`
    );
    if (!confirm) return;

    setDeletingId(userToDelete.id);
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      if (!isConfigured) {
        const currentList: Profile[] = JSON.parse(
          localStorage.getItem('demo_pos_managed_users') || '[]'
        );
        const updated = currentList.filter((u) => u.id !== userToDelete.id);
        localStorage.setItem('demo_pos_managed_users', JSON.stringify(updated));
        setGlobalSuccess(`Usuario "${userToDelete.full_name}" eliminado.`);
        loadUsers();
        setDeletingId(null);
        return;
      }

      const res = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setGlobalError(data.error || 'Error al eliminar usuario.');
      } else {
        setGlobalSuccess(`Usuario "${userToDelete.full_name}" eliminado correctamente.`);
        loadUsers();
      }
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('operador');
    setModalError(null);
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Gestión de Usuarios del Sistema
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crea operadores y administradores. El registro público está deshabilitado por seguridad.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {globalSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{globalSuccess}</span>
        </div>
      )}

      {globalError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o usuario..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        <span className="text-xs text-gray-400">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
        </span>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <span>Cargando usuarios...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            No se encontraron usuarios.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.map((u) => {
              const isSuper = u.is_superadmin || u.role === 'superadmin';
              const isAdminUser = u.role === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                        isSuper
                          ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                          : isAdminUser
                          ? 'bg-amber-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {u.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {u.full_name}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isSuper
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300'
                              : isAdminUser
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300'
                          }`}
                        >
                          {isSuper ? '👑 Superadmin' : isAdminUser ? '🛡️ Admin' : 'Operador'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="font-mono font-bold text-gray-600 dark:text-gray-300">
                          @{u.username || u.email?.split('@')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div>
                    {isSuper ? (
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                        Inmutable
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingId === u.id}
                        title={`Eliminar usuario ${u.full_name}`}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREAR USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-snug">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-blue-100">Acceso exclusivo para el personal</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/80 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nombre de Usuario / Login */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Usuario de Acceso (Login) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: carlos o caja1"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  El usuario podrá iniciar sesión escribiendo este identificador.
                </span>
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Nombre Completo del Operador <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Carlos Mendoza"
                    className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Contraseña Inicial */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Contraseña Inicial <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Nivel de Acceso (Rol) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('operador')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'operador'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-bold text-xs block">Operador</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Registrar avances y copiar Pago Móvil.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'admin'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-bold text-xs block">Administrador</span>
                    <span className="text-[11px] text-gray-400 block mt-0.5">
                      Configuración y gestión de usuarios.
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar Usuario</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

