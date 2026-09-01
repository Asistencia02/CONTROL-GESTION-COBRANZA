import React, { useState } from 'react'
import { ChevronDown, Loader, Building2 } from 'lucide-react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useDeudas } from '@renderer/hooks/useDeudas'

export const InstitucionSwitcher: React.FC = () => {
  const { institucionActiva, cambiarInstitucion } = useInstitucion()
  const { cargarPagos } = usePagos()
  const { cargarEstudiantes } = useEstudiantes()
  const { cargarInsumos } = useInsumos()
  const { cargarGastos } = useGastos()
  const { cargarDeudas } = useDeudas()

  const [cargando, setCargando] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleCambiarInstitucion = async (institucion: 'ISIPP' | 'Milagros') => {
    if (institucionActiva.institucion === institucion) {
      setIsOpen(false)
      return
    }

    setCargando(true)
    try {
      // Cambiar institución primero
      cambiarInstitucion(institucion)

      // Obtener el ID de la nueva institución
      const nuevoId = institucion === 'ISIPP' ? 1 : 2

      // Cargar todos los datos de la nueva institución en paralelo
      await Promise.all([
        cargarEstudiantes(nuevoId),
        cargarPagos(nuevoId),
        cargarInsumos(nuevoId),
        cargarGastos(nuevoId),
        cargarDeudas(nuevoId)
      ])

      console.log(`✅ Cambio a ${institucion} completado`)
      setIsOpen(false)
    } catch (error) {
      console.error('Error al cambiar institución:', error)
    } finally {
      setCargando(false)
    }
  }

  const instituciones = [
    { id: 'ISIPP', nombre: 'ISIPP', nombreCompleto: 'Instituto Superior de Informática' },
    { id: 'Milagros', nombre: 'INSM', nombreCompleto: 'Instituto Nuestra Señora de los Milagros' }
  ]

  const institucionActual = instituciones.find(i => i.id === institucionActiva.institucion)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={cargando}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/70 hover:border-slate-500/70 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Icono Institución */}
        <div className="flex-shrink-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
            style={{ 
              backgroundColor: institucionActiva.color,
              boxShadow: `0 0 12px ${institucionActiva.color}80`
            }}
          >
            {institucionActiva.nombreCorto[0]}
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
      {isOpen && !cargando && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          {instituciones.map((institucion) => {
            const isActive = institucionActiva.institucion === institucion.id
            
            return (
              <button
                key={institucion.id}
                onClick={() => handleCambiarInstitucion(institucion.id as 'ISIPP' | 'Milagros')}
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
                      : institucion.id === 'ISIPP' ? '#3b82f6' : '#8b5cf6'
                  }}
                >
                  {institucion.nombre[0]}
                </div>

                {/* Info */}
                <div className="flex-1 text-left relative z-10">
                  <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>
                    {institucion.nombre}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {institucion.nombreCompleto}
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