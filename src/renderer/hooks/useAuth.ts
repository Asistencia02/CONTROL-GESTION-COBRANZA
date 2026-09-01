import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface Usuario {
  id: number
  nombre_completo: string
  rol: 'ADMIN' | 'USER'
  activo: boolean
  puede_cambiar_institucion: boolean
  ultimo_acceso?: string
}

export interface UsuarioModulo {
  id: number
  usuario_id: number
  modulo: string
  permitido: boolean
}

interface UseAuthStore {
  usuarioActual: Usuario | null
  modulosPermitidos: string[]
  institucionesPermitidas: any[]
  loading: boolean
  error: string | null
  autenticado: boolean
  sesionRestaurada: boolean

  login: (nombreCompleto: string, contraseña: string) => Promise<boolean>
  logout: () => void
  restaurarSesion: () => void
  cargarModulosPermitidos: (usuario_id: number) => Promise<void>
  cargarInstitucionesPermitidas: (usuario_id: number, rol: string) => Promise<void>
  obtenerTodosLosUsuarios: () => Promise<Usuario[]>
  actualizarPermisosUsuario: (usuario_id: number, modulos: { modulo: string; permitido: boolean }[]) => Promise<boolean>
  obtenerPermisosUsuario: (usuario_id: number) => Promise<UsuarioModulo[]>
  actualizarInstitucionesUsuario: (usuario_id: number, instituciones: number[]) => Promise<boolean>
  obtenerInstitucionesUsuario: (usuario_id: number) => Promise<any[]>
  actualizarPuedeCambiarInstitucion: (usuario_id: number, puede: boolean) => Promise<boolean>
  actualizarContraseniaUsuario: (usuario_id: number, contrasenia: string) => Promise<boolean>
}

export const useAuth = create<UseAuthStore>((set, get) => {
  // Restaurar sesión al crear el store
  const usuarioGuardado = typeof window !== 'undefined' ? localStorage.getItem('usuarioActual') : null
  const modulosGuardados = typeof window !== 'undefined' ? localStorage.getItem('modulosPermitidos') : null
  const institucionesGuardadas = typeof window !== 'undefined' ? localStorage.getItem('institucionesPermitidas') : null

  const estadoInicial = {
    usuarioActual: usuarioGuardado ? JSON.parse(usuarioGuardado) : null,
    modulosPermitidos: modulosGuardados ? JSON.parse(modulosGuardados) : [],
    institucionesPermitidas: institucionesGuardadas ? JSON.parse(institucionesGuardadas) : [],
    loading: false,
    error: null,
    autenticado: !!usuarioGuardado,
    sesionRestaurada: true,
  }

  return {
    ...estadoInicial,

    login: async (nombreCompleto: string, contraseña: string) => {
      set({ loading: true, error: null })
      try {
        const { data: usuarios, error: errorBusqueda } = await supabase
          .from('usuarios')
          .select('*')
          .eq('nombre_completo', nombreCompleto)
          .single()

        if (errorBusqueda || !usuarios) {
          set({ error: 'Usuario no encontrado' })
          return false
        }

        if (!usuarios.activo) {
          set({ error: 'Usuario inactivo' })
          return false
        }

        if (usuarios.contraseña !== contraseña) {
          set({ error: 'Contraseña incorrecta' })
          return false
        }

        // Actualizar último acceso
        await supabase
          .from('usuarios')
          .update({ ultimo_acceso: new Date().toISOString() })
          .eq('id', usuarios.id)

        const usuario: Usuario = {
          id: usuarios.id,
          nombre_completo: usuarios.nombre_completo,
          rol: usuarios.rol || 'USER',
          activo: usuarios.activo,
          puede_cambiar_institucion: usuarios.puede_cambiar_institucion || false
        }

        // Cargar módulos permitidos
        await get().cargarModulosPermitidos(usuarios.id)
        // Cargar instituciones permitidas
        await get().cargarInstitucionesPermitidas(usuarios.id, usuarios.rol || 'USER')

        // Guardar en localStorage
        localStorage.setItem('usuarioActual', JSON.stringify(usuario))

        set({
          usuarioActual: usuario,
          autenticado: true,
          error: null
        })

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
        set({ error: message })
        console.error('Error de login:', err)
        return false
      } finally {
        set({ loading: false })
      }
    },

    logout: () => {
      localStorage.removeItem('usuarioActual')
      localStorage.removeItem('modulosPermitidos')
      localStorage.removeItem('institucionesPermitidas')
      set({
        usuarioActual: null,
        modulosPermitidos: [],
        institucionesPermitidas: [],
        autenticado: false,
        error: null
      })
    },

    restaurarSesion: () => {
      const usuarioGuardado = localStorage.getItem('usuarioActual')
      const modulosGuardados = localStorage.getItem('modulosPermitidos')
      const institucionesGuardadas = localStorage.getItem('institucionesPermitidas')

      if (usuarioGuardado) {
        const usuario = JSON.parse(usuarioGuardado)
        const modulos = modulosGuardados ? JSON.parse(modulosGuardados) : []
        const instituciones = institucionesGuardadas ? JSON.parse(institucionesGuardadas) : []

        set({
          usuarioActual: usuario,
          modulosPermitidos: modulos,
          institucionesPermitidas: instituciones,
          autenticado: true,
          sesionRestaurada: true
        })
      } else {
        set({ sesionRestaurada: true })
      }
    },

    cargarModulosPermitidos: async (usuario_id: number) => {
      try {
        const usuario = get().usuarioActual
        if (usuario?.rol === 'ADMIN') {
          const todosLosModulos = [
            'dashboard',
            'cobranzas',
            'deudas',
            'ventas',
            'ventakiosco',
            'gastos',
            'reportes',
            'cierre',
            'configuracion',
            'sincronizacion'
          ]
          set({ modulosPermitidos: todosLosModulos })
          localStorage.setItem('modulosPermitidos', JSON.stringify(todosLosModulos))
          return
        }

        const { data: permisos, error } = await supabase
          .from('usuario_modulos')
          .select('modulo, permitido')
          .eq('usuario_id', usuario_id)
          .eq('permitido', true)

        if (error) throw error

        const modulos = (permisos || []).map(p => p.modulo)
        
        set({ modulosPermitidos: modulos })
        localStorage.setItem('modulosPermitidos', JSON.stringify(modulos))
      } catch (err) {
        console.error('Error cargando módulos:', err)
        set({ modulosPermitidos: [] })
      }
    },

    cargarInstitucionesPermitidas: async (usuario_id: number, rol: string) => {
      try {
        if (rol === 'ADMIN') {
          // ADMIN ve todas las instituciones
          const { data, error } = await supabase
            .from('instituciones')
            .select('*')
            .order('nombre', { ascending: true })

          if (error) throw error

          set({ institucionesPermitidas: data || [] })
          localStorage.setItem('institucionesPermitidas', JSON.stringify(data || []))
          return
        }

        // Para usuarios normales, cargar solo instituciones asignadas
        const { data, error } = await supabase
          .from('usuario_instituciones')
          .select('institucion_id, instituciones(*)')
          .eq('usuario_id', usuario_id)

        if (error) throw error

        const instituciones = (data || []).map(x => x.instituciones)
        set({ institucionesPermitidas: instituciones })
        localStorage.setItem('institucionesPermitidas', JSON.stringify(instituciones))
      } catch (err) {
        console.error('Error cargando instituciones:', err)
        set({ institucionesPermitidas: [] })
      }
    },

    obtenerTodosLosUsuarios: async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('nombre_completo', { ascending: true })

        if (error) throw error

        return (data || []).map(u => ({
          id: u.id,
          nombre_completo: u.nombre_completo,
          rol: u.rol || 'USER',
          activo: u.activo,
          puede_cambiar_institucion: u.puede_cambiar_institucion || false,
          ultimo_acceso: u.ultimo_acceso
        }))
      } catch (err) {
        console.error('Error obteniendo usuarios:', err)
        return []
      }
    },

    actualizarPermisosUsuario: async (usuario_id: number, modulos: { modulo: string; permitido: boolean }[]) => {
      set({ loading: true, error: null })
      try {
        const { error: deleteError } = await supabase
          .from('usuario_modulos')
          .delete()
          .eq('usuario_id', usuario_id)

        if (deleteError) throw deleteError

        const permisosInsert = modulos.map(m => ({
          usuario_id,
          modulo: m.modulo,
          permitido: m.permitido
        }))

        const { error: insertError } = await supabase
          .from('usuario_modulos')
          .insert(permisosInsert)

        if (insertError) throw insertError

        console.log('Permisos actualizados:', usuario_id, modulos)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar permisos'
        set({ error: message })
        console.error('Error actualizando permisos:', err)
        return false
      } finally {
        set({ loading: false })
      }
    },

    obtenerPermisosUsuario: async (usuario_id: number) => {
      try {
        const { data, error } = await supabase
          .from('usuario_modulos')
          .select('*')
          .eq('usuario_id', usuario_id)

        if (error) throw error

        return (data || []).map(p => ({
          id: p.id,
          usuario_id: p.usuario_id,
          modulo: p.modulo,
          permitido: p.permitido
        }))
      } catch (err) {
        console.error('Error obteniendo permisos:', err)
        return []
      }
    },

    actualizarInstitucionesUsuario: async (usuario_id: number, instituciones: number[]) => {
      set({ loading: true, error: null })
      try {
        const { error: deleteError } = await supabase
          .from('usuario_instituciones')
          .delete()
          .eq('usuario_id', usuario_id)

        if (deleteError) throw deleteError

        const institucionesInsert = instituciones.map(inst_id => ({
          usuario_id,
          institucion_id: inst_id,
          asignado_por_admin: true
        }))

        if (institucionesInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('usuario_instituciones')
            .insert(institucionesInsert)

          if (insertError) throw insertError
        }

        console.log('Instituciones actualizadas:', usuario_id, instituciones)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar instituciones'
        set({ error: message })
        console.error('Error actualizando instituciones:', err)
        return false
      } finally {
        set({ loading: false })
      }
    },

    obtenerInstitucionesUsuario: async (usuario_id: number) => {
      try {
        const { data, error } = await supabase
          .from('usuario_instituciones')
          .select('institucion_id')
          .eq('usuario_id', usuario_id)

        if (error) throw error

        return (data || []).map(x => x.institucion_id)
      } catch (err) {
        console.error('Error obteniendo instituciones:', err)
        return []
      }
    },

    actualizarPuedeCambiarInstitucion: async (usuario_id: number, puede: boolean) => {
      set({ loading: true, error: null })
      try {
        const { error } = await supabase
          .from('usuarios')
          .update({ puede_cambiar_institucion: puede })
          .eq('id', usuario_id)

        if (error) throw error

        console.log('Permiso de cambio de institución actualizado:', usuario_id, puede)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar permiso'
        set({ error: message })
        console.error('Error actualizando permiso:', err)
        return false
      } finally {
        set({ loading: false })
      }
    },

    actualizarContraseniaUsuario: async (usuario_id: number, contrasenia: string) => {
      set({ loading: true, error: null })
      try {
        if (!contrasenia || contrasenia.trim().length === 0) {
          throw new Error('La contraseña no puede estar vacía')
        }

        const { error } = await supabase
          .from('usuarios')
          .update({ contraseña: contrasenia })
          .eq('id', usuario_id)

        if (error) throw error

        console.log('Contraseña actualizada:', usuario_id)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al actualizar contraseña'
        set({ error: message })
        console.error('Error actualizando contraseña:', err)
        return false
      } finally {
        set({ loading: false })
      }
    }
  }
})
