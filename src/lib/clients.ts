import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Client, Transaction } from '@/lib/types';
import { getTransactions, addAuditLog } from '@/lib/transactions';

const LOCAL_STORAGE_CLIENTS_KEY = 'pos_avance_clients_v1';

/**
 * Obtiene la lista completa de clientes del directorio.
 * Combina de forma ininterrumpida los clientes de la tabla 'clients' con el historial de 'transactions'.
 */
export async function getClients(): Promise<Client[]> {
  const transactions = await getTransactions();

  // Calcular totales por cédula a partir de las transacciones
  const txStats = new Map<string, { total_operaciones: number; total_monto: number; last_op?: string }>();
  for (const t of transactions) {
    if (!t.cliente_cedula) continue;
    const cleanCedula = t.cliente_cedula.trim();
    const current = txStats.get(cleanCedula) || { total_operaciones: 0, total_monto: 0 };
    current.total_operaciones += 1;
    current.total_monto += Number(t.monto_bruto || 0);
    if (!current.last_op || new Date(t.fecha_operacion) > new Date(current.last_op)) {
      current.last_op = t.fecha_operacion;
    }
    txStats.set(cleanCedula, current);
  }

  // Cédulas explícitamente eliminadas para que no reaparezcan derivadas de transacciones anteriores
  let deletedCedulas = new Set<string>();
  if (typeof window !== 'undefined') {
    try {
      const savedDel = localStorage.getItem('pos_avance_deleted_clients');
      if (savedDel) deletedCedulas = new Set(JSON.parse(savedDel));
    } catch {}
  }

  const clientsMap = new Map<string, Client>();

  // 1. Derivar clientes a partir de transacciones previas
  for (const t of transactions) {
    if (!t.cliente_cedula) continue;
    const key = t.cliente_cedula.trim();
    if (deletedCedulas.has(key)) continue;

    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        id: `client-tx-${key}`,
        nombre: t.cliente_nombre,
        cedula: key,
        telefono: t.cliente_telefono,
        banco_codigo: t.cliente_banco_codigo,
        banco_nombre: t.cliente_banco_nombre,
        created_at: t.fecha_operacion,
      });
    }
  }

  // 2. Sobreponer clientes registrados explícitamente en el Directorio
  let dbClients: Client[] = [];
  if (!isSupabaseConfigured || !supabase) {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
      if (saved) dbClients = JSON.parse(saved);
    } catch {}
  } else {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nombre', { ascending: true });
      if (!error && data) {
        dbClients = data as Client[];
      }
    } catch (err) {
      console.warn('Aviso leyendo tabla clients:', err);
    }

    // Complementar con clientes locales guardados por si la tabla aún no existe en Supabase
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
      if (saved) {
        const localList = JSON.parse(saved) as Client[];
        for (const loc of localList) {
          if (!dbClients.some((d) => d.cedula === loc.cedula)) {
            dbClients.push(loc);
          }
        }
      }
    } catch {}
  }

  for (const c of dbClients) {
    if (!c.cedula) continue;
    const key = c.cedula.trim();
    if (deletedCedulas.has(key)) continue;

    const existing = clientsMap.get(key);
    clientsMap.set(key, {
      ...existing,
      ...c,
      id: c.id || existing?.id || `client-${key}`,
    });
  }

  // 3. Asignar estadísticas acumuladas
  const finalClients = Array.from(clientsMap.values()).map((c) => {
    const stats = txStats.get(c.cedula.trim()) || { total_operaciones: 0, total_monto: 0 };
    return {
      ...c,
      total_operaciones: stats.total_operaciones,
      total_monto: stats.total_monto,
    };
  });

  return finalClients.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Guarda o actualiza un cliente en el directorio
 */
export async function saveClient(
  clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>,
  existingId?: string,
  oldCedula?: string,
  userId?: string,
  userFullName?: string
): Promise<{ data?: Client; error?: string }> {
  const now = new Date().toISOString();
  const cleanCedula = clientData.cedula.replace(/\D/g, '').trim();
  const cleanPhone = clientData.telefono.replace(/\D/g, '').trim();

  const payload = {
    nombre: clientData.nombre.trim(),
    cedula: cleanCedula,
    telefono: cleanPhone,
    banco_codigo: clientData.banco_codigo,
    banco_nombre: clientData.banco_nombre,
    notas: clientData.notas?.trim() || null,
    updated_at: now,
  };

  // Si estaba en la lista de eliminados, removerlo
  if (typeof window !== 'undefined') {
    try {
      const savedDel = localStorage.getItem('pos_avance_deleted_clients');
      if (savedDel) {
        const set = new Set(JSON.parse(savedDel));
        set.delete(cleanCedula);
        localStorage.setItem('pos_avance_deleted_clients', JSON.stringify(Array.from(set)));
      }
    } catch {}
  }

  if (!isSupabaseConfigured || !supabase) {
    const clients = await getClients();
    let updated: Client[];
    const isEdit = Boolean(existingId || oldCedula);

    if (isEdit) {
      updated = clients.map((c) =>
        c.id === existingId || c.cedula === oldCedula
          ? { ...c, ...payload }
          : c
      );
    } else {
      const newClient: Client = {
        ...payload,
        id: `client-${cleanCedula}-${Date.now()}`,
        created_at: now,
      };
      updated = [newClient, ...clients];
    }

    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(updated));

    // Si editó la cédula o datos, sincronizar transacciones en local
    if (oldCedula) {
      const allTxs = await getTransactions();
      const updatedTxs = allTxs.map((t) =>
        t.cliente_cedula === oldCedula
          ? {
              ...t,
              cliente_nombre: payload.nombre,
              cliente_cedula: payload.cedula,
              cliente_telefono: payload.telefono,
              cliente_banco_codigo: payload.banco_codigo,
              cliente_banco_nombre: payload.banco_nombre,
            }
          : t
      );
      localStorage.setItem('pos_avance_transactions_v1', JSON.stringify(updatedTxs));
    }

    addAuditLog({
      accion: isEdit ? 'modificacion' : 'creacion',
      detalles: `Directorio: Cliente ${payload.nombre} (V-${payload.cedula}) ${isEdit ? 'actualizado' : 'registrado'} por ${userFullName || 'Administrador'}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return { data: { ...payload, id: existingId || `client-${cleanCedula}` } };
  }

  try {
    const isEdit = Boolean(existingId || oldCedula);

    // Intentar upsert o update en tabla clients
    const isValidUuid = existingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existingId);
    const upsertPayload: Record<string, unknown> = {
      ...payload,
    };
    if (isValidUuid) {
      upsertPayload.id = existingId;
    }

    const { data, error } = await supabase
      .from('clients')
      .upsert(upsertPayload, { onConflict: 'cedula' })
      .select();

    if (error && !error.message.includes('does not exist')) {
      console.error('Error al guardar cliente en Supabase:', error);
      return { error: error.message };
    }

    // Guardar también siempre una réplica en localStorage para acceso inmediato y offline
    if (typeof window !== 'undefined') {
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY) || '[]');
        const filtered = local.filter((c: Client) => c.cedula !== cleanCedula && c.cedula !== oldCedula);
        filtered.unshift({ ...payload, id: existingId || `client-${cleanCedula}` });
        localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(filtered));
      } catch {}
    }

    // Si editamos y hay cédula previa, sincronizar transacciones existentes
    if (oldCedula) {
      await supabase
        .from('transactions')
        .update({
          cliente_nombre: payload.nombre,
          cliente_cedula: payload.cedula,
          cliente_telefono: payload.telefono,
          cliente_banco_codigo: payload.banco_codigo,
          cliente_banco_nombre: payload.banco_nombre,
        })
        .eq('cliente_cedula', oldCedula);
    }

    // Auditoría
    addAuditLog({
      accion: isEdit ? 'modificacion' : 'creacion',
      detalles: `Directorio: Cliente ${payload.nombre} (V-${payload.cedula}) ${isEdit ? 'actualizado' : 'registrado'} por ${userFullName || 'Administrador'}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    const saved = data && data[0] ? (data[0] as Client) : { ...payload, id: existingId || `client-${cleanCedula}` };
    return { data: saved };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar cliente';
    return { error: msg };
  }
}

/**
 * Elimina un cliente del directorio
 */
export async function deleteClient(
  cedula: string,
  nombre: string,
  userId?: string,
  userFullName?: string
): Promise<{ error?: string }> {
  const cleanCedula = cedula.replace(/\D/g, '').trim();

  // Guardar en la lista de excluidos para que no vuelva a ser derivado de transacciones históricas
  if (typeof window !== 'undefined') {
    try {
      const savedDel = localStorage.getItem('pos_avance_deleted_clients');
      const set = savedDel ? new Set(JSON.parse(savedDel)) : new Set();
      set.add(cleanCedula);
      localStorage.setItem('pos_avance_deleted_clients', JSON.stringify(Array.from(set)));

      const savedLocal = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
      if (savedLocal) {
        const localList = JSON.parse(savedLocal) as Client[];
        const filtered = localList.filter((c) => c.cedula !== cleanCedula);
        localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(filtered));
      }
    } catch {}
  }

  if (!isSupabaseConfigured || !supabase) {
    const clients = await getClients();
    const updated = clients.filter((c) => c.cedula !== cleanCedula);
    localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(updated));

    addAuditLog({
      accion: 'eliminacion',
      detalles: `Directorio: Cliente ${nombre} (V-${cleanCedula}) eliminado del directorio por ${userFullName || 'Administrador'}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return {};
  }

  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('cedula', cleanCedula);

    if (error && !error.message.includes('does not exist')) {
      return { error: error.message };
    }

    addAuditLog({
      accion: 'eliminacion',
      detalles: `Directorio: Cliente ${nombre} (V-${cleanCedula}) eliminado del directorio por ${userFullName || 'Administrador'}`,
      usuario_id: userId,
      usuario_nombre: userFullName,
    }).catch(() => {});

    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar cliente';
    return { error: msg };
  }
}

