import { supabase } from '@renderer/lib/supabase'

interface ResultadoTalonario {
  numero: string
  success: boolean
}

interface ResultadoAnulacion {
  success: boolean
  mensaje: string
}

/**
 * Hook para gestionar talonarios automáticos y anulación de ventas
 */
export const useTalonarioManager = () => {
  /**
   * Obtener próximo número de talonario automáticamente
   */
  const obtenerProximoTalonario = async (
    institucionId: number,
    tipoTalonario: 'COBRANZA' | 'VENTAS' = 'VENTAS'
  ): Promise<ResultadoTalonario> => {
    try {
      const { data, error } = await supabase.rpc('obtener_proximo_talonario', {
        p_institucion_id: institucionId,
        p_tipo_talonario: tipoTalonario
      })

      if (error) throw error

      return {
        numero: data || '',
        success: !!data
      }
    } catch (error) {
      console.error('Error obteniendo próximo talonario:', error)
      return {
        numero: '',
        success: false
      }
    }
  }

  /**
   * Obtener configuración actual de talonario
   */
  const obtenerConfigTalonario = async (
    institucionId: number,
    tipoTalonario: 'COBRANZA' | 'VENTAS'
  ) => {
    try {
      const { data, error } = await supabase
        .from('talonarios_config')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('tipo_talonario', tipoTalonario)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error obteniendo config talonario:', error)
      return null
    }
  }

  /**
   * Actualizar número de talonario actual
   */
  const actualizarTalonario = async (
    institucionId: number,
    tipoTalonario: 'COBRANZA' | 'VENTAS',
    nuevoNumero: number
  ): Promise<ResultadoAnulacion> => {
    try {
      const { data, error } = await supabase.rpc('resetear_talonario', {
        p_institucion_id: institucionId,
        p_tipo_talonario: tipoTalonario,
        p_nuevo_numero: nuevoNumero
      })

      if (error) throw error

      return {
        success: data?.[0]?.success || false,
        mensaje: data?.[0]?.message || 'Talonario actualizado'
      }
    } catch (error) {
      console.error('Error actualizando talonario:', error)
      return {
        success: false,
        mensaje: 'Error al actualizar talonario'
      }
    }
  }

  /**
   * Anular venta sin eliminarla
   */
  const anularVenta = async (
    ventaId: number,
    motivo: string,
    usuario: string = 'Sistema'
  ): Promise<ResultadoAnulacion> => {
    try {
      const { error } = await supabase
        .from('ventas_insumos')
        .update({
          estado: 'ANULADO',
          fecha_anulacion: new Date().toISOString(),
          motivo_anulacion: motivo,
          anulado_por: usuario
        })
        .eq('id', ventaId)
        .eq('estado', 'VENDIDO')

      if (error) throw error

      return {
        success: true,
        mensaje: 'Venta anulada exitosamente'
      }
    } catch (error) {
      console.error('Error anulando venta:', error)
      return {
        success: false,
        mensaje: 'Error al anular venta'
      }
    }
  }

  /**
   * Reactivar venta anulada
   */
  const reactivarVenta = async (ventaId: number): Promise<ResultadoAnulacion> => {
    try {
      const { error } = await supabase
        .from('ventas_insumos')
        .update({
          estado: 'VENDIDO',
          fecha_anulacion: null,
          motivo_anulacion: null,
          anulado_por: null
        })
        .eq('id', ventaId)
        .eq('estado', 'ANULADO')

      if (error) throw error

      return {
        success: true,
        mensaje: 'Venta reactivada exitosamente'
      }
    } catch (error) {
      console.error('Error reactivando venta:', error)
      return {
        success: false,
        mensaje: 'Error al reactivar venta'
      }
    }
  }

  /**
   * Obtener configuración de talonario para mostrar en Configuración
   */
  const obtenerTodasLasConfiguraciones = async (
    institucionId: number
  ) => {
    try {
      const { data, error } = await supabase
        .from('talonarios_config')
        .select('*')
        .eq('institucion_id', institucionId)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error obteniendo configuraciones:', error)
      return []
    }
  }

  return {
    obtenerProximoTalonario,
    obtenerConfigTalonario,
    actualizarTalonario,
    anularVenta,
    reactivarVenta,
    obtenerTodasLasConfiguraciones
  }
}
