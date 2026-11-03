'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSystemSettings, updateSystemSettings } from '@/lib/transactions';
import { SystemSettings } from '@/lib/types';
import {
  Percent,
  Settings,
  Building,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  ShieldAlert,
} from 'lucide-react';

export default function ConfiguracionPage() {
  const { user, profile, isAdmin } = useAuth();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [commission, setCommission] = useState('10');
  const [businessName, setBusinessName] = useState('Avance de Efectivo POS');
  const [noticeText, setNoticeText] = useState(
    'Recuerde verificar que los datos coincidan exactamente con el Pago Móvil del cliente.'
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getSystemSettings().then((s) => {
      setSettings(s);
      setCommission(s.default_commission_percentage.toString());
      setBusinessName(s.business_name || 'Avance de Efectivo POS');
      if (s.notice_text) setNoticeText(s.notice_text);
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg('Solo los usuarios administradores pueden modificar las configuraciones del sistema.');
      return;
    }

    const commNum = parseFloat(commission.replace(',', '.'));
    if (isNaN(commNum) || commNum < 0 || commNum > 100) {
      setErrorMsg('El porcentaje de comisión debe ser un valor válido entre 0% y 100%.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateSystemSettings(
        {
          default_commission_percentage: commNum,
          business_name: businessName.trim(),
          notice_text: noticeText.trim(),
        },
        user?.id
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg('¡Configuraciones guardadas exitosamente!');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs">Cargando configuraciones...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-blue-600" />
          Configuración de Comisiones y Negocio
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Define el porcentaje estándar que cobrarás por cada operación de avance de efectivo.
        </p>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Modo Solo Lectura (Operador)</span>
            <span>
              Tienes rol de Operador. Puedes visualizar las configuraciones, pero solo el rol de Administrador puede modificarlas de forma global.
            </span>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
        {/* % DE COMISIÓN POR DEFECTO */}
        <div>
          <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">
            Porcentaje de Comisión por Defecto (%)
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Este porcentaje se cargará automáticamente cada vez que inicies un nuevo registro de avance.
          </p>
          <div className="relative max-w-xs">
            <input
              type="text"
              inputMode="decimal"
              disabled={!isAdmin || isSaving}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl font-mono text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <span className="absolute right-3.5 top-3 font-bold text-sm text-gray-400">
              %
            </span>
          </div>
        </div>

        {/* NOMBRE DEL NEGOCIO */}
        <div>
          <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">
            Nombre del Negocio (Aparecerá en el mensaje de WhatsApp)
          </label>
          <div className="relative">
            <Building className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              disabled={!isAdmin || isSaving}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Inversiones Los Andes - Avances"
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>
        </div>

        {/* TEXTO DE AVISO PAGO MÓVIL */}
        <div>
          <label className="block text-sm font-bold text-gray-900 dark:text-white mb-1">
            Nota de Recordatorio sobre el Pago Móvil
          </label>
          <textarea
            rows={3}
            disabled={!isAdmin || isSaving}
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        {isAdmin && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Guardar Configuraciones</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

