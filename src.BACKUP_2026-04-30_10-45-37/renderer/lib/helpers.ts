import { EstadoEstudiante } from '@renderer/lib/database.types'
import { formatearFechaLocal, calcularDiasEntre, obtenerFechaLocal } from '@renderer/lib/dateUtils'

/**
 * Calcula el monto a pagar según el estado del estudiante
 * @param estadoEstudiante - Estado: ACTIVO, BECADO_100, BECADO_50, NO_VIENE_MAS
 * @param montoOriginal - Monto original del concepto
 * @returns Monto a pagar
 */
export const calcularMontoPagable = (
  estadoEstudiante: EstadoEstudiante,
  montoOriginal: number
): number => {
  switch (estadoEstudiante) {
    case EstadoEstudiante.BECADO_100:
      return 0 // No paga
    case EstadoEstudiante.BECADO_50:
      return montoOriginal / 2
    case EstadoEstudiante.ACTIVO:
    case EstadoEstudiante.NO_VIENE_MAS:
    default:
      return montoOriginal
  }
}

/**
 * Obtiene descripción legible del estado
 */
export const getDescripcionEstado = (estado: EstadoEstudiante): string => {
  const descripciones: Record<EstadoEstudiante, string> = {
    ACTIVO: 'Activo - Paga cuota completa',
    BECADO_100: 'Becado 100% - No paga',
    BECADO_50: 'Becado 50% - Paga mitad',
    NO_VIENE_MAS: 'No viene más - Excluido'
  }
  return descripciones[estado]
}

/**
 * Obtiene color para mostrar estado
 */
export const getColorEstado = (estado: EstadoEstudiante): string => {
  const colores: Record<EstadoEstudiante, string> = {
    ACTIVO: 'bg-blue-100 text-blue-800',
    BECADO_100: 'bg-green-100 text-green-800',
    BECADO_50: 'bg-yellow-100 text-yellow-800',
    NO_VIENE_MAS: 'bg-red-100 text-red-800'
  }
  return colores[estado]
}

/**
 * Formatea número como moneda ARS
 */
export const formatoMoneda = (monto: number, currency = 'ARS'): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(monto)
}

/**
 * Formatea fecha a DD/MM/YYYY
 * NOTA: Usar formatearFechaLocal() de dateUtils.ts en lugar de esta función
 */
export const formatoFecha = (fecha: Date | string): string => {
  return formatearFechaLocal(fecha)
}

/**
 * Obtiene nombre del mes
 */
export const getNombreMes = (mes: number): string => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[mes - 1] || 'Mes inválido'
}

/**
 * Calcula porcentaje con decimales
 */
export const calcularPorcentaje = (parte: number, total: number): number => {
  if (total === 0) return 0
  return (parte / total) * 100
}

/**
 * Formatea porcentaje
 */
export const formatoPorcentaje = (valor: number, decimales = 1): string => {
  return `${valor.toFixed(decimales)}%`
}

/**
 * Validar DNI argentino (básico)
 */
export const validarDNI = (dni: string): boolean => {
  const dniLimpio = dni.replace(/[^\d]/g, '')
  if (dniLimpio.length < 7 || dniLimpio.length > 9) return false
  return !isNaN(Number(dniLimpio))
}

/**
 * Obtener nombre descriptivo del método de pago
 */
export const getDescripcionMetodoPago = (metodo: string): string => {
  const descripciones: Record<string, string> = {
    EFECTIVO: '💵 Efectivo',
    TRANSFERENCIA: '🏦 Transferencia',
    TARJETA: '💳 Tarjeta',
    CHEQUE: '✓ Cheque'
  }
  return descripciones[metodo] || metodo
}

/**
 * Obtener color para método de pago
 */
export const getColorMetodoPago = (metodo: string): string => {
  const colores: Record<string, string> = {
    EFECTIVO: 'bg-green-100 text-green-800',
    TRANSFERENCIA: 'bg-blue-100 text-blue-800',
    TARJETA: 'bg-purple-100 text-purple-800',
    CHEQUE: 'bg-gray-100 text-gray-800'
  }
  return colores[metodo] || 'bg-gray-100 text-gray-800'
}

/**
 * Diferencia entre dos fechas en días
 * NOTA: Usar calcularDiasEntre() de dateUtils.ts en lugar de esta función
 */
export const diasTranscurridos = (fecha1: Date | string, fecha2: Date | string): number => {
  return calcularDiasEntre(fecha1, fecha2)
}

/**
 * Verifica si una fecha está en mora (más de 30 días sin pagar)
 * NOTA: Usa la fecha local del sistema
 */
export const estaMora = (fechaVencimiento: Date | string, tolerancia = 30): boolean => {
  const dias = calcularDiasEntre(fechaVencimiento, obtenerFechaLocal())
  return dias > tolerancia
}
