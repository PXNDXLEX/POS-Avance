'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrencyVE } from '@/lib/formatters';
import { Trash2, AlertTriangle, X, Loader2, Building2, Smartphone, Calendar } from 'lucide-react';

interface DeleteConfirmModalProps {
  transaction: Transaction;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export function DeleteConfirmModal({
  transaction,
  onClose,
  onConfirmDelete,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(transaction.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la operación';
      setError(msg);
      setIsDeleting(false);
    }
  };

  const fechaOp = new Date(transaction.fecha_operacion).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera de Alerta */}
        <div className="p-5 bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Eliminar Operación
              </h3>
              <p className="text-xs text-red-700 dark:text-red-400">
                Acceso exclusivo para Administradores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido y Datos de la Transacción */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar este avance del sistema? Esta acción{' '}
            <strong className="text-red-600 dark:text-red-400">no se puede deshacer</strong> y se
            borrará de los reportes.
          </p>

          {/* Tarjeta Resumen */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Cliente:</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">
                {transaction.cliente_nombre}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Cédula:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                V-{transaction.cliente_cedula}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Banco / Teléfono:</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {transaction.cliente_banco_codigo} • {transaction.cliente_telefono}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Monto Bruto POS:</span>
              <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                {formatCurrencyVE(transaction.monto_bruto)}
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="font-medium">A Transferir (Neto):</span>
              <span className="font-mono font-extrabold text-sm">
                {formatCurrencyVE(transaction.monto_neto)}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-400 text-[11px] pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fechaOp}
              </span>
              <span className="capitalize font-semibold text-amber-600 dark:text-amber-400">
                {transaction.estado}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Operación'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

