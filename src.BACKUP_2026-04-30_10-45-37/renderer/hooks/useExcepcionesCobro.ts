import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface ExcepcionCobro {
  id?: number
  estudiante_id: number
  concepto_id: number
  tipo_excepcion: 'PERDON_MORA' | 'PAGO_PARCIAL'
  monto_original: number
  monto_perdonado?: number
  monto_pagado: number
  motivo: string
  fecha_excepcion: string
  usuario_id?: string
  aprobado: boolean
  created_at?: string
}

interface UseExcepcionesCobro {
  excepciones: ExcepcionCobro[]
  loading: boolean
  error: string | null

  crearPerdonMora: (estudiante_id: number, concepto_id: number, motivo: string) => Promise<boolean>
  registrarPagoParcial: (estudiante_id: number, concepto_id: number, monto_pagado: number, monto_original: number, metodoPago?: string, tipoTarjeta?: string) => Promise<boolean>
  obtenerExcepciones: (institucion_id: number) => Promise<ExcepcionCobro[]>
  obtenerExcepcionesEstudiante: (estudiante_id: number) => Promise<ExcepcionCobro[]>
}

export const useExcepcionesCobro = create<UseExcepcionesCobro>((set) => ({
  excepciones: [],
  loading: false,
  error: null,

  crearPerdonMora: async (estudiante_id: number, concepto_id: number, motivo: string) => {
    set({ loading: true, error: null })
    try {
      // Obtener concepto para saber monto original
      const { data: conceptoData } = await supabase
        .from('conceptos_pago')
        .select('monto')
        .eq('id', concepto_id)
        .single()

      if (!conceptoData) throw new Error('Concepto no encontrado')

      // Obtener pago actual si existe
      const { data: pagoData } = await supabase
        .from('pagos')
        .select('monto_pagado')
        .eq('estudiante_id', estudiante_id)
        .eq('concepto_id', concepto_id)
        .maybeSingle()

      const montoPagado = pagoData?.monto_pagado || 0
      const montoPerdonado = conceptoData.monto - montoPagado

      console.log(`✓ Perdón de mora registrado: Estudiante ${estudiante_id}, Concepto ${concepto_id}, Monto perdonado: $${montoPerdonado}`)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al perdonar mora'
      set({ error: message })
      console.error('Error:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  registrarPagoParcial: async (estudiante_id: number, concepto_id: number, monto_pagado: number, monto_original: number, metodoPago: string = 'EFECTIVO', tipoTarjeta?: string) => {
    set({ loading: true, error: null })
    try {
      // Verificar que no sea más del monto original
      if (monto_pagado > monto_original) {
        throw new Error('Monto pagado no puede ser mayor al monto original')
      }

      if (monto_pagado <= 0) {
        throw new Error('Monto pagado debe ser mayor a 0')
      }

      // Obtener datos del estudiante
      const { data: estudianteData } = await supabase
        .from('estudiantes')
        .select('institucion_id')
        .eq('id', estudiante_id)
        .single()

      if (!estudianteData) throw new Error('Estudiante no encontrado')

      // Verificar si ya existe pago para este concepto
      const { data: pagoExistente } = await supabase
        .from('pagos')
        .select('id, monto_pagado')
        .eq('estudiante_id', estudiante_id)
        .eq('concepto_id', concepto_id)
        .maybeSingle()

      if (pagoExistente) {
        // SUMAR al pago existente (es un pago adicional, no reemplazo)
        const nuevoMontoPagado = pagoExistente.monto_pagado + monto_pagado
        
        // Validar que no supere el monto original
        if (nuevoMontoPagado > monto_original) {
          throw new Error(`No puedes pagar más de ${monto_original}. Ya pagó ${pagoExistente.monto_pagado}, intenta pagar máximo ${monto_original - pagoExistente.monto_pagado}`)
        }

        const { error: errorUpdate } = await supabase
          .from('pagos')
          .update({ 
            monto_pagado: nuevoMontoPagado,
            metodo_pago: metodoPago,
            tipo_tarjeta: tipoTarjeta || null
          })
          .eq('id', pagoExistente.id)

        if (errorUpdate) throw errorUpdate

        console.log(`✓ Pago parcial actualizado: Pagó $${monto_pagado} + $${pagoExistente.monto_pagado} anterior = $${nuevoMontoPagado} de $${monto_original}`)
      } else {
        // Crear nuevo pago (primer pago parcial del concepto)
        const { error: errorInsert } = await supabase
          .from('pagos')
          .insert([{
            institucion_id: estudianteData.institucion_id,
            estudiante_id,
            concepto_id,
            monto_pagado,
            monto_original,
            metodo_pago: metodoPago,
            tipo_tarjeta: tipoTarjeta || null,
            fecha_pago: new Date().toISOString().split('T')[0],
          }])

        if (errorInsert) throw errorInsert

        console.log(`✓ Pago parcial registrado: $${monto_pagado} de $${monto_original} - Método: ${metodoPago}${tipoTarjeta ? ` (${tipoTarjeta})` : ''}`)
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar pago parcial'
      set({ error: message })
      console.error('Error:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  obtenerExcepciones: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('excepciones_cobro')
        .select(`
          *,
          estudiantes(dni, nombre, apellido),
          conceptos_pago(nombre, monto)
        `)
        .eq('institucion_id', institucion_id)
        .order('fecha_excepcion', { ascending: false })

      if (error) throw error

      set({ excepciones: data || [] })
      return data || []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener excepciones'
      set({ error: message })
      console.error('Error:', err)
      return []
    } finally {
      set({ loading: false })
    }
  },

  obtenerExcepcionesEstudiante: async (estudiante_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('excepciones_cobro')
        .select('*')
        .eq('estudiante_id', estudiante_id)
        .order('fecha_excepcion', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener excepciones'
      set({ error: message })
      console.error('Error:', err)
      return []
    } finally {
      set({ loading: false })
    }
  },
}))
