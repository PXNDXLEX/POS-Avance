'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatsOverview } from '@/components/StatsOverview';
import { TransactionList } from '@/components/TransactionList';
import { PagoMovilModal } from '@/components/PagoMovilModal';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { AuditLogModal } from '@/components/AuditLogModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { getTransactions, deleteTransaction } from '@/lib/transactions';
import { Transaction } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import {
  PlusCircle,
  RefreshCw,
  CreditCard,
  Calendar,
  AlertCircle,
  Database,
} from 'lucide-react';

export default function DashboardPage() {
  const { profile, user, isAdmin, isSuperAdmin, isConfigured } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modales
  const [selectedTxPagoMovil, setSelectedTxPagoMovil] = useState<Transaction | null>(null);
  const [selectedTxMarkPaid, setSelectedTxMarkPaid] = useState<Transaction | null>(null);
  const [selectedTxWhatsApp, setSelectedTxWhatsApp] = useState<Transaction | null>(null);
  const [selectedTxAudit, setSelectedTxAudit] = useState<Transaction | null>(null);
  const [selectedTxDelete, setSelectedTxDelete] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getTransactions();
    setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteConfirm = async (txId: string) => {
    const res = await deleteTransaction(txId, user?.id, profile?.full_name);
    if (res.error) {
      throw new Error(res.error);
    }
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    setSelectedTxDelete(null);
  };

  const handleMarkPaidSuccess = (txId: string, openWhatsApp?: boolean) => {
    // Actualizar estado local inmediatamente
    const target = transactions.find((t) => t.id === txId);
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === txId
          ? {
              ...t,
              estado: 'pagado',
              fecha_pago: new Date().toISOString(),
            }
          : t
      )
    );

    setSelectedTxMarkPaid(null);

    // Si marcó para enviar WhatsApp de una vez, abrir el modal de WhatsApp
    if (openWhatsApp && target) {
      setSelectedTxWhatsApp({
        ...target,
        estado: 'pagado',
        fecha_pago: new Date().toISOString(),
      });
    }

    // Refrescar datos en segundo plano
    loadData();
  };

  const todayStr = new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Banner Informativo si está en modo demo */}
      {!isConfigured && (
        <div className="p-4 bg-amber-500/10 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Aplicación corriendo en Modo Local (LocalStorage)
              </span>
              <span>
                Para conectar Supabase y persistir datos en la nube, añade <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en Vercel o en tu archivo <code>.env.local</code>.
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/configuracion"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shrink-0 text-center transition-colors shadow-xs"
          >
            Ver Instrucciones
          </Link>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 capitalize mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayStr}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Panel de Operaciones
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Control de montos pasados por punto y transferencias pendientes de Pago Móvil.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData()}
            disabled={loading}
            title="Recargar datos"
            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <Link
            href="/dashboard/nuevo"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Avance</span>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas y KPIs */}
      <StatsOverview transactions={transactions} />

      {/* Tabla y Lista de Operaciones */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            Registros de Avance
          </h2>
          <span className="text-xs text-gray-400">
            Total {transactions.length} registros
          </span>
        </div>

        <TransactionList
          transactions={transactions}
          canDelete={isAdmin || isSuperAdmin}
          onOpenPagoMovil={(tx) => setSelectedTxPagoMovil(tx)}
          onOpenMarkPaid={(tx) => setSelectedTxMarkPaid(tx)}
          onOpenWhatsApp={(tx) => setSelectedTxWhatsApp(tx)}
          onOpenAuditLogs={(tx) => setSelectedTxAudit(tx)}
          onDeleteTransaction={(tx) => setSelectedTxDelete(tx)}
        />
      </div>

      {/* Modales */}
      {selectedTxDelete && (
        <DeleteConfirmModal
          transaction={selectedTxDelete}
          onClose={() => setSelectedTxDelete(null)}
          onConfirmDelete={handleDeleteConfirm}
        />
      )}
      {selectedTxPagoMovil && (
        <PagoMovilModal
          transaction={selectedTxPagoMovil}
          onClose={() => setSelectedTxPagoMovil(null)}
          onMarkAsPaid={(tx) => {
            setSelectedTxPagoMovil(null);
            setSelectedTxMarkPaid(tx);
          }}
        />
      )}

      {selectedTxMarkPaid && (
        <MarkPaidModal
          transaction={selectedTxMarkPaid}
          onClose={() => setSelectedTxMarkPaid(null)}
          onSuccess={handleMarkPaidSuccess}
        />
      )}

      {selectedTxWhatsApp && (
        <WhatsAppModal
          transaction={selectedTxWhatsApp}
          onClose={() => setSelectedTxWhatsApp(null)}
          onCaptureUpdated={(updated) => {
            setTransactions((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
        />
      )}

      {selectedTxAudit && (
        <AuditLogModal
          transaction={selectedTxAudit}
          onClose={() => setSelectedTxAudit(null)}
        />
      )}
    </div>
  );
}

