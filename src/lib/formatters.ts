import { Transaction } from './types';

/**
 * Formatea un número en formato de moneda venezolana (ej. 15.400,00 o 15400,00).
 */
export function formatCurrencyVE(amount: number, withSymbol = true): string {
  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = parts[1];
  const formatted = `${intPart},${decPart}`;
  return withSymbol ? `Bs. ${formatted}` : formatted;
}

/**
 * Formatea el monto para el bloque de Pago Móvil:
 * Puede ser con coma decimal (ej. 15400,00 o con separador de miles según prefiera).
 * Siguiendo el ejemplo del usuario: "15400,00"
 */
export function formatMontoPagoMovil(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

/**
 * Genera el bloque de texto exacto para copiar y pegar en Pago Móvil:
 * banco
 * telefono
 * Cedula
 * monto
 *
 * Ejemplo:
 * 0102
 * 04140000000
 * 12345678
 * 1000,00
 */
export function generatePagoMovilClipboardText(tx: Pick<Transaction, 'cliente_banco_codigo' | 'cliente_telefono' | 'cliente_cedula' | 'monto_neto'>): string {
  const banco = tx.cliente_banco_codigo.trim();
  const telefono = tx.cliente_telefono.replace(/\D/g, '');
  const cedula = tx.cliente_cedula.replace(/\D/g, '');
  const monto = formatMontoPagoMovil(tx.monto_neto);

  return `${banco}\n${telefono}\n${cedula}\n${monto}`;
}

/**
 * Genera el mensaje para enviar por WhatsApp al cliente informando del pago realizado.
 * Formato amigable y directo solicitado por el usuario:
 * "Hola! Tu avance de efectivo fue realizado correctamente por Bs. X al banco Y. Ref: Z"
 */
export function generateWhatsAppMessage(
  tx: Transaction
): string {
  const montoFormateado = formatCurrencyVE(tx.monto_neto);
  let msg = `Hola! Tu avance de efectivo fue realizado correctamente por ${montoFormateado} al banco ${tx.cliente_banco_nombre}.`;

  if (tx.referencia_pago) {
    msg += `\nReferencia: ${tx.referencia_pago}`;
  }

  return msg;
}

/**
 * Construye el enlace directo wa.me
 * En Venezuela el código de país es 58. Si el teléfono empieza por 0, se le quita el cero.
 * Ej: 04241234567 -> 584241234567
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  const international = clean.startsWith('0') ? `58${clean.substring(1)}` : (clean.startsWith('58') ? clean : `58${clean}`);
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

