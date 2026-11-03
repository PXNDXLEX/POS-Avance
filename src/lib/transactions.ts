import { supabase, isSupabaseConfigured } from './supabase/client';
import { Transaction, TransactionStatus, AuditLog, SystemSettings } from './types';

const LOCAL_STORAGE_TX_KEY = 'pos_avance_transactions';
const LOCAL_STORAGE_LOGS_KEY = 'pos_avance_audit_logs';
const LOCAL_STORAGE_SETTINGS_KEY = 'pos_avance_settings';

// Configuración por defecto
export const DEFAULT_SETTINGS: SystemSettings = {
  id: 'default',
  default_commission_percentage: 10.0,
  business_name: 'Avance de Efectivo POS',
  notice_text: 'Recuerde verificar que los datos coincidan exactamente con el Pago Móvil del cliente.',
};

// Transacciones de prueba para modo demostración
const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-1',
    cliente_nombre: 'Carlos Eduardo Mendoza',
    cliente_cedula: '25156888',
    cliente_telefono: '04248525656',
    cliente_banco_codigo: '0102',
    cliente_banco_nombre: 'Banco de Venezuela',
    monto_bruto: 17111.11,
    comision_porcentaje: 10.0,
    monto_comision: 1711.11,
    monto_neto: 15400.0,
    estado: 'pendiente',
    fecha_operacion: new Date().toISOString(),
    creado_por: 'demo-admin-id',
    creador_nombre: 'Administrador Principal',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-tx-2',
    cliente_nombre: 'María Alejandra Gómez',
    cliente_cedula: '20456123',
    cliente_telefono: '04141234567',
    cliente_banco_codigo: '0134',
    cliente_banco_nombre: 'Banesco',
    monto_bruto: 5000.0,
    comision_porcentaje: 12.0,
    monto_comision: 600.0,
    monto_neto: 4400.0,
    estado: 'pagado',
    fecha_operacion: new Date(Date.now() - 86400000).toISOString(),
    fecha_pago: new Date().toISOString(),
    referencia_pago: '84920412',
    creado_por: 'demo-operador-id',
    creador_nombre: 'Operador de Caja',
    pagado_por: 'demo-operador-id',
    pagador_nombre: 'Operador de Caja',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export async function getSystemSettings(): Promise<SystemSettings> {
  if (!isSupabaseConfigured || !supabase) {
    const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_SETTINGS;
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.warn('Error fetching system settings, using default:', error.message);
      return DEFAULT_SETTINGS;
    }
    return data || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSettings(
  settings: Partial<SystemSettings>,
  userId?: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const current = await getSystemSettings();
    const updated = { ...current, ...settings, updated_at: new Date().toISOString() };
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
    return {};
  }

  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        id: 'default',
        ...settings,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });

    if (error) return { error: error.message };
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar configuración' };
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!isSupabaseConfigured || !supabase) {
    const saved = localStorage.getItem(LOCAL_STORAGE_TX_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
    return INITIAL_DEMO_TRANSACTIONS;
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        creador:creado_por(full_name),
        pagador:pagado_por(full_name)
      `)
      .order('fecha_operacion', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []).map((t: any) => ({
      ...t,
      creador_nombre: t.creador?.full_name || 'Desconocido',
      pagador_nombre: t.pagador?.full_name || null,
    }));
  } catch (err) {
    console.error('Error:', err);
    return [];
  }
}

export async function createTransaction(
  payload: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>,
  userId?: string,
  userFullName?: string
): Promise<{ data?: Transaction; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    const current = await getTransactions();
    const newTx: Transaction = {
      ...payload,
      id: `tx-${Date.now()}`,
      creado_por: userId || 'demo-user',
      creador_nombre: userFullName || 'Usuario Demo',
      created_at: new Date().toISOString(),
    };

    const updated = [newTx, ...current];
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updated));

    // Audit log
    await addAuditLog({
      transaction_id: newTx.id,
      accion: 'creacion',
      detalles: `Avance creado por Bs. ${newTx.monto_bruto} (%${newTx.comision_porcentaje} comision) para ${newTx.cliente_nombre}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    });

    return { data: newTx };
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        cliente_nombre: payload.cliente_nombre,
        cliente_cedula: payload.cliente_cedula,
        cliente_telefono: payload.cliente_telefono,
        cliente_banco_codigo: payload.cliente_banco_codigo,
        cliente_banco_nombre: payload.cliente_banco_nombre,
        monto_bruto: payload.monto_bruto,
        comision_porcentaje: payload.comision_porcentaje,
        monto_comision: payload.monto_comision,
        monto_neto: payload.monto_neto,
        estado: payload.estado || 'pendiente',
        fecha_operacion: payload.fecha_operacion || new Date().toISOString(),
        notas: payload.notas || null,
        creado_por: userId,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    await addAuditLog({
      transaction_id: data.id,
      accion: 'creacion',
      detalles: `Avance registrado por Bs. ${payload.monto_bruto} con comisión de ${payload.comision_porcentaje}% (${payload.monto_comision} Bs) para ${payload.cliente_nombre}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    });

    return { data };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al registrar avance' };
  }
}

export async function markAsPaid(
  id: string,
  referencia: string,
  comprobanteUrl: string | null,
  userId?: string,
  userFullName?: string
): Promise<{ error?: string }> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    const current = await getTransactions();
    const updated = current.map(tx => {
      if (tx.id === id) {
        return {
          ...tx,
          estado: 'pagado' as TransactionStatus,
          fecha_pago: now,
          referencia_pago: referencia || null,
          comprobante_url: comprobanteUrl || tx.comprobante_url || null,
          pagado_por: userId || 'demo-user',
          pagador_nombre: userFullName || 'Usuario',
        };
      }
      return tx;
    });

    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updated));

    await addAuditLog({
      transaction_id: id,
      accion: 'marcado_pagado',
      detalles: `Marcado como pagado${referencia ? ` con referencia: ${referencia}` : ''}${comprobanteUrl ? ' (comprobante adjunto)' : ''}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    });

    return {};
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        estado: 'pagado',
        fecha_pago: now,
        referencia_pago: referencia || null,
        comprobante_url: comprobanteUrl,
        pagado_por: userId,
        updated_at: now,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    await addAuditLog({
      transaction_id: id,
      accion: 'marcado_pagado',
      detalles: `Marcado como transferido/pagado${referencia ? `. Ref: ${referencia}` : ''}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    });

    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al marcar como pagado' };
  }
}

export async function uploadComprobante(
  file: File,
  transactionId: string
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    // En modo demo local convertimos a Data URL base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ error: 'Error al leer el archivo en modo local' });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${transactionId}_${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al subir comprobante' };
  }
}

export async function addAuditLog(
  log: Omit<AuditLog, 'id' | 'created_at'>
): Promise<void> {
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured || !supabase) {
    const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LOGS_KEY) || '[]');
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify([newLog, ...current]));
    return;
  }

  try {
    await supabase.from('audit_logs').insert({
      transaction_id: log.transaction_id,
      accion: log.accion,
      detalles: log.detalles,
      usuario_id: log.usuario_id,
      usuario_nombre: log.usuario_nombre,
    });
  } catch (err) {
    console.error('Error saving audit log:', err);
  }
}

export async function getAuditLogs(transactionId?: string): Promise<AuditLog[]> {
  if (!isSupabaseConfigured || !supabase) {
    const logs: AuditLog[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_LOGS_KEY) || '[]');
    if (transactionId) {
      return logs.filter(l => l.transaction_id === transactionId);
    }
    return logs;
  }

  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (transactionId) {
      query = query.eq('transaction_id', transactionId);
    }

    const { data, error } = await query.limit(100);
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Busca clientes recurrentes a partir de transacciones previas
 * Permite autocompletar nombre, teléfono y banco ingresando la cédula!
 */
export async function findRecentClientByCedula(cedula: string) {
  const clean = cedula.replace(/\D/g, '');
  if (clean.length < 5) return null;

  const transactions = await getTransactions();
  const found = transactions.find(t => t.cliente_cedula === clean);
  if (found) {
    return {
      nombre: found.cliente_nombre,
      telefono: found.cliente_telefono,
      banco_codigo: found.cliente_banco_codigo,
      banco_nombre: found.cliente_banco_nombre,
    };
  }
  return null;
}

