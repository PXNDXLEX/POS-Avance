'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BankSelect } from './BankSelect';
import { Bank, Transaction } from '@/lib/types';
import {
  validateVenezuelanPhone,
  validateVenezuelanCedula,
  validateAmount,
  validateCommission,
  VENEZUELAN_PHONE_PREFIXES,
} from '@/lib/validations';
import {
  formatCurrencyVE,
  generatePagoMovilClipboardText,
} from '@/lib/formatters';
import {
  createTransaction,
  getSystemSettings,
  searchClientsByName,
  ClientRecord,
} from '@/lib/transactions';
import { useAuth } from '@/context/AuthContext';
import {
  Percent,
  User,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Copy,
  ArrowRight,
  Calculator,
  Search,
  Check,
  Building2,
  Loader2,
} from 'lucide-react';

interface TransactionFormProps {
  onSuccess?: (tx: Transaction, copiedToClipboard?: boolean) => void;
  onCancel?: () => void;
}

export function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const { user, profile } = useAuth();

  // Campos del Formulario
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [montoBrutoStr, setMontoBrutoStr] = useState('');
  const [comisionPorcentajeStr, setComisionPorcentajeStr] = useState('10');
  const [notas, setNotas] = useState('');

  // Sugerencias de clientes por Nombre
  const [clientSuggestions, setClientSuggestions] = useState<ClientRecord[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // UI / Errores
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar porcentaje de comisión por defecto
  useEffect(() => {
    getSystemSettings().then((settings) => {
      if (settings?.default_commission_percentage) {
        setComisionPorcentajeStr(settings.default_commission_percentage.toString());
      }
    });
  }, []);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en vivo de clientes recurrentes al escribir el Nombre
  useEffect(() => {
    if (nombre.trim().length >= 2) {
      setIsSearchingClients(true);
      searchClientsByName(nombre.trim()).then((results) => {
        setClientSuggestions(results);
        setShowSuggestions(results.length > 0);
        setIsSearchingClients(false);
      });
    } else {
      setClientSuggestions([]);
      setShowSuggestions(false);
    }
  }, [nombre]);

  // Cálculos matemáticos en vivo
  const montoBruto = parseFloat(montoBrutoStr.replace(',', '.')) || 0;
  const comisionPorcentaje = parseFloat(comisionPorcentajeStr.replace(',', '.')) || 0;
  const montoComision = Math.round(montoBruto * (comisionPorcentaje / 100) * 100) / 100;
  const montoNeto = Math.max(0, Math.round((montoBruto - montoComision) * 100) / 100);

  const handleSelectClient = (client: ClientRecord) => {
    setNombre(client.nombre);
    setCedula(client.cedula);
    setTelefono(client.telefono);
    setSelectedBank({
      code: client.banco_codigo,
      name: client.banco_nombre,
      shortName: client.banco_nombre,
    });
    setShowSuggestions(false);

    // Limpiar errores previos si estaban
    setErrors((prev) => {
      const next = { ...prev };
      delete next.nombre;
      delete next.cedula;
      delete next.telefono;
      delete next.banco;
      return next;
    });
  };

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

    const amountValidation = validateAmount(montoBruto);
    if (!amountValidation.isValid) {
      newErrors.montoBruto = amountValidation.error || 'Ingrese un monto válido mayor a 0.';
    }

    const commValidation = validateCommission(comisionPorcentaje);
    if (!commValidation.isValid) {
      newErrors.comision = commValidation.error || 'Porcentaje inválido (0 - 100).';
    }

    if (Object.keys(newErrors).length > 0) {
      newErrors.general = 'Por favor complete todos los campos obligatorios marcados en rojo.';
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (andCopyPagoMovil: boolean = false) => {
    if (!validateAll()) return;
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrors({});

    try {
      const res = await createTransaction(
        {
          cliente_nombre: nombre.trim(),
          cliente_cedula: cedula.trim(),
          cliente_telefono: telefono.trim(),
          cliente_banco_codigo: selectedBank!.code,
          cliente_banco_nombre: selectedBank!.shortName,
          monto_bruto: montoBruto,
          comision_porcentaje: comisionPorcentaje,
          monto_comision: montoComision,
          monto_neto: montoNeto,
          estado: 'pendiente',
          fecha_operacion: new Date().toISOString(),
          notas: notas.trim() || undefined,
        },
        user?.id,
        profile?.full_name || 'Operador'
      );

      if (res.error) {
        setErrors({ general: `Error al guardar: ${res.error}` });
        setIsSubmitting(false);
        return;
      }

      let copied = false;
      if (andCopyPagoMovil && res.data) {
        const textToCopy = generatePagoMovilClipboardText(res.data);
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      }

      setSuccessMessage('¡Operación registrada con éxito en el sistema!');

      setTimeout(() => {
        if (onSuccess && res.data) {
          onSuccess(res.data, copied);
        }
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-5 border-b border-gray-100 dark:border-gray-800 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Registrar Avance de Efectivo
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monto pasado por el punto de venta y cálculo de transferencia para el cliente.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          <Calculator className="w-3.5 h-3.5" />
          Cálculo Automático
        </div>
      </div>

      {errors.general && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errors.general}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* NOTA IMPORTANTE */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            ⚠️ Nota importante sobre los datos del cliente:
          </p>
          <p className="text-amber-800 dark:text-amber-300 text-xs sm:text-sm mt-0.5">
            El nombre, número de cédula, teléfono y banco deben coincidir exactamente con los datos afiliados al <strong>Pago Móvil</strong> del cliente para que la transferencia no sea rechazada por la red bancaria.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: DATOS DEL CLIENTE */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-gray-50/70 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Datos del Cliente
            </h3>

            {/* 1. NOMBRE COMPLETO CON BÚSQUEDA Y MINIATURA */}
            <div className="relative" ref={searchContainerRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Búsqueda automática
                </span>
              </div>

              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nombre}
                  onFocus={() => {
                    if (clientSuggestions.length > 0) setShowSuggestions(true);
                  }}
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
                  placeholder="Nombre y apellido según Pago Móvil"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    errors.nombre
                      ? 'border-red-500 ring-red-100 dark:ring-red-950'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-950'
                  }`}
                />
              </div>

              {errors.nombre && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.nombre}</p>
              )}

              {/* MINIATURA FLOTANTE DE RESULTADOS DE BÚSQUEDA */}
              {showSuggestions && clientSuggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100 dark:divide-gray-700">
                  <div className="px-3.5 py-2 bg-gray-50/80 dark:bg-gray-900/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Clientes frecuentes encontrados</span>
                    <span className="text-[10px] text-blue-600 font-semibold">
                      Haz clic para autocompletar
                    </span>
                  </div>

                  {clientSuggestions.map((client, idx) => (
                    <button
                      key={`${client.cedula}-${idx}`}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className="w-full p-3 text-left hover:bg-blue-50/80 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          {client.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {client.nombre}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                              V-{client.cedula}
                            </span>
                            <span>•</span>
                            <span className="truncate">{client.banco_nombre}</span>
                            <span>•</span>
                            <span className="font-mono">{client.telefono}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 p-1.5 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Check className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. CÉDULA DE IDENTIDAD (8 dígitos) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Cédula de Identidad (8 dígitos) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400 font-mono">
                  {cedula.length}/8 dígitos
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">
                  V-
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={handleCedulaChange}
                  placeholder="12345678"
                  className={`w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl font-mono text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    errors.cedula
                      ? 'border-red-500 ring-red-100 dark:ring-red-950'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-950'
                  }`}
                />
              </div>
              {errors.cedula && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.cedula}</p>
              )}
            </div>

            {/* 3. TELÉFONO PAGO MÓVIL */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Teléfono Pago Móvil <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-400 font-mono">
                  {telefono.length}/11 dígitos
                </span>
              </div>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={telefono}
                  onChange={handlePhoneChange}
                  placeholder="04140000000"
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl font-mono text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    errors.telefono
                      ? 'border-red-500 ring-red-100 dark:ring-red-950'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-950'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Prefijos válidos: {VENEZUELAN_PHONE_PREFIXES.join(', ')} + 7 dígitos.
              </p>
              {errors.telefono && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.telefono}</p>
              )}
            </div>

            {/* 4. BANCO DESTINO */}
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
          </div>

          {/* NOTAS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle o lote de la operación..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* COLUMNA DERECHA: MONTO Y COMISIÓN */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800/80 dark:to-blue-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-5">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Monto y Comisión del Avance
            </h3>

            {/* MONTO EN POS */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                Monto pasado por el POS (Bruto) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-sm text-gray-500 dark:text-gray-400">
                  Bs.
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={montoBrutoStr}
                  onChange={(e) => {
                    setMontoBrutoStr(e.target.value);
                    if (errors.montoBruto) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.montoBruto;
                        return next;
                      });
                    }
                  }}
                  placeholder="0,00"
                  className={`w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border rounded-xl font-mono text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    errors.montoBruto
                      ? 'border-red-500 ring-red-100 dark:ring-red-950'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-950'
                  }`}
                />
              </div>
              {errors.montoBruto && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.montoBruto}</p>
              )}
            </div>

            {/* % DE COMISIÓN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Porcentaje de Comisión (%) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Editable por operación
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={comisionPorcentajeStr}
                  onChange={(e) => {
                    setComisionPorcentajeStr(e.target.value);
                    if (errors.comision) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.comision;
                        return next;
                      });
                    }
                  }}
                  placeholder="10"
                  className={`w-full pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border rounded-xl font-mono text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    errors.comision
                      ? 'border-red-500 ring-red-100 dark:ring-red-950'
                      : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-950'
                  }`}
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-sm text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
              {errors.comision && (
                <p className="mt-1 text-xs text-red-500 font-medium">{errors.comision}</p>
              )}
            </div>

            {/* RESUMEN FINANCIERO */}
            <div className="p-4 bg-white dark:bg-gray-900/90 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Cobrado en Punto de Venta:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrencyVE(montoBruto)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-400">
                <span>Comisión retenida ({comisionPorcentaje}%):</span>
                <span className="font-mono font-semibold">
                  - {formatCurrencyVE(montoComision)}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Neto a Transferir por Pago Móvil:
                  </span>
                  <span className="text-xs text-gray-400">
                    (Monto a pagar al cliente al día siguiente)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyVE(montoNeto)}
                  </span>
                </div>
              </div>
            </div>

            {/* FORMATO PRELIMINAR PAGO MÓVIL */}
            {selectedBank && telefono && cedula && montoNeto > 0 && (
              <div className="p-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">
                  Vista previa Pago Móvil:
                </span>
                <div className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-950 p-2 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div>{selectedBank.code}</div>
                  <div>{telefono}</div>
                  <div>{cedula}</div>
                  <div>{montoNeto.toFixed(2).replace('.', ',')}</div>
                </div>
              </div>
            )}
          </div>

          {/* AVISO DE ERROR VISIBLE JUNTO A LOS BOTONES */}
          {errors.general && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold">No se pudo procesar la operación:</p>
                <p className="mt-0.5 text-xs">{errors.general}</p>
                {errors.general.includes('does not exist') && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                    💡 Asegúrate de ejecutar el script <code>supabase_schema.sql</code> en el SQL Editor de Supabase para crear las tablas del sistema.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* BOTONES */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Guardando en sistema...' : 'Registrar y Copiar Pago Móvil'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Solo Registrar Avance</span>
              )}
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
