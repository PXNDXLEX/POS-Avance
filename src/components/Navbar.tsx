'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  CreditCard,
  PlusCircle,
  Settings,
  History,
  User,
  Users,
  LogOut,
  Shield,
  Menu,
  X,
  Database,
  ExternalLink,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAdmin, isSuperAdmin, isConfigured, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Operaciones', icon: CreditCard },
    { href: '/dashboard/nuevo', label: 'Nuevo Avance', icon: PlusCircle, highlight: true },
    ...(isAdmin ? [{ href: '/dashboard/usuarios', label: 'Usuarios', icon: Users }] : []),
    { href: '/dashboard/configuracion', label: 'Comisiones', icon: Settings },
    { href: '/dashboard/auditoria', label: 'Auditoría', icon: History },
    { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white block leading-none">
                  POS Avance
                </span>
                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                  Gestión de Efectivo
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      link.highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/30'
                        : isActive
                        ? 'bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Connection status, user badge, logout */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Status Pill */}
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Supabase Conectado
              </span>
            ) : (
              <span
                title="Conecta tus variables en Vercel o en .env.local para usar la base de datos Supabase"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-help"
              >
                <Database className="w-3 h-3 text-amber-500" />
                Modo Demo Local
              </span>
            )}

            {/* Profile badge */}
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left text-xs leading-tight">
                <span className="font-bold text-gray-900 dark:text-gray-100 block max-w-[120px] truncate">
                  {profile?.full_name || 'Usuario'}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isSuperAdmin
                      ? 'text-purple-600 dark:text-purple-400'
                      : isAdmin
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {isSuperAdmin ? '👑 Superadmin' : isAdmin ? '🛡️ Admin' : 'Operador'}
                </span>
              </div>
            </Link>

            {/* Logout button */}
            <button
              onClick={() => signOut()}
              title="Cerrar sesión"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu hamburger button */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/dashboard/nuevo"
              className="p-2 bg-blue-600 text-white rounded-xl shadow-xs"
            >
              <PlusCircle className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 pt-3 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-xs">
                <div className="font-bold text-gray-900 dark:text-white">{profile?.full_name}</div>
                <div className="text-gray-400">{isAdmin ? 'Administrador' : 'Operador'}</div>
              </div>
            </div>
            {isConfigured ? (
              <span className="text-[10px] font-bold text-emerald-600">Supabase OK</span>
            ) : (
              <span className="text-[10px] font-bold text-amber-600">Modo Demo</span>
            )}
          </div>

          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}

