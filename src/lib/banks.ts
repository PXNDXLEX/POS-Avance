import { Bank } from './types';

/**
 * Lista oficial de Bancos de Venezuela con sus códigos SUDEBAN de 4 dígitos.
 * Utilizados para operaciones de Pago Móvil y transferencias interbancarias.
 */
export const VENEZUELAN_BANKS: Bank[] = [
  { code: '0102', name: 'Banco de Venezuela, S.A.', shortName: 'Banco de Venezuela' },
  { code: '0104', name: 'Venezolano de Crédito, S.A.', shortName: 'Venezolano de Crédito' },
  { code: '0105', name: 'Banco Mercantil, C.A.', shortName: 'Mercantil' },
  { code: '0108', name: 'Banco Provincial, S.A.', shortName: 'BBVA Provincial' },
  { code: '0114', name: 'Bancaribe C.A.', shortName: 'Bancaribe' },
  { code: '0115', name: 'Banco Exterior, C.A.', shortName: 'Banco Exterior' },
  { code: '0128', name: 'Banco Caroní, C.A.', shortName: 'Banco Caroní' },
  { code: '0134', name: 'Banesco Banco Universal, C.A.', shortName: 'Banesco' },
  { code: '0137', name: 'Banco Sofitasa, C.A.', shortName: 'Sofitasa' },
  { code: '0138', name: 'Banco Plaza, C.A.', shortName: 'Banco Plaza' },
  { code: '0151', name: 'BFC Banco Fondo Común, C.A.', shortName: 'Fondo Común (BFC)' },
  { code: '0156', name: '100% Banco, Banco Universal C.A.', shortName: '100% Banco' },
  { code: '0157', name: 'DelSur Banco Universal, C.A.', shortName: 'DelSur' },
  { code: '0163', name: 'Banco del Tesoro, C.A.', shortName: 'Banco del Tesoro' },
  { code: '0166', name: 'Banco Agrícola de Venezuela, C.A.', shortName: 'Banco Agrícola' },
  { code: '0168', name: 'Bancrecer, S.A. Banco Microfinanciero', shortName: 'Bancrecer' },
  { code: '0169', name: 'Mi Banco, Banco Microfinanciero C.A.', shortName: 'Mi Banco' },
  { code: '0171', name: 'Banco Activo, C.A.', shortName: 'Banco Activo' },
  { code: '0172', name: 'Bancamiga Banco Universal, C.A.', shortName: 'Bancamiga' },
  { code: '0174', name: 'Banplus Banco Universal, C.A.', shortName: 'Banplus' },
  { code: '0175', name: 'Banco Bicentenario del Pueblo, de la Clase Obrera, Mujer y Comunas, C.A.', shortName: 'Bicentenario' },
  { code: '0177', name: 'Banco de la Fuerza Armada Nacional Bolivariana (BANFANB)', shortName: 'BANFANB' },
  { code: '0191', name: 'Banco Nacional de Crédito, C.A. (BNC)', shortName: 'BNC' },
];

export function findBankByCode(code: string): Bank | undefined {
  return VENEZUELAN_BANKS.find(b => b.code === code);
}

