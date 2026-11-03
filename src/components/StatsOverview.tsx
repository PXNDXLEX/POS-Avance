'use client';

import React from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrencyVE } from '@/lib/formatters';
import {
  CreditCard,
  Percent,
  Clock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface StatsOverviewProps {
  transactions: Transaction[];
}

export function StatsOverview({ transactions }: StatsOverviewProps) {
  const totalProcesado = transactions.reduce((acc, t) => acc + (t.monto_bruto || 0), 0);
  const totalComisiones = transactions.reduce((acc, t) => acc + (t.monto_comision || 0), 0);

  const pendientes = transactions.filter((t) => t.estado === 'pendiente');
  const totalPendiente = pendientes.reduce((acc, t) => acc + (t.monto_neto || 0), 0);

  const pagados = transactions.filter((t) => t.estado === 'pagado');
  const totalPagado = pagados.reduce((acc, t) => acc + (t.monto_neto || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* PENDIENTE POR TRANSFERIR (Prioridad 1) */}
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-4.5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Pendiente por Transferir
          </span>
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black font-mono text-amber-900 dark:text-amber-200">
            {formatCurrencyVE(totalPendiente)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>{pendientes.length} operaciones pendientes</span>
          </div>
        </div>
      </div>

      {/* TOTAL PROCESADO EN POS */}
      <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl p-4.5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total Pasado por Punto
          </span>
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black font-mono text-gray-900 dark:text-white">
            {formatCurrencyVE(totalProcesado)}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
            {transactions.length} operaciones totales
          </span>
        </div>
      </div>

      {/* TOTAL GANADO EN COMISIONES */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4.5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Comisiones Retenidas
          </span>
          <div className="p-2 bg-blue-700 text-white rounded-xl shadow-xs">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black font-mono text-blue-900 dark:text-blue-200">
            {formatCurrencyVE(totalComisiones)}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ganancia líquida por porcentaje</span>
          </div>
        </div>
      </div>

      {/* TOTAL YA PAGADO */}
      <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-4.5 transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Total Transferido
          </span>
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">
            {formatCurrencyVE(totalPagado)}
          </div>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 block font-medium">
            {pagados.length} transferencias completadas
          </span>
        </div>
      </div>
    </div>
  );
}

