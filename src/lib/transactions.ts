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

// Transacciones de prueba para modo demostración (sin datos reales)
const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-1',
    cliente_nombre: 'Cliente de Prueba',
    cliente_cedula: '12345678',
    cliente_telefono: '04140000000',
    cliente_banco_codigo: '0102',
    cliente_banco_nombre: 'Banco de Venezuela',
    monto_bruto: 1000.0,
    comision_porcentaje: 10.0,
    monto_comision: 100.0,
    monto_neto: 900.0,
    estado: 'pendiente',
    fecha_operacion: new Date().toISOString(),
    creado_por: 'demo-admin-id',
    creador_nombre: 'Administrador',
    created_at: new Date().toISOString(),
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
    const cleanUserId = isValidUuid(userId) ? userId : null;
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (settings.default_commission_percentage !== undefined) {
      updatePayload.default_commission_percentage = Number(settings.default_commission_percentage);
    }
    if (settings.business_name !== undefined) {
      updatePayload.business_name = settings.business_name.trim();
    }
    if (settings.notice_text !== undefined) {
      updatePayload.notice_text = settings.notice_text.trim();
    }
    if (cleanUserId) {
      updatePayload.updated_by = cleanUserId;
    }

    // Usar primero UPDATE para evaluar directamente la política de actualización (evita fallo de INSERT en upsert)
    const { data, error: updateError } = await supabase
      .from('system_settings')
      .update(updatePayload)
      .eq('id', 'default')
      .select();

    if (!updateError && data && data.length > 0) {
      return {};
    }

    // Si la fila 'default' no existía aún en la base de datos, insertar con fallback
    const { error: insertError } = await supabase
      .from('system_settings')
      .upsert({
        id: 'default',
        default_commission_percentage: 10,
        business_name: 'Avance de Efectivo',
        ...updatePayload,
      });

    if (insertError) {
      console.error('Error al actualizar configuración:', insertError);
      return { error: insertError.message };
    }

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
      .select('*')
      .order('fecha_operacion', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error.message);
      return [];
    }

    return (data || []).map((t: any) => ({
      ...t,
      creador_nombre: t.creador_nombre || 'Operador',
      pagador_nombre: t.pagador_nombre || null,
    }));
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return [];
  }
}

// Validar formato UUID para evitar errores de sintaxis en columnas tipo UUID de Postgres
const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

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

    addAuditLog({
      transaction_id: newTx.id,
      accion: 'creacion',
      detalles: `Avance creado por Bs. ${newTx.monto_bruto} (%${newTx.comision_porcentaje} comision) para ${newTx.cliente_nombre}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return { data: newTx };
  }

  try {
    const cleanUserId = isValidUuid(userId) ? userId : null;
    const insertPayload = {
      cliente_nombre: payload.cliente_nombre.trim(),
      cliente_cedula: payload.cliente_cedula.trim(),
      cliente_telefono: payload.cliente_telefono.trim(),
      cliente_banco_codigo: payload.cliente_banco_codigo,
      cliente_banco_nombre: payload.cliente_banco_nombre,
      monto_bruto: Number(payload.monto_bruto),
      comision_porcentaje: Number(payload.comision_porcentaje),
      monto_comision: Number(payload.monto_comision),
      monto_neto: Number(payload.monto_neto),
      estado: payload.estado || 'pendiente',
      fecha_operacion: payload.fecha_operacion || new Date().toISOString(),
      notas: payload.notas?.trim() || null,
      creado_por: cleanUserId,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertPayload)
      .select();

    if (error) {
      console.error('Error al insertar transaccion en Supabase:', error);
      return { error: error.message };
    }

    const savedTx: Transaction = (data && data[0]) ? (data[0] as Transaction) : {
      ...payload,
      id: `tx-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Registrar o actualizar automáticamente el cliente en el directorio
    (async () => {
      try {
        await supabase
          .from('clients')
          .upsert(
            {
              nombre: payload.cliente_nombre.trim(),
              cedula: payload.cliente_cedula.trim(),
              telefono: payload.cliente_telefono.trim(),
              banco_codigo: payload.cliente_banco_codigo,
              banco_nombre: payload.cliente_banco_nombre,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'cedula' }
          );
      } catch {
        // Ignorar si la tabla aún no existe
      }
    })();

    // Auditoría no bloqueante
    addAuditLog({
      transaction_id: savedTx.id,
      accion: 'creacion',
      detalles: `Avance registrado por Bs. ${payload.monto_bruto} con comisión de ${payload.comision_porcentaje}% (${payload.monto_comision} Bs) para ${payload.cliente_nombre}`,
      usuario_id: cleanUserId || undefined,
      usuario_nombre: userFullName,
    }).catch((err) => console.warn('Aviso auditoria:', err));

    return { data: savedTx };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar avance';
    return { error: msg };
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

    addAuditLog({
      transaction_id: id,
      accion: 'marcado_pagado',
      detalles: `Marcado como pagado${referencia ? ` con referencia: ${referencia}` : ''}${comprobanteUrl ? ' (comprobante adjunto)' : ''}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return {};
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        estado: 'pagado',
        fecha_pago: now,
        referencia_pago: referencia ? referencia.trim() : null,
        comprobante_url: comprobanteUrl || null,
        pagado_por: isValidUuid(userId) ? userId : null,
        updated_at: now,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    addAuditLog({
      transaction_id: id,
      accion: 'marcado_pagado',
      detalles: `Marcado como transferido/pagado${referencia ? `. Ref: ${referencia}` : ''}`,
      usuario_id: isValidUuid(userId) ? userId : undefined,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Error al marcar como pagado' };
  }
}

/**
 * Elimina una transacción (Acceso exclusivo para Admin y Superadmin)
 * Registra inmutablemente el evento en la auditoría con los detalles del cliente y monto eliminado.
 */
export async function deleteTransaction(
  id: string,
  userId?: string,
  userFullName?: string
): Promise<{ error?: string }> {
  // 1. Obtener la transacción antes de eliminarla para guardar sus datos en la auditoría
  const allTxs = await getTransactions();
  const targetTx = allTxs.find((t) => t.id === id);
  const infoCliente = targetTx
    ? `${targetTx.cliente_nombre} (V-${targetTx.cliente_cedula}) por Bs. ${targetTx.monto_bruto} [Neto a pagar: Bs. ${targetTx.monto_neto}, Banco: ${targetTx.cliente_banco_nombre}]`
    : `ID: ${id}`;

  if (!isSupabaseConfigured || !supabase) {
    const updated = allTxs.filter((t) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_TX_KEY, JSON.stringify(updated));

    addAuditLog({
      accion: 'eliminacion',
      detalles: `Operación eliminada: Avance de ${infoCliente}`,
      usuario_id: isValidUuid(userId) ? userId : undefined,
      usuario_nombre: userFullName || 'Administrador',
    }).catch(() => {});

    return {};
  }

  try {
    // 2. Desvincular el ID de la transacción en los logs anteriores para que no se borren en cascada
    await supabase
      .from('audit_logs')
      .update({ transaction_id: null })
      .eq('transaction_id', id);

    // 3. Eliminar la transacción de la tabla
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar transacción en Supabase:', error);
      return { error: error.message };
    }

    // 4. Registrar en la auditoría permanente que la operación fue eliminada
    await addAuditLog({
      accion: 'eliminacion',
      detalles: `Operación eliminada: Avance de ${infoCliente}`,
      usuario_id: isValidUuid(userId) ? userId : undefined,
      usuario_nombre: userFullName || 'Administrador',
    });

    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar transacción';
    return { error: msg };
  }
}

export async function uploadComprobante(
  file: File,
  transactionId: string
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
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
      transaction_id: isValidUuid(log.transaction_id) ? log.transaction_id : null,
      accion: log.accion,
      detalles: log.detalles,
      usuario_id: isValidUuid(log.usuario_id) ? log.usuario_id : null,
      usuario_nombre: log.usuario_nombre || null,
    });
  } catch (err) {
    console.warn('Error saving audit log:', err);
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

export interface ClientRecord {
  nombre: string;
  cedula: string;
  telefono: string;
  banco_codigo: string;
  banco_nombre: string;
}

/**
 * Busca clientes a partir de transacciones previas y del directorio usando su Nombre Completo o Cédula
 * Devuelve lista de sugerencias con nombre y cédula para mostrar en la miniatura de búsqueda
 */
export async function searchClientsByName(nameQuery: string): Promise<ClientRecord[]> {
  const q = nameQuery.trim().toLowerCase();
  if (q.length < 2) return [];

  const clientsMap = new Map<string, ClientRecord>();

  // Excluir clientes eliminados
  let deletedCedulas = new Set<string>();
  if (typeof window !== 'undefined') {
    try {
      const savedDel = localStorage.getItem('pos_avance_deleted_clients');
      if (savedDel) deletedCedulas = new Set(JSON.parse(savedDel));
    } catch {}
  }

  // 1. Buscar en transacciones previas
  const transactions = await getTransactions();
  for (const t of transactions) {
    if (!t.cliente_nombre) continue;
    const matchName = t.cliente_nombre.toLowerCase().includes(q);
    const matchCedula = t.cliente_cedula && t.cliente_cedula.includes(q);

    if (matchName || matchCedula) {
      const key = t.cliente_cedula.trim();
      if (!deletedCedulas.has(key) && !clientsMap.has(key)) {
        clientsMap.set(key, {
          nombre: t.cliente_nombre,
          cedula: t.cliente_cedula,
          telefono: t.cliente_telefono,
          banco_codigo: t.cliente_banco_codigo,
          banco_nombre: t.cliente_banco_nombre,
        });
      }
    }
  }

  // 2. Buscar en clientes del Directorio (tabla 'clients' de Supabase)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: dbClients } = await supabase
        .from('clients')
        .select('*');

      if (dbClients) {
        for (const c of dbClients) {
          const matchName = c.nombre && c.nombre.toLowerCase().includes(q);
          const matchCedula = c.cedula && c.cedula.includes(q);
          const key = c.cedula ? c.cedula.trim() : '';
          if (key && !deletedCedulas.has(key) && (matchName || matchCedula)) {
            clientsMap.set(key, {
              nombre: c.nombre,
              cedula: c.cedula,
              telefono: c.telefono,
              banco_codigo: c.banco_codigo,
              banco_nombre: c.banco_nombre,
            });
          }
        }
      }
    } catch {
      // Ignorar si la tabla aún no se ha creado
    }
  }

  // 3. Complementar siempre con clientes guardados en localStorage
  if (typeof window !== 'undefined') {
    try {
      const local = JSON.parse(localStorage.getItem('pos_avance_clients_v1') || '[]');
      for (const c of local) {
        const matchName = c.nombre && c.nombre.toLowerCase().includes(q);
        const matchCedula = c.cedula && c.cedula.includes(q);
        const key = c.cedula ? c.cedula.trim() : '';
        if (key && !deletedCedulas.has(key) && (matchName || matchCedula)) {
          clientsMap.set(key, {
            nombre: c.nombre,
            cedula: c.cedula,
            telefono: c.telefono,
            banco_codigo: c.banco_codigo,
            banco_nombre: c.banco_nombre,
          });
        }
      }
    } catch {}
  }

  return Array.from(clientsMap.values()).slice(0, 8);
}
