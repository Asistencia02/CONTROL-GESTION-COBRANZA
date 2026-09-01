import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'
import { Estudiante, EstadoEstudiante } from '@renderer/lib/database.types'

interface EstudianteWithCarrera extends Estudiante {
  carreras?: { nombre: string }
}

interface UseEstudiantesStore {
  estudiantes: EstudianteWithCarrera[]
  loading: boolean
  error: string | null
  
  cargarEstudiantes: (institucion_id: number) => Promise<void>
  agregarEstudiante: (estudiante: Omit<Estudiante, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  actualizarEstudiante: (id: number, updates: Partial<Estudiante>) => Promise<void>
  cambiarEstado: (id: number, estado: EstadoEstudiante) => Promise<void>
  eliminarEstudiante: (id: number) => Promise<void>
  buscarPorDNI: (dni: string) => EstudianteWithCarrera | undefined
}

/**
 * WORKAROUND: Insertar sin que Supabase genere ?columns=
 * Usamos directamente el fetch sin pasar por el builder de Supabase
 */
const insertEstudianteDirecto = async (data: any) => {
  try {
    const response = await fetch(
      `${supabase.supabaseUrl}/rest/v1/estudiantes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify([data]),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al insertar')
    }

    const resultado = await response.json()
    return { data: resultado, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export const useEstudiantes = create<UseEstudiantesStore>((set, get) => ({
  estudiantes: [],
  loading: false,
  error: null,

  cargarEstudiantes: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*, carreras(nombre)')
        .eq('institucion_id', institucion_id)
        .order('apellido', { ascending: true })

      if (error) throw error
      set({ estudiantes: data as EstudianteWithCarrera[] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar estudiantes'
      set({ error: message })
      console.error('Error loading estudiantes:', err)
    } finally {
      set({ loading: false })
    }
  },

  agregarEstudiante: async (estudiante) => {
    set({ loading: true, error: null })
    try {
      // ✅ WORKAROUND: Usar fetch directo en lugar de Supabase client
      // Esto evita que Supabase genere ?columns= automáticamente
      console.log('📝 Insertando estudiante con fetch directo...')
      
      const datosInsert = {
        institucion_id: estudiante.institucion_id,
        dni: estudiante.dni,
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        carrera_id: estudiante.carrera_id,
        email: estudiante.email || null,
        telefono: estudiante.telefono || null,
        estado: estudiante.estado || 'ACTIVO',
        fecha_ingreso: estudiante.fecha_ingreso || new Date().toISOString().split('T')[0],
      }

      const { data: insertedData, error: insertError } = await insertEstudianteDirecto(datosInsert)

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      if (!insertedData || insertedData.length === 0) {
        throw new Error('No se pudo agregar el estudiante')
      }

      const estudianteId = insertedData[0].id
      console.log('✅ Estudiante insertado con ID:', estudianteId)

      // Step 2: Fetch del estudiante insertado con relaciones
      const { data: fetchedData, error: fetchError } = await supabase
        .from('estudiantes')
        .select('*, carreras(nombre)')
        .eq('id', estudianteId)
        .single()

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }

      console.log('✅ Estudiante cargado con relaciones')

      set(state => ({
        estudiantes: [...state.estudiantes, fetchedData as EstudianteWithCarrera]
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al agregar estudiante'
      set({ error: message })
      console.error('Error en agregarEstudiante:', err)
      throw err
    } finally {
      set({ loading: false })
    }
  },

  actualizarEstudiante: async (id: number, updates) => {
    set({ loading: true, error: null })
    try {
      // Step 1: Update (usar client de Supabase, que funciona bien)
      const { error: updateError } = await supabase
        .from('estudiantes')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      // Step 2: Fetch del estudiante actualizado
      const { data, error: fetchError } = await supabase
        .from('estudiantes')
        .select('*, carreras(nombre)')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      set(state => ({
        estudiantes: state.estudiantes.map(e => 
          e.id === id ? (data as EstudianteWithCarrera) : e
        )
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar estudiante'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  cambiarEstado: async (id: number, estado: EstadoEstudiante) => {
    await get().actualizarEstudiante(id, { estado })
  },

  eliminarEstudiante: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('estudiantes')
        .delete()
        .eq('id', id)

      if (error) throw error
      set(state => ({
        estudiantes: state.estudiantes.filter(e => e.id !== id)
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar estudiante'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  buscarPorDNI: (dni: string) => {
    return get().estudiantes.find(e => e.dni === dni)
  }
}))
