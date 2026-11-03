'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { generatePagoMovilClipboardText, formatCurrencyVE, formatMontoPagoMovil } from '@/lib/formatters';
import { Copy, Check, X, Smartphone, Building2, User, CreditCard, ExternalLink } from 'lucide-react';

interface PagoMovilModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onMarkAsPaid?: (tx: Transaction) => void;
}

export function PagoMovilModal({ transaction, onClose, onMarkAsPaid }: PagoMovilModalProps) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!transaction) return null;

  const rawCopyText = generatePagoMovilClipboardText(transaction);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(rawCopyText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleCopyField = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error copying field:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Datos para Pago Móvil</h3>
              <p className="text-xs text-blue-100">Listo para transferir al cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tarjeta con formato exacto requerido */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Formato de Copiado Rápido
              </span>
              <span className="text-xs text-gray-400">Banco / Teléfono / Cédula / Monto</span>
            </div>

            <div className="relative bg-gray-900 text-emerald-400 p-4 rounded-2xl font-mono text-base font-bold shadow-inner border border-gray-800 select-all">
              <div className="text-gray-400 text-xs mb-1 font-sans"># Bloque generado:</div>
              <div className="space-y-1 text-lg tracking-wide text-white">
                <div className="text-blue-400">{transaction.cliente_banco_codigo}</div>
                <div className="text-emerald-400">{transaction.cliente_telefono}</div>
                <div className="text-amber-400">{transaction.cliente_cedula}</div>
                <div className="text-emerald-300 font-extrabold">
                  {formatMontoPagoMovil(transaction.monto_neto)}
                </div>
              </div>

              <div className="absolute right-3 bottom-3">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    copiedAll
                      ? 'bg-emerald-500 text-white ring-2 ring-emerald-300'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {copiedAll ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Bloque</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Desglose individual de campos por si necesita copiar uno por uno */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
              Copiar campos individuales:
            </span>

            {/* Banco */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Banco</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {transaction.cliente_banco_codigo} - {transaction.cliente_banco_nombre}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(transaction.cliente_banco_codigo, 'banco')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'banco' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'banco' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Teléfono */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Teléfono</span>
                  <span className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                    {transaction.cliente_telefono}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(transaction.cliente_telefono, 'telefono')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'telefono' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'telefono' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Cédula */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Cédula ({transaction.cliente_nombre})</span>
                  <span className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
                    {transaction.cliente_cedula}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(transaction.cliente_cedula, 'cedula')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copiedField === 'cedula' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'cedula' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Monto Neto */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 block font-semibold">
                    Monto Neto a Transferir
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-200">
                    {formatCurrencyVE(transaction.monto_neto)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyField(formatMontoPagoMovil(transaction.monto_neto), 'monto')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              >
                {copiedField === 'monto' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                {copiedField === 'monto' ? 'Copiado' : 'Copiar Monto'}
              </button>
            </div>
          </div>

          {/* Botones inferiores */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {transaction.estado === 'pendiente' && onMarkAsPaid && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMarkAsPaid(transaction);
                }}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Marcar como Pagado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

