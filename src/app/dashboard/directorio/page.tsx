'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getClients, deleteClient } from '@/lib/clients';
import { Client } from '@/lib/types';
import { ClientModal } from '@/components/ClientModal';
import { formatCurrencyVE } from '@/lib/formatters';
import { useAuth } from '@/context/AuthContext';
import {
  BookUser,
  Search,
  PlusCircle,
  Smartphone,
  CreditCard,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function DirectorioPage() {
  const { user, profile, isAdmin } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modales
  const [modalClient, setModalClient] = useState<Client | null | undefined>(undefined);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getClients();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.cedula.includes(q) ||
      c.telefono.includes(q) ||
      c.banco_nombre.toLowerCase().includes(q) ||
      c.banco_codigo.includes(q)
    );
  });

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    const res = await deleteClient(
      clientToDelete.cedula,
      clientToDelete.nombre,
      user?.id,
      profile?.full_name
    );

    if (res.error) {
      setErrorMsg(res.error);
      setIsDeleting(false);
      return;
    }

    setClients((prev) => prev.filter((c) => c.cedula !== clientToDelete.cedula));
    setClientToDelete(null);
    setIsDeleting(false);
  };

  const totalOps = clients.reduce((acc, c) => acc + (c.total_operaciones || 0), 0);
  const totalMonto = clients.reduce((acc, c) => acc + (c.total_monto || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookUser className="w-7 h-7 text-blue-600" />
            Directorio de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Consulta, edita o registra datos de clientes afiliados al Pago Móvil.
          </p>
        </div>

        <button
          onClick={() => setModalClient(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Clientes Registrados</span>
            <BookUser className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {clients.length}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Operaciones Realizadas</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {totalOps}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Volumen Total Cobrado</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black font-mono text-gray-900 dark:text-white">
            {formatCurrencyVE(totalMonto)}
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o banco..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <span>Cargando directorio de clientes...</span>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-16 text-center text-xs text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <span className="font-semibold text-gray-600 dark:text-gray-300 block text-sm">
            No se encontraron clientes
          </span>
          <span className="text-xs text-gray-400 mt-1 block">
            {search
              ? `No hay coincidencias para "${search}".`
              : 'Aún no hay clientes registrados en el directorio.'}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c) => {
            const initial = c.nombre.charAt(0).toUpperCase();
            return (
              <div
                key={c.cedula}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 dark:hover:border-blue-900 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold text-base flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                          {c.nombre}
                        </h3>
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          V-{c.cedula}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setModalClient(c)}
                        title="Editar datos del cliente"
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientToDelete(c)}
                        title="Eliminar cliente del directorio"
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        Teléfono:
                      </span>
                      <span className="font-mono font-semibold">{c.telefono}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Banco:
                      </span>
                      <span className="font-medium truncate max-w-[150px]" title={c.banco_nombre}>
                        {c.banco_codigo} • {c.banco_nombre}
                      </span>
                    </div>

                    {c.notas && (
                      <div className="pt-1 text-[11px] text-gray-400 italic truncate">
                        "{c.notas}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">
                      Actividad
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {c.total_operaciones || 0} {(c.total_operaciones || 0) === 1 ? 'avance' : 'avances'}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/nuevo`}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                  >
                    <span>Nuevo Avance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Crear o Editar Cliente */}
      {modalClient !== undefined && (
        <ClientModal
          client={modalClient}
          onClose={() => setModalClient(undefined)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal Confirmar Eliminación de Cliente */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Eliminar del Directorio
                </h3>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {clientToDelete.nombre} (V-{clientToDelete.cedula})
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              ¿Estás seguro de que deseas eliminar este cliente del directorio? Esta acción lo removerá de la lista de clientes frecuentes.
            </p>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/60 border border-red-200 text-red-600 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-red-600/20"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

