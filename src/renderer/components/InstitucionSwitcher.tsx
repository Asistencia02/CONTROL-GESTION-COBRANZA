import React, { useState, useEffect } from 'react'
import { ChevronDown, Loader, Building2, Lock } from 'lucide-react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useAuth } from '@renderer/hooks/useAuth'
import { usePagos } from '@renderer/hooks/usePagos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useDeudas } from '@renderer/hooks/useDeudas'

const nombreAEnum = (nombre: string): 'ISIPP' | 'Milagros' => {
  if (nombre.includes('ISIPP')) return 'ISIPP'
  if (nombre.includes('Milagros') || nombre.includes('Nuestra Señora')) return 'Milagros'
  return 'ISIPP' // default
}

export const InstitucionSwitcher: React.FC = () => {
  const { institucionActiva, cambiarInstitucion } = useInstitucion()
  const { usuarioActual, institucionesPermitidas } = useAuth()
  const { cargarPagos } = usePagos()
  const { cargarEstudiantes } = useEstudiantes()
  const { cargarInsumos } = useInsumos()
  const { cargarGastos } = useGastos()
  const { cargarDeudas } = useDeudas()

  const [cargando, setCargando] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Si el usuario no puede cambiar institución y tiene solo una, asignarla automáticamente
  useEffect(() => {
    if (!usuarioActual?.puede_cambiar_institucion && institucionesPermitidas.length === 1) {
      const inst = institucionesPermitidas[0]
      if (inst) {
        const enum_inst = nombreAEnum(inst.nombre)
        if (institucionActiva.institucion !== enum_inst) {
          cambiarInstitucion(enum_inst)
        }
      }
    }
  }, [usuarioActual, institucionesPermitidas])

  const handleCambiarInstitucion = async (institucionId: number) => {
    const institucion = institucionesPermitidas.find(i => i.id === institucionId)
    if (!institucion) return

    const enum_inst = nombreAEnum(institucion.nombre)
    
    if (institucionActiva.institucion === enum_inst) {
      setIsOpen(false)
      return
    }

    setCargando(true)
    try {
      cambiarInstitucion(enum_inst)

      // Cargar todos los datos de la nueva institución en paralelo
      await Promise.all([
        cargarEstudiantes(institucionId),
        cargarPagos(institucionId),
        cargarInsumos(institucionId),
        cargarGastos(institucionId),
        cargarDeudas(institucionId)
      ])

      console.log(`✅ Cambio a ${institucion.nombre} completado`)
      setIsOpen(false)
    } catch (error) {
      console.error('Error al cambiar institución:', error)
    } finally {
      setCargando(false)
    }
  }

  const institucionActual = institucionesPermitidas.find(i => i.nombre === institucionActiva.institucion)
  const puedeVerSwitch = usuarioActual?.puede_cambiar_institucion || usuarioActual?.rol === 'ADMIN'

  // Si no tiene permiso para cambiar y solo tiene una institución, mostrar bloqueado
  if (!puedeVerSwitch && institucionesPermitidas.length === 1) {
    return (
      <div className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg opacity-75 cursor-not-allowed">
        <div className="flex-shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg"
            style={{ 
              backgroundColor: institucionActual?.color || '#6366f1',
              boxShadow: `0 0 12px ${institucionActual?.color || '#6366f1'}80`
            }}
          >
            {institucionActual?.nombre[0] || 'I'}
          </div>
        </div>

        <div className="flex-1 text-left">
          <p className="text-xs text-slate-500 font-semibold uppercase">Institución Asignada</p>
          <p className="text-sm font-bold text-white truncate">{institucionActual?.nombre || 'Asignada'}</p>
        </div>

        <div className="flex-shrink-0">
          <Lock size={18} className="text-yellow-400" />
        </div>
      </div>
    )
  }

  // Si no tiene permiso y tiene varias, no mostrar el switcher
  if (!puedeVerSwitch && institucionesPermitidas.length > 1) {
    return (
      <div className="text-xs text-slate-400 p-2 text-center">
        Contacta al administrador para cambiar institución
      </div>
    )
  }

  // Mostrar switcher normal si tiene permiso
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={cargando || institucionesPermitidas.length <= 1}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/70 hover:border-slate-500/70 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Icono Institución */}
        <div className="flex-shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
            style={{ 
              backgroundColor: institucionActual?.color || '#6366f1',
              boxShadow: `0 0 12px ${institucionActual?.color || '#6366f1'}80`
            }}
          >
            {institucionActual?.nombre[0] || 'I'}
          </div>
        </div>

        {/* Info Institución */}
        <div className="flex-1 text-left">
          <p className="text-xs text-slate-500 font-semibold uppercase">Institución</p>
          <p className="text-sm font-bold text-white truncate">{institucionActual?.nombre || 'Seleccionar'}</p>
        </div>

        {/* Icono Chevron o Loader */}
        <div className="flex-shrink-0 transition-all duration-300">
          {cargando ? (
            <Loader size={18} className="text-blue-400 animate-spin" />
          ) : (
            <ChevronDown 
              size={18} 
              className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !cargando && institucionesPermitidas.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          {institucionesPermitidas.map((institucion) => {
            const isActive = institucionActiva.institucion === institucion.nombre
            
            return (
              <button
                key={institucion.id}
                onClick={() => handleCambiarInstitucion(institucion.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-300 border-b border-slate-700/50 last:border-b-0 group relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {/* Fondo efecto hover */}
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                )}

                {/* Icono */}
                <div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs relative z-10 transition-all duration-300 ${
                    isActive ? 'text-white shadow-lg' : 'text-white'
                  }`}
                  style={{
                    backgroundColor: isActive 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : institucion.color
                  }}
                >
                  {institucion.nombre[0]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left relative z-10">
                  <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {institucion.nombre}
                  </p>
                </div>

                {/* Checkmark */}
                {isActive && (
                  <div className="flex-shrink-0 relative z-10">
                    <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
