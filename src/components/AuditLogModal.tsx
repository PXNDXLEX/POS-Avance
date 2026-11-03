'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, AuditLog } from '@/lib/types';
import { getAuditLogs } from '@/lib/transactions';
import { formatCurrencyVE } from '@/lib/formatters';
import { History, X, User, Clock, CheckCircle2, FileText } from 'lucide-react';

interface AuditLogModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function AuditLogModal({ transaction, onClose }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (transaction) {
      setLoading(true);
      getAuditLogs(transaction.id).then((data) => {
        setLogs(data);
        setLoading(false);
      });
    }
  }, [transaction]);

  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-800 to-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Registro de Auditoría y Logs</h3>
              <p className="text-xs text-gray-300">
                Historial de operaciones para {transaction.cliente_nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Resumen de la Operación */}
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Monto POS:</span>
              <span className="font-bold font-mono">{formatCurrencyVE(transaction.monto_bruto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Neto Transferido:</span>
              <span className="font-bold font-mono text-emerald-600">
                {formatCurrencyVE(transaction.monto_neto)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estado Actual:</span>
              <span className="font-bold capitalize">{transaction.estado}</span>
            </div>
            {transaction.referencia_pago && (
              <div className="flex justify-between">
                <span className="text-gray-500">Referencia:</span>
                <span className="font-mono font-bold">{transaction.referencia_pago}</span>
              </div>
            )}
          </div>

          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">
            Línea de Tiempo
          </h4>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Cargando historial de auditoría...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No se han registrado eventos adicionales para esta transacción.
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
              {logs.map((log) => {
                const dateStr = new Date(log.created_at).toLocaleString('es-VE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <div key={log.id} className="relative flex items-start gap-3 pl-1">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 z-10 shadow-xs">
                      {log.accion === 'marcado_pagado' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-200 capitalize">
                          {log.accion.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[11px]">{dateStr}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{log.detalles}</p>
                      {log.usuario_nombre && (
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 pt-1">
                          <User className="w-3 h-3" />
                          <span>Por: {log.usuario_nombre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

