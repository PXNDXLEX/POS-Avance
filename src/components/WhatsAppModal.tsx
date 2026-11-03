'use client';

import React, { useState, useRef } from 'react';
import { Transaction } from '@/lib/types';
import { generateWhatsAppMessage, buildWhatsAppLink } from '@/lib/formatters';
import { uploadComprobante, markAsPaid } from '@/lib/transactions';
import { useAuth } from '@/context/AuthContext';
import {
  MessageCircle,
  X,
  Upload,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Building2,
  FileText,
  AlertCircle,
  Share2,
  Image as ImageIcon,
  Download,
  Loader2,
} from 'lucide-react';

interface WhatsAppModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onCaptureUpdated?: (updatedTx: Transaction) => void;
}

export function WhatsAppModal({ transaction, onClose, onCaptureUpdated }: WhatsAppModalProps) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState(() =>
    transaction ? generateWhatsAppMessage(transaction) : ''
  );
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [copiedImageToast, setCopiedImageToast] = useState(false);
  const [currentComprobante, setCurrentComprobante] = useState(transaction?.comprobante_url || null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (transaction) {
      setCurrentComprobante(transaction.comprobante_url || null);
      setMessage(generateWhatsAppMessage(transaction));
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const res = await uploadComprobante(file, transaction.id);
      if (res.error) {
        setError(`Error al subir imagen: ${res.error}`);
        setIsUploading(false);
        return;
      }

      if (res.url) {
        setCurrentComprobante(res.url);

        // Actualizar en base de datos
        await markAsPaid(
          transaction.id,
          transaction.referencia_pago || '',
          res.url,
          user?.id,
          profile?.full_name
        );

        const updatedTx: Transaction = {
          ...transaction,
          comprobante_url: res.url,
        };

        setMessage(generateWhatsAppMessage(updatedTx));
        if (onCaptureUpdated) {
          onCaptureUpdated(updatedTx);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado al subir');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch (err) {
      console.error('Error copying message:', err);
    }
  };

  const handleCopyImage = async () => {
    if (!currentComprobante) return;
    setIsCopyingImage(true);
    try {
      const response = await fetch(currentComprobante);
      const blob = await response.blob();

      // Convertir a PNG para máxima compatibilidad con ClipboardItem
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(async (pngBlob) => {
        if (pngBlob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob }),
            ]);
            setCopiedImageToast(true);
            setTimeout(() => setCopiedImageToast(false), 3500);
          } catch {
            setError('Tu navegador no permite copiar imágenes al portapapeles directamente. Puedes descargarla o compartirla.');
          }
        }
        setIsCopyingImage(false);
      }, 'image/png');
    } catch {
      setIsCopyingImage(false);
      setError('No se pudo copiar la imagen al portapapeles.');
    }
  };

  const handleShareWithImage = async () => {
    if (!currentComprobante) {
      handleOpenWhatsApp();
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch(currentComprobante);
      const blob = await response.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const file = new File([blob], `comprobante_avance.${ext}`, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Comprobante de Avance',
          text: message,
        });
      } else {
        // En desktop si Web Share no soporta archivos, copiamos la imagen y abrimos WhatsApp
        await handleCopyImage();
        handleOpenWhatsApp();
      }
    } catch {
      // Si cancela o no soporta, abrimos WhatsApp normal
      handleOpenWhatsApp();
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (currentComprobante) {
      handleCopyImage();
    }
    const link = buildWhatsAppLink(transaction.cliente_telefono, message);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header WhatsApp Style */}
        <div className="px-6 py-5 bg-[#075E54] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Notificar por WhatsApp</h3>
              <p className="text-xs text-emerald-100">
                Enviar confirmación a {transaction.cliente_nombre}
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

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Datos rápidos del envío */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <span className="text-gray-400 block">Número WhatsApp:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                {transaction.cliente_telefono}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Banco Destino:</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate block">
                {transaction.cliente_banco_nombre}
              </span>
            </div>
          </div>

          {/* Subir o Visualizar Comprobante */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                {currentComprobante ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Comprobante Adjunto Listo</span>
                  </>
                ) : (
                  <span>Capture de Transferencia (Comprobante)</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                {currentComprobante ? 'Cambiar Imagen' : 'Subir Imagen (Opcional)'}
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {currentComprobante ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-gray-950 group">
                  <img
                    src={currentComprobante}
                    alt="Capture transferencia"
                    className="w-full h-36 object-contain"
                  />
                  <a
                    href={currentComprobante}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-colors backdrop-blur-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver completo
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={isCopyingImage}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopyingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{isCopyingImage ? 'Copiando...' : 'Copiar Imagen (Ctrl+V)'}</span>
                  </button>
                  <a
                    href={currentComprobante}
                    download="comprobante.jpg"
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Descargar</span>
                  </a>
                </div>

                {copiedImageToast && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>¡Imagen copiada! En el chat de WhatsApp presiona <strong>Ctrl + V</strong> para pegarla.</span>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center cursor-pointer hover:border-emerald-500 bg-gray-50/50 dark:bg-gray-800/40"
              >
                <span className="text-xs text-gray-500">
                  {isUploading ? 'Subiendo imagen...' : 'Opcional: Pulsa aquí para adjuntar el capture bancario'}
                </span>
              </div>
            )}
          </div>

          {/* Vista previa y edición del mensaje */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Mensaje a Enviar
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copiedMsg ? 'Mensaje Copiado' : 'Copiar Texto'}
              </button>
            </div>

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl font-mono text-xs text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#25D366]"
            />
          </div>

          {/* Botones de acción */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-current shrink-0" />
              <span>Abrir WhatsApp de {transaction.cliente_nombre.split(' ')[0]}</span>
            </button>

            {currentComprobante && (
              <button
                type="button"
                onClick={handleShareWithImage}
                disabled={isSharing}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Share2 className="w-4 h-4 shrink-0" />
                )}
                <span>Compartir Imagen + Texto (WhatsApp Móvil / App)</span>
              </button>
            )}

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

