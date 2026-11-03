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
 * 042485256565
 * 25156888
 * 15400,00
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
 */
export function generateWhatsAppMessage(
  tx: Transaction,
  businessName = 'Servicio de Avance'
): string {
  const montoFormateado = formatCurrencyVE(tx.monto_neto);
  const fecha = tx.fecha_pago 
    ? new Date(tx.fecha_pago).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  let msg = `*${businessName}* - Comprobante de Pago\n\n`;
  msg += `Hola *${tx.cliente_nombre.trim()}*, le informamos que su avance de efectivo ha sido transferido exitosamente.\n\n`;
  msg += `📌 *Detalles de la Transferencia:*\n`;
  msg += `• *Monto transferido:* ${montoFormateado}\n`;
  msg += `• *Banco destino:* ${tx.cliente_banco_nombre} (${tx.cliente_banco_codigo})\n`;
  msg += `• *Cédula:* ${tx.cliente_cedula}\n`;
  msg += `• *Teléfono Pago Móvil:* ${tx.cliente_telefono}\n`;
  msg += `• *Fecha:* ${fecha}\n`;

  if (tx.referencia_pago) {
    msg += `• *Nro. de Referencia:* ${tx.referencia_pago}\n`;
  }

  if (tx.comprobante_url) {
    msg += `\n📎 *Ver Comprobante digital:* ${tx.comprobante_url}\n`;
  }

  msg += `\n¡Gracias por su confianza!`;
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

