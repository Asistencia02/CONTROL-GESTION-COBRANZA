import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface ConfiguracionCarrera {
  id?: number
  carrera_id: number
  institucion_id: number
  monto_inscripcion: number
  monto_cuota: number
  monto_seguro: number
  recargo_mora_porcentaje: number
  dias_vencimiento: number
  activo: boolean
  created_at?: string
  updated_at?: string
}

interface UseConfiguracionStore {
  configuraciones: ConfiguracionCarrera[]
  loading: boolean
  error: string | null

  cargarConfiguracionesPorInstitucion: (institucion_id: number) => Promise<void>
  guardarConfiguracionCarrera: (config: ConfiguracionCarrera) => Promise<void>
  actualizarConfiguracionCarrera: (carrera_id: number, updates: Partial<ConfiguracionCarrera>) => Promise<void>
  actualizarMontosEnConceptosPendientes: (carrera_id: number, institucion_id: number, updates: Partial<ConfiguracionCarrera>) => Promise<void>
}

export const useConfiguracion = create<UseConfiguracionStore>((set, get) => ({
  configuraciones: [],
  loading: false,
  error: null,

  cargarConfiguracionesPorInstitucion: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('configuracion_carreras')
        .select('*')
        .eq('institucion_id', institucion_id)

      if (error) throw error
      set({ configuraciones: data || [] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error cargando configuración'
      set({ error: message })
      console.error('Error:', err)
    } finally {
      set({ loading: false })
    }
  },

  guardarConfiguracionCarrera: async (config: ConfiguracionCarrera) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.from('configuracion_carreras').insert([config])

      if (error) throw error
      set((state) => ({
        configuraciones: [...state.configuraciones, config],
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error guardando configuración'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  actualizarMontosEnConceptosPendientes: async (carrera_id: number, institucion_id: number, updates: Partial<ConfiguracionCarrera>) => {
    try {
      console.log('Iniciando sincronización de montos para institución:', institucion_id)
      
      // Obtener conceptos activos para esta institución
      const { data: conceptos, error: errorConceptos } = await supabase
        .from('conceptos_pago')
        .select('id, tipo, monto')
        .eq('institucion_id', institucion_id)
        .eq('activo', true)

      if (errorConceptos) {
        console.error('Error obteniendo conceptos:', errorConceptos)
        return
      }

      if (!conceptos || conceptos.length === 0) {
        console.log('No hay conceptos para actualizar')
        return
      }

      // Actualizar INSCRIPCIÓN - TODOS sin verificar pagos anteriores
      if (updates.monto_inscripcion !== undefined) {
        const conceptosInscripcion = conceptos.filter(c => c.tipo.toUpperCase() === 'INSCRIPCION')
        for (const concepto of conceptosInscripcion) {
          const { error: errorUpdate } = await supabase
            .from('conceptos_pago')
            .update({ monto: updates.monto_inscripcion })
            .eq('id', concepto.id)
          
          if (!errorUpdate) {
            console.log(`✓ Actualizado concepto INSCRIPCIÓN ${concepto.id} a ${updates.monto_inscripcion}`)
          } else {
            console.error(`Error actualizando concepto ${concepto.id}:`, errorUpdate)
          }
        }
      }

      // Actualizar SEGURO - TODOS sin verificar pagos anteriores
      if (updates.monto_seguro !== undefined) {
        const conceptosSeguro = conceptos.filter(c => c.tipo.toUpperCase() === 'SEGURO')
        for (const concepto of conceptosSeguro) {
          const { error: errorUpdate } = await supabase
            .from('conceptos_pago')
            .update({ monto: updates.monto_seguro })
            .eq('id', concepto.id)
          
          if (!errorUpdate) {
            console.log(`✓ Actualizado concepto SEGURO ${concepto.id} a ${updates.monto_seguro}`)
          } else {
            console.error(`Error actualizando concepto ${concepto.id}:`, errorUpdate)
          }
        }
      }

      // Actualizar CUOTAS (enero a diciembre) - TODOS sin verificar pagos anteriores
      if (updates.monto_cuota !== undefined) {
        const conceptosCuota = conceptos.filter(c => c.tipo.toUpperCase() === 'CUOTA')
        for (const concepto of conceptosCuota) {
          const { error: errorUpdate } = await supabase
            .from('conceptos_pago')
            .update({ monto: updates.monto_cuota })
            .eq('id', concepto.id)
          
          if (!errorUpdate) {
            console.log(`✓ Actualizado concepto CUOTA ${concepto.id} a ${updates.monto_cuota}`)
          } else {
            console.error(`Error actualizando concepto ${concepto.id}:`, errorUpdate)
          }
        }
      }

      console.log('✓ Sincronización de montos completada - TODOS los conceptos actualizados')
    } catch (err) {
      console.error('Error actualizando montos en conceptos pendientes:', err)
    }
  },

  actualizarConfiguracionCarrera: async (carrera_id: number, updates: Partial<ConfiguracionCarrera>) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('configuracion_carreras')
        .update(updates)
        .eq('carrera_id', carrera_id)

      if (error) throw error
      
      const state = get()
      const config = state.configuraciones.find(c => c.carrera_id === carrera_id)
      
      if (config) {
        // Sincronizar los cambios de montos a TODOS los conceptos
        console.log('Iniciando sincronización desde actualizarConfiguracionCarrera')
        await get().actualizarMontosEnConceptosPendientes(carrera_id, config.institucion_id, updates)
      }
      
      set((state) => ({
        configuraciones: state.configuraciones.map((c) =>
          c.carrera_id === carrera_id ? { ...c, ...updates } : c
        ),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error actualizando configuración'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },
}))
