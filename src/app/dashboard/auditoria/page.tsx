'use client';

import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/transactions';
import { AuditLog } from '@/lib/types';
import {
  History,
  CheckCircle2,
  FileText,
  User,
  Clock,
  Filter,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('todos');

  useEffect(() => {
    getAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (filterAction !== 'todos' && l.accion !== filterAction) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.detalles.toLowerCase().includes(q) ||
        (l.usuario_nombre && l.usuario_nombre.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <History className="w-6 h-6 text-blue-600" />
          Registro y Auditoría de Operaciones
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Historial inmutable de avances creados, transferencias marcadas como pagadas y modificaciones.
        </p>
      </div>

      {/* Controles de Filtro */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterAction('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setFilterAction('marcado_pagado')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'marcado_pagado'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Pagados
          </button>
          <button
            onClick={() => setFilterAction('creacion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'creacion'
                ? 'bg-blue-800 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Nuevos Avances
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuario o detalle..."
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Lista de Registros de Auditoría */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <span>Cargando auditoría...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <span>No se encontraron eventos de auditoría con los filtros actuales.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredLogs.map((log) => {
              const isPaid = log.accion === 'marcado_pagado';
              const dateStr = new Date(log.created_at).toLocaleString('es-VE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                        isPaid ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white capitalize">
                          {log.accion.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {log.detalles}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span>Responsable: <strong>{log.usuario_nombre || 'Sistema'}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-gray-400 truncate max-w-[150px]">
                          Tx: {log.transaction_id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

