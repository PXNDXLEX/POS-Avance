export type UserRole = 'admin' | 'operador';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export type TransactionStatus = 'pendiente' | 'pagado' | 'cancelado';

export interface Transaction {
  id: string;
  cliente_nombre: string;
  cliente_cedula: string;
  cliente_telefono: string;
  cliente_banco_codigo: string;
  cliente_banco_nombre: string;
  monto_bruto: number;
  comision_porcentaje: number;
  monto_comision: number;
  monto_neto: number;
  estado: TransactionStatus;
  fecha_operacion: string;
  fecha_pago?: string | null;
  referencia_pago?: string | null;
  comprobante_url?: string | null;
  notas?: string | null;
  creado_por?: string | null;
  pagado_por?: string | null;
  creador_nombre?: string;
  pagador_nombre?: string;
  created_at: string;
  updated_at?: string;
}

export interface SystemSettings {
  id: string;
  default_commission_percentage: number;
  business_name: string;
  notice_text?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  transaction_id: string;
  accion: 'creacion' | 'marcado_pagado' | 'actualizacion_comprobante' | 'cancelacion' | 'modificacion';
  detalles: string;
  usuario_id?: string;
  usuario_nombre?: string;
  created_at: string;
}

export interface Bank {
  code: string;
  name: string;
  shortName: string;
}

