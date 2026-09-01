/**
 * Calcula si una cuota está vencida y determina el recargo por mora
 * MORA = 20% FIJO por concepto vencido DESPUÉS del día de vencimiento
 * 
 * Lógica:
 * - Vencimiento = día 10 (o lunes si cae fin de semana)
 * - Día 10/lunes = Sin mora
 * - Día 11 en adelante = Con mora 20%
 * 
 * IMPORTANTE: Todas las fechas se manejan en timezone local del usuario
 */

import { obtenerFechaLocal } from './dateUtils'

export interface CalculoMoraResult {
  estaVencida: boolean
  diasMora: number
  fechaVencimiento: Date
  fechaVencimientoReal: Date
  recargoPorcentaje: number
  montoRecargo: number
  montoTotalConRecargo: number
  toleranciaVigente: boolean
  mensaje: string
}

/**
 * Obtiene el día hábil si cae en fin de semana
 */
export const obtenerFechaHabil = (fecha: Date): Date => {
  const fechaCopia = new Date(fecha)
  const diaSemana = fechaCopia.getDay()

  if (diaSemana === 6) {
    // Sábado: agregar 2 días (lunes)
    fechaCopia.setDate(fechaCopia.getDate() + 2)
  } else if (diaSemana === 0) {
    // Domingo: agregar 1 día (lunes)
    fechaCopia.setDate(fechaCopia.getDate() + 1)
  }

  return fechaCopia
}

/**
 * Calcula mora con 20% FIJO después del día de vencimiento
 * @param mesVencimiento - Mes de vencimiento (1-12)
 * @param montoOriginal - Monto de la cuota sin recargo
 * @param recargoPorcentaje - Porcentaje de recargo (20%)
 * @param diaVencimiento - Día de vencimiento (defecto 10)
 */
export const calcularMora = (
  mesVencimiento: number,
  montoOriginal: number,
  recargoPorcentaje: number = 20,
  diaVencimiento: number = 10
): CalculoMoraResult => {
  const ahora = obtenerFechaLocal()
  const anioActual = ahora.getFullYear()

  // Crear fecha de vencimiento (día 10) en timezone local
  let fechaVencimiento = new Date(anioActual, mesVencimiento - 1, diaVencimiento)

  // Si la fecha ya pasó este año, considerar próximo año
  if (fechaVencimiento.getTime() < new Date(anioActual, 0, 1).getTime()) {
    fechaVencimiento = new Date(anioActual + 1, mesVencimiento - 1, diaVencimiento)
  }

  // Obtener fecha hábil (si cae fin de semana, mover a lunes)
  const fechaVencimientoReal = obtenerFechaHabil(fechaVencimiento)

  // Calcular si está vencida (comparando solo fechas, sin hora)
  // Vencida = cuando ya pasó el día de vencimiento hábil (sin tolerancia)
  const fechaAhoraComparacion = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const fechaVencimientoComparacion = new Date(
    fechaVencimientoReal.getFullYear(),
    fechaVencimientoReal.getMonth(),
    fechaVencimientoReal.getDate()
  )
  const estaVencida = fechaAhoraComparacion.getTime() > fechaVencimientoComparacion.getTime()

  // Calcular días de mora (desde el día DESPUÉS de vencimiento)
  let diasMora = 0
  if (estaVencida) {
    const fechaDiaPos = new Date(fechaVencimientoReal)
    fechaDiaPos.setDate(fechaDiaPos.getDate() + 1) // Día siguiente al vencimiento
    
    const diferenciaTiempo = ahora.getTime() - fechaDiaPos.getTime()
    diasMora = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24))
    
    // Si es el mismo día, diasMora = 0 (se cobra sin mora)
    if (diasMora < 0) diasMora = 0
  }

  // Calcular recargo: 20% FIJO solo si está vencida (después del día 10/lunes)
  let montoRecargo = 0
  let montoTotalConRecargo = montoOriginal

  if (estaVencida) {
    // 20% fijo por concepto vencido
    montoRecargo = montoOriginal * (recargoPorcentaje / 100)
    montoTotalConRecargo = montoOriginal + montoRecargo
  }

  // Determinar si está en período de tolerancia (MISMO DÍA de vencimiento)
  const toleranciaVigente = !estaVencida && 
    ahora.getFullYear() === fechaVencimientoReal.getFullYear() &&
    ahora.getMonth() === fechaVencimientoReal.getMonth() &&
    ahora.getDate() === fechaVencimientoReal.getDate()

  // Mensaje descriptivo
  let mensaje = ''
  if (toleranciaVigente) {
    mensaje = `✓ Hoy es el vencimiento (${fechaVencimientoReal.toLocaleDateString('es-AR')}) - Sin mora`
  } else if (estaVencida) {
    mensaje = `⚠️ Vencida - Recargo 20%: $${montoRecargo.toFixed(2)}`
  } else {
    const diasRestantes = Math.ceil(
      (fechaVencimientoReal.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    )
    mensaje = `✓ Vence en ${diasRestantes} días (${fechaVencimientoReal.toLocaleDateString('es-AR')})`
  }

  return {
    estaVencida,
    diasMora,
    fechaVencimiento,
    fechaVencimientoReal,
    recargoPorcentaje,
    montoRecargo,
    montoTotalConRecargo,
    toleranciaVigente,
    mensaje,
  }
}

/**
 * Versión simplificada que retorna solo el monto total con recargo
 */
export const calcularMontoConMora = (
  mesVencimiento: number,
  montoOriginal: number,
  recargoPorcentaje: number = 20
): number => {
  const resultado = calcularMora(mesVencimiento, montoOriginal, recargoPorcentaje)
  return resultado.montoTotalConRecargo
}
