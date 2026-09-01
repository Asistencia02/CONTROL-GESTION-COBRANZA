import { useState, useEffect } from 'react'
import { calcularMora, CalculoMoraResult } from '@renderer/lib/moraCalculator'

/**
 * Hook para calcular mora en una cuota
 * Se usa al seleccionar un concepto de pago en Cobranzas
 */
export const useMora = (
  mesVencimiento: number | null,
  montoOriginal: number,
  recargoPorcentaje: number = 20
) => {
  const [mora, setMora] = useState<CalculoMoraResult | null>(null)

  useEffect(() => {
    if (mesVencimiento && montoOriginal > 0) {
      const resultado = calcularMora(mesVencimiento, montoOriginal, recargoPorcentaje)
      setMora(resultado)

      // Actualizar cada minuto para cambios en tolerancia/mora
      const intervalo = setInterval(() => {
        const resultadoActualizado = calcularMora(mesVencimiento, montoOriginal, recargoPorcentaje)
        setMora(resultadoActualizado)
      }, 60000) // Cada 60 segundos

      return () => clearInterval(intervalo)
    }
  }, [mesVencimiento, montoOriginal, recargoPorcentaje])

  return mora
}
