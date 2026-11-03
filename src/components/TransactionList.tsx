'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrencyVE, formatMontoPagoMovil, generatePagoMovilClipboardText } from '@/lib/formatters';
import {
  Copy,
  Check,
  Smartphone,
  MessageCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  History,
  AlertCircle,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onOpenPagoMovil: (tx: Transaction) => void;
  onOpenMarkPaid: (tx: Transaction) => void;
  onOpenWhatsApp: (tx: Transaction) => void;
  onOpenAuditLogs: (tx: Transaction) => void;
}

export function TransactionList({
  transactions,
  onOpenPagoMovil,
  onOpenMarkPaid,
  onOpenWhatsApp,
  onOpenAuditLogs,
}: TransactionListProps) {
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendiente' | 'pagado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtrado reactivo
  const filtered = transactions.filter((t) => {
    if (filterStatus !== 'todos' && t.estado !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = t.cliente_nombre.toLowerCase().includes(q);
      const matchCedula = t.cliente_cedula.includes(q);
      const matchPhone = t.cliente_telefono.includes(q);
      const matchBank = t.cliente_banco_nombre.toLowerCase().includes(q) || t.cliente_banco_codigo.includes(q);
      const matchRef = t.referencia_pago ? t.referencia_pago.toLowerCase().includes(q) : false;
      return matchName || matchCedula || matchPhone || matchBank || matchRef;
    }
    return true;
  });

  const handleQuickCopy = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation();
    try {
      const text = generatePagoMovilClipboardText(tx);
      await navigator.clipboard.writeText(text);
      setCopiedId(tx.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error copying text:', err);
    }
  };

  const countPendientes = transactions.filter((t) => t.estado === 'pendiente').length;
  const countPagados = transactions.filter((t) => t.estado === 'pagado').length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Controles de filtro y búsqueda */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs de Estado */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl max-w-fit">
            <button
              onClick={() => setFilterStatus('todos')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'todos'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Todos ({transactions.length})
            </button>
            <button
              onClick={() => setFilterStatus('pendiente')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'pendiente'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pendientes ({countPendientes})</span>
            </button>
            <button
              onClick={() => setFilterStatus('pagado')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                filterStatus === 'pagado'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Pagados ({countPagados})</span>
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, cédula, ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto text-gray-400 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            No se encontraron operaciones
          </h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No hay resultados para "${searchQuery}". Intenta con otro término o limpia el filtro.`
              : 'Aún no hay avances registrados en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((tx) => {
            const isPending = tx.estado === 'pendiente';
            const isCopied = copiedId === tx.id;
            const fechaOp = new Date(tx.fecha_operacion).toLocaleDateString('es-VE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={tx.id}
                className="p-4 sm:p-5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info del Cliente y Banco */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-base">
                        {tx.cliente_nombre}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        V-{tx.cliente_cedula}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Pendiente de Pago</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Transferido</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {tx.cliente_banco_codigo}
                        </span>
                        <span>{tx.cliente_banco_nombre}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-gray-700 dark:text-gray-300">
                        <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                        {tx.cliente_telefono}
                      </span>
                      <span className="text-gray-400">{fechaOp}</span>
                      {tx.referencia_pago && (
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                          Ref: {tx.referencia_pago}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cifras Financieras */}
                  <div className="flex items-center gap-6 self-start lg:self-center">
                    <div className="text-right">
                      <div className="text-[11px] text-gray-400 uppercase tracking-wide">
                        Punto (Bruto)
                      </div>
                      <div className="text-xs font-mono font-medium text-gray-600 dark:text-gray-400 line-through decoration-gray-400">
                        {formatCurrencyVE(tx.monto_bruto)}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        -{tx.comision_porcentaje}% ({formatCurrencyVE(tx.monto_comision)})
                      </div>
                    </div>

                    <div className="text-right pl-4 border-l border-gray-100 dark:border-gray-800">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        A Transferir
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrencyVE(tx.monto_neto)}
                      </div>
                    </div>
                  </div>

                  {/* Acciones y Botones */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-800">
                    {/* Botón de Copiado Rápido Pago Móvil (Exigencia clave) */}
                    <button
                      type="button"
                      title="Copiar datos formateados para Pago Móvil"
                      onClick={(e) => handleQuickCopy(e, tx)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? '¡Copiado!' : 'Copiar Pago Móvil'}</span>
                    </button>

                    {/* Ver Modal de Pago Móvil con detalles */}
                    <button
                      type="button"
                      title="Ver bloque y datos detallados de Pago Móvil"
                      onClick={() => onOpenPagoMovil(tx)}
                      className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>

                    {/* Marcar como pagado */}
                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onOpenMarkPaid(tx)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar Pagado</span>
                      </button>
                    )}

                    {/* Avisar por WhatsApp */}
                    <button
                      type="button"
                      title="Avisar al cliente por WhatsApp"
                      onClick={() => onOpenWhatsApp(tx)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    {/* Historial / Auditoría */}
                    <button
                      type="button"
                      title="Ver auditoría y logs"
                      onClick={() => onOpenAuditLogs(tx)}
                      className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

