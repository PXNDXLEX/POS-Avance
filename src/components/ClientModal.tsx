'use client';

import React, { useState, useEffect } from 'react';
import { Client, Bank } from '@/lib/types';
import { BankSelect } from './BankSelect';
import { validateVenezuelanCedula, validateVenezuelanPhone, VENEZUELAN_PHONE_PREFIXES } from '@/lib/validations';
import { saveClient } from '@/lib/clients';
import { useAuth } from '@/context/AuthContext';
import { X, User, Phone, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface ClientModalProps {
  client: Client | null; // null si es nuevo
  onClose: () => void;
  onSuccess: (savedClient: Client) => void;
}

export function ClientModal({ client, onClose, onSuccess }: ClientModalProps) {
  const { user, profile } = useAuth();

  const [nombre, setNombre] = useState(client?.nombre || '');
  const [cedula, setCedula] = useState(client?.cedula || '');
  const [telefono, setTelefono] = useState(client?.telefono || '');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(
    client
      ? {
          code: client.banco_codigo,
          name: client.banco_nombre,
          shortName: client.banco_nombre,
        }
      : null
  );
  const [notas, setNotas] = useState(client?.notas || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(client);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setTelefono(raw);
    if (errors.telefono) {
      const v = validateVenezuelanPhone(raw);
      if (v.isValid) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.telefono;
          return next;
        });
      }
    }
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setCedula(raw);
    if (errors.cedula) {
      const v = validateVenezuelanCedula(raw);
      if (v.isValid) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.cedula;
          return next;
        });
      }
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre completo es obligatorio.';
    }

    const cedulaValidation = validateVenezuelanCedula(cedula);
    if (!cedulaValidation.isValid) {
      newErrors.cedula = cedulaValidation.error || 'Cédula inválida (6 a 8 dígitos numéricos).';
    }

    const phoneValidation = validateVenezuelanPhone(telefono);
    if (!phoneValidation.isValid) {
      newErrors.telefono = phoneValidation.error || 'Teléfono inválido (11 dígitos).';
    }

    if (!selectedBank) {
      newErrors.banco = 'Debe seleccionar el banco del cliente.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await saveClient(
        {
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          telefono: telefono.trim(),
          banco_codigo: selectedBank!.code,
          banco_nombre: selectedBank!.shortName,
          notas: notas.trim() || undefined,
        },
        client?.id,
        client?.cedula,
        user?.id,
        profile?.full_name || 'Operador'
      );

      if (res.error) {
        setErrors({ general: res.error });
        setIsSubmitting(false);
        return;
      }

      if (res.data) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : 'Error al guardar cliente' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">
                {isEditing ? 'Editar Datos del Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <p className="text-xs text-blue-100">
                Directorio de Clientes afiliados al Pago Móvil
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* 1. Nombre Completo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Nombre Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errors.nombre) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.nombre;
                      return next;
                    });
                  }
                }}
                placeholder="Nombre y Apellido según Pago Móvil"
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                  errors.nombre
                    ? 'border-red-500 ring-red-100 dark:ring-red-950'
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre}</p>}
          </div>

          {/* 2. Cédula */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Cédula de Identidad <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400 font-mono">{cedula.length}/8 dígitos</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-sm text-gray-400">V-</span>
              <input
                type="text"
                inputMode="numeric"
                value={cedula}
                onChange={handleCedulaChange}
                placeholder="12345678"
                className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl font-mono text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                  errors.cedula
                    ? 'border-red-500 ring-red-100 dark:ring-red-950'
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.cedula && <p className="mt-1 text-xs text-red-500">{errors.cedula}</p>}
          </div>

          {/* 3. Teléfono */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Teléfono Pago Móvil <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400 font-mono">{telefono.length}/11 dígitos</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                value={telefono}
                onChange={handlePhoneChange}
                placeholder="04140000000"
                className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-xl font-mono text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                  errors.telefono
                    ? 'border-red-500 ring-red-100 dark:ring-red-950'
                    : 'border-gray-200 dark:border-gray-700 focus:border-blue-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Prefijos válidos: {VENEZUELAN_PHONE_PREFIXES.join(', ')}
            </p>
            {errors.telefono && <p className="mt-1 text-xs text-red-500">{errors.telefono}</p>}
          </div>

          {/* 4. Banco Destino */}
          <div>
            <BankSelect
              value={selectedBank?.code || ''}
              onChange={(b) => {
                setSelectedBank(b);
                if (errors.banco) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.banco;
                    return next;
                  });
                }
              }}
              error={errors.banco}
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle o referencia del cliente..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botones */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
