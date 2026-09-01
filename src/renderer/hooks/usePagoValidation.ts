import { supabase } from '@renderer/lib/supabase'

interface ValidacionPago {
  esDuplicado: boolean
  pagoExistente?: {
    id: number
    estado: string
    fecha: string
  }
  mensaje: string
}

interface ResultadoAnulacion {
  success: boolean
  mensaje: string
}

/**
 * Hook para validar pagos duplicados y manejar anulaciones
 * Soporta AMBAS tablas: pagos y pagos_multiples
 */
export const usePagoValidation = () => {
  /**
   * Anular un pago. Detecta si es simple (tabla pagos) o múltiple (tabla pagos_multiples)
   */
  const anularPago = async (
    pagoId: number | string | undefined | null,
    motivo: string,
    usuario: string = 'Sistema'
  ): Promise<ResultadoAnulacion> => {
    try {
      console.log('[anularPago] ID recibido:', pagoId, 'Tipo:', typeof pagoId)
      
      if (!pagoId) {
        throw new Error('ID de pago es requerido')
      }

      // Si el ID viene como pm_37_37, extraer el número real
      let realId: number
      
      if (typeof pagoId === 'string' && pagoId.includes('_')) {
        // Formato: pm_XX_XX → extraer XX
        const partes = pagoId.split('_')
        realId = Number(partes[1])
        console.log('[anularPago] ID extraído del formato visual:', pagoId, '→', realId)
      } else {
        realId = Number(pagoId)
      }
      
      if (isNaN(realId) || realId <= 0) {
        throw new Error(`ID de pago inválido: ${pagoId} → ${realId}`)
      }

      console.log('[anularPago] ID real a usar en BD:', realId)
      
      // Primero intentar anular en tabla pagos_multiples (pagos agrupados)
      const { data: pagoMultiple, error: errorCheck } = await supabase
        .from('pagos_multiples')
        .select('id')
        .eq('id', realId)
        .single()
      
      if (pagoMultiple) {
        // Es un pago múltiple
        console.log('[anularPago] Detectado pago múltiple ID:', realId)
        const { error } = await supabase
          .from('pagos_multiples')
          .update({
            estado: 'ANULADO',
            razon_anulacion: motivo,
            usuario_anulacion: usuario,
            fecha_anulacion: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', realId)

        if (error) throw error

        console.log('[anularPago] Pago múltiple anulado exitosamente:', realId)
        return {
          success: true,
          mensaje: 'Pago anulado exitosamente. No contará como pagado.'
        }
      }
      
      // Si no es múltiple, anular en tabla pagos
      console.log('[anularPago] Detectado pago simple ID:', realId)
      const { error } = await supabase
        .from('pagos')
        .update({
          estado: 'ANULADO',
          razon_anulacion: motivo,
          usuario_anulacion: usuario,
          fecha_anulacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', realId)

      if (error) throw error

      console.log('[anularPago] Pago simple anulado exitosamente:', realId)
      return {
        success: true,
        mensaje: 'Pago anulado exitosamente. No contará como pagado.'
      }
    } catch (error) {
      console.error('Error anulando pago:', error)
      return {
        success: false,
        mensaje: `Error al anular pago: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Anular un pago múltiple sin eliminarlo
   */
  const anularPagoMultiple = async (
    pagoMultipleId: number | string | undefined | null,
    motivo: string,
    usuario: string = 'Sistema'
  ): Promise<ResultadoAnulacion> => {
    try {
      if (!pagoMultipleId) {
        throw new Error('ID de pago múltiple es requerido')
      }

      let realId: number
      
      if (typeof pagoMultipleId === 'string' && pagoMultipleId.includes('_')) {
        const partes = pagoMultipleId.split('_')
        realId = Number(partes[1])
      } else {
        realId = Number(pagoMultipleId)
      }
      
      if (isNaN(realId) || realId <= 0) {
        throw new Error(`ID de pago múltiple inválido: ${pagoMultipleId} → ${realId}`)
      }

      const { error } = await supabase
        .from('pagos_multiples')
        .update({
          estado: 'ANULADO',
          razon_anulacion: motivo,
          usuario_anulacion: usuario,
          fecha_anulacion: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', realId)

      if (error) throw error

      return {
        success: true,
        mensaje: 'Pago múltiple anulado exitosamente. No contará como pagado.'
      }
    } catch (error) {
      console.error('Error anulando pago múltiple:', error)
      return {
        success: false,
        mensaje: `Error al anular pago: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Reactivar un pago anulado (en caso de error)
   */
  const reactivarPago = async (pagoId: number | string | undefined | null): Promise<ResultadoAnulacion> => {
    try {
      if (!pagoId) {
        throw new Error('ID de pago es requerido')
      }

      let realId: number
      
      if (typeof pagoId === 'string' && pagoId.includes('_')) {
        const partes = pagoId.split('_')
        realId = Number(partes[1])
      } else {
        realId = Number(pagoId)
      }
      
      if (isNaN(realId) || realId <= 0) {
        throw new Error(`ID de pago inválido: ${pagoId} → ${realId}`)
      }

      // Intentar reactivar en pagos_multiples primero
      const { data: pagoMultiple } = await supabase
        .from('pagos_multiples')
        .select('id')
        .eq('id', realId)
        .single()
      
      if (pagoMultiple) {
        const { error } = await supabase
          .from('pagos_multiples')
          .update({
            estado: 'REGISTRADO',
            razon_anulacion: null,
            usuario_anulacion: null,
            fecha_anulacion: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', realId)

        if (error) throw error
        return {
          success: true,
          mensaje: 'Pago múltiple reactivado exitosamente'
        }
      }

      // Si no, reactivar en pagos
      const { error } = await supabase
        .from('pagos')
        .update({
          estado: 'REGISTRADO',
          razon_anulacion: null,
          usuario_anulacion: null,
          fecha_anulacion: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', realId)

      if (error) throw error

      return {
        success: true,
        mensaje: 'Pago reactivado exitosamente'
      }
    } catch (error) {
      console.error('Error reactivando pago:', error)
      return {
        success: false,
        mensaje: `Error al reactivar pago: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Reactivar un pago múltiple anulado
   */
  const reactivarPagoMultiple = async (pagoMultipleId: number | string | undefined | null): Promise<ResultadoAnulacion> => {
    try {
      if (!pagoMultipleId) {
        throw new Error('ID de pago múltiple es requerido')
      }

      let realId: number
      
      if (typeof pagoMultipleId === 'string' && pagoMultipleId.includes('_')) {
        const partes = pagoMultipleId.split('_')
        realId = Number(partes[1])
      } else {
        realId = Number(pagoMultipleId)
      }
      
      if (isNaN(realId) || realId <= 0) {
        throw new Error(`ID de pago múltiple inválido: ${pagoMultipleId} → ${realId}`)
      }

      const { error } = await supabase
        .from('pagos_multiples')
        .update({
          estado: 'REGISTRADO',
          razon_anulacion: null,
          usuario_anulacion: null,
          fecha_anulacion: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', realId)

      if (error) throw error

      return {
        success: true,
        mensaje: 'Pago múltiple reactivado exitosamente'
      }
    } catch (error) {
      console.error('Error reactivando pago múltiple:', error)
      return {
        success: false,
        mensaje: `Error al reactivar pago: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  return {
    anularPago,
    anularPagoMultiple,
    reactivarPago,
    reactivarPagoMultiple
  }
}
