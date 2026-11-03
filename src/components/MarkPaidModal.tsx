'use client';

import React, { useState, useRef } from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrencyVE } from '@/lib/formatters';
import { markAsPaid, uploadComprobante } from '@/lib/transactions';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle,
  X,
  Upload,
  Image as ImageIcon,
  Loader2,
  FileText,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';

interface MarkPaidModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: (updatedTxId: string, openWhatsApp?: boolean) => void;
}

export function MarkPaidModal({ transaction, onClose, onSuccess }: MarkPaidModalProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [referencia, setReferencia] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(transaction?.comprobante_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor seleccione un archivo de imagen (PNG, JPG, JPEG, WEBP).');
        return;
      }
      setSelectedFile(file);
      setError(null);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleConfirm = async (openWhatsApp: boolean = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      let finalComprobanteUrl = transaction.comprobante_url || null;

      // Si seleccionó archivo, subir a Supabase Storage
      if (selectedFile) {
        const uploadRes = await uploadComprobante(selectedFile, transaction.id);
        if (uploadRes.error) {
          setError(`Error al subir imagen: ${uploadRes.error}`);
          setIsSubmitting(false);
          return;
        }
        finalComprobanteUrl = uploadRes.url || null;
      }

      // Marcar como pagado en DB y registrar auditoría
      const res = await markAsPaid(
        transaction.id,
        referencia.trim(),
        finalComprobanteUrl,
        user?.id,
        profile?.full_name
      );

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess(transaction.id, openWhatsApp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Confirmar Transferencia</h3>
              <p className="text-xs text-emerald-100">Marcar registro como Pagado</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen de la Operación */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Cliente:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {transaction.cliente_nombre}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Banco y Teléfono:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {transaction.cliente_banco_nombre} ({transaction.cliente_telefono})
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Cédula:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                V-{transaction.cliente_cedula}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                Monto Transferido:
              </span>
              <span className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyVE(transaction.monto_neto)}
              </span>
            </div>
          </div>

          {/* Campo de Referencia Bancaria */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Número de Referencia Bancaria (Opcional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Nro. de confirmación o referencia"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Subir Capture / Comprobante */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Capture del Comprobante (Para enviar por WhatsApp)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/50 group bg-gray-950">
                <img
                  src={previewUrl}
                  alt="Comprobante"
                  className="w-full h-40 object-contain mx-auto"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-gray-900 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cambiar Imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/40"
              >
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-full text-emerald-600 dark:text-emerald-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Subir capture de la transferencia
                  </span>
                  <span className="text-[11px] text-gray-400">
                    PNG, JPG o WEBP (opcional)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              <span>Marcar y Enviar por WhatsApp</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm(false)}
              className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Solo Marcar como Pagado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

