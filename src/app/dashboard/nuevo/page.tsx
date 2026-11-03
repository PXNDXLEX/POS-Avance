'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TransactionForm } from '@/components/TransactionForm';
import { PagoMovilModal } from '@/components/PagoMovilModal';
import { Transaction } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function NuevoAvancePage() {
  const router = useRouter();
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [copiedDirectly, setCopiedDirectly] = useState(false);

  const handleSuccess = (tx: Transaction, copied?: boolean) => {
    setCreatedTx(tx);
    setCopiedDirectly(Boolean(copied));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Nueva Operación de Avance
          </h1>
          <p className="text-xs text-gray-500">
            Ingresa los datos pasados por el punto de venta para calcular el descuento de comisión.
          </p>
        </div>
      </div>

      <TransactionForm
        onSuccess={handleSuccess}
        onCancel={() => router.push('/dashboard')}
      />

      {/* Modal post-creación si el usuario desea revisar o copiar de nuevo */}
      {createdTx && (
        <PagoMovilModal
          transaction={createdTx}
          onClose={() => {
            setCreatedTx(null);
            router.push('/dashboard');
          }}
          onMarkAsPaid={() => {
            setCreatedTx(null);
            router.push('/dashboard');
          }}
        />
      )}
    </div>
  );
}

