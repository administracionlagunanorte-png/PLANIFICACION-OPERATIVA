/**
 * Formato centralizado de moneda para la aplicación.
 * Todas las cifras se muestran en Pesos Chilenos (CLP).
 *
 * Reglas CLP:
 *  - Sin decimales (el peso chileno no usa centavos)
 *  - Separador de miles: punto (.)
 *  - Símbolo: $ precediendo al número
 *  - Ejemplo: $1.234.567
 */

const CLP_FORMATTER = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/**
 * Formatea un número como pesos chilenos (CLP).
 *
 * @example
 * formatCLP(1234567)  // → "$1.234.567"
 * formatCLP(850.5)    // → "$851"  (se redondea)
 * formatCLP(0)        // → "$0"
 */
export function formatCLP(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '$0'
  return CLP_FORMATTER.format(Math.round(amount))
}

/**
 * Formatea un número como pesos chilenos para planillas Excel.
 * Devuelve el número sin símbolo para que Excel aplique su propio formato.
 *
 * @example
 * formatCLPForExcel(1234567)  // → 1234567
 */
export function formatCLPForExcel(amount: number | undefined | null): number {
  if (amount == null || isNaN(amount)) return 0
  return Math.round(amount)
}
