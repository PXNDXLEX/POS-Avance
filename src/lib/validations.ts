export const VENEZUELAN_PHONE_PREFIXES = [
  '0424',
  '0414',
  '0412',
  '0422',
  '0416',
  '0426',
] as const;

/**
 * Valida un número telefónico venezolano.
 * Requisitos:
 * - Debe comenzar con un prefijo válido: 0424, 0414, 0412, 0422, 0416, 0426.
 * - Debe tener exactamente 11 dígitos numéricos en total (prefijo de 4 dígitos + 7 dígitos restantes).
 */
export function validateVenezuelanPhone(phone: string): { isValid: boolean; error?: string } {
  const clean = phone.replace(/\D/g, '');
  if (!clean) {
    return { isValid: false, error: 'El número de teléfono es obligatorio.' };
  }

  if (clean.length !== 11) {
    return {
      isValid: false,
      error: `El teléfono debe tener 11 dígitos exactos (actual: ${clean.length}).`,
    };
  }

  const prefix = clean.substring(0, 4);
  const isValidPrefix = (VENEZUELAN_PHONE_PREFIXES as readonly string[]).includes(prefix);

  if (!isValidPrefix) {
    return {
      isValid: false,
      error: `El prefijo "${prefix}" no es válido. Debe iniciar con ${VENEZUELAN_PHONE_PREFIXES.join(', ')}.`,
    };
  }

  return { isValid: true };
}

/**
 * Valida la cédula de identidad venezolana.
 * Requisitos:
 * - Solo números.
 * - Entre 6 y 8 dígitos numéricos (estándar nacional para personas naturales).
 */
export function validateVenezuelanCedula(cedula: string): { isValid: boolean; error?: string } {
  const clean = cedula.replace(/\D/g, '');
  if (!clean) {
    return { isValid: false, error: 'La cédula es obligatoria.' };
  }

  // Verifica que no tenga caracteres no numéricos en la entrada original
  if (/[^0-9]/.test(cedula.trim())) {
    return { isValid: false, error: 'La cédula debe contener solo números.' };
  }

  if (clean.length < 6 || clean.length > 8) {
    return {
      isValid: false,
      error: `La cédula debe tener entre 6 y 8 dígitos numéricos (actual: ${clean.length}).`,
    };
  }

  return { isValid: true };
}

/**
 * Valida montos numéricos (monto bruto, comisión)
 */
export function validateAmount(val: number | string): { isValid: boolean; error?: string } {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num) || num <= 0) {
    return { isValid: false, error: 'El monto debe ser un número mayor a cero.' };
  }
  return { isValid: true };
}

/**
 * Valida porcentaje de comisión
 */
export function validateCommission(val: number | string): { isValid: boolean; error?: string } {
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num) || num < 0 || num > 100) {
    return { isValid: false, error: 'El porcentaje debe estar entre 0% y 100%.' };
  }
  return { isValid: true };
}

