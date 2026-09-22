import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Users, Filter, Edit2, CheckCircle, AlertCircle, Zap, Ban, X, RefreshCw } from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  carrera_id: number
  estado: 'ACTIVO' | 'BECADO_50' | 'BECADO_100' | 'NO_VIENE_MAS'
  mes_ingreso: number
  ano_ingreso: number
  carreras?: { nombre: string }
}

type EstadoEstudiante = 'ACTIVO' | 'BECADO_50' | 'BECADO_100' | 'NO_VIENE_MAS'

export const GestionEstudiantesModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [carreras, setCarreras] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<EstadoEstudiante>('ACTIVO')
  const [nuevoMesIngreso, setNuevoMesIngreso] = useState(3)
  const [nuevoAnoIngreso, setNuevoAnoIngreso] = useState(new Date().getFullYear())
  const [guardando, setGuardando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const { data: carrData } = await supabase
        .from('carreras')
        .select('id, nombre')
        .eq('institucion_id', institucionActiva.id)

      if (carrData) setCarreras(carrData)

      const { data: estData } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, mes_ingreso, ano_ingreso, carreras(nombre)')
        .eq('institucion_id', institucionActiva.id)
        .order('nombre', { ascending: true })

      if (estData) {
        setEstudiantes(estData)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error al cargar estudiantes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [institucionActiva.id])

  const estudiantesFiltrados = estudiantes
    .filter(est => {
      if (filtroCarrera && est.carrera_id !== filtroCarrera) return false
      if (searchText) {
        const busqueda = searchText.toLowerCase()
        const nombre = `${est.nombre} ${est.apellido}`.toLowerCase()
        const dni = est.dni.toLowerCase()
        return nombre.includes(busqueda) || dni.includes(busqueda)
      }
      return true
    })
    .sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase()
      const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase()
      return nombreA.localeCompare(nombreB)
    })

  const handleGuardarEstado = async (estudianteId: number) => {
    setGuardando(true)
    try {
      const { error } = await supabase
        .from('estudiantes')
        .update({ 
          estado: nuevoEstado,
          mes_ingreso: nuevoMesIngreso,
          ano_ingreso: nuevoAnoIngreso
        })
        .eq('id', estudianteId)
        .eq('institucion_id', institucionActiva.id)

      if (error) throw error

      setEstudiantes(prev =>
        prev.map(est =>
          est.id === estudianteId 
            ? { ...est, estado: nuevoEstado, mes_ingreso: nuevoMesIngreso, ano_ingreso: nuevoAnoIngreso } 
            : est
        )
      )

      setSuccessMessage(`✓ Datos actualizados`)
      setEditandoId(null)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error guardando:', error)
      alert('Error al guardar datos')
    } finally {
      setGuardando(false)
    }
  }

  const getEstadoIcon = (estado: EstadoEstudiante) => {
    switch (estado) {
      case 'ACTIVO':
        return <CheckCircle size={16} className="text-green-400 sm:w-5 sm:h-5" />
      case 'BECADO_50':
        return <Zap size={16} className="text-yellow-400 sm:w-5 sm:h-5" />
      case 'BECADO_100':
        return <Zap size={16} className="text-orange-400 sm:w-5 sm:h-5" />
      case 'NO_VIENE_MAS':
        return <Ban size={16} className="text-red-400 sm:w-5 sm:h-5" />
      default:
        return <AlertCircle size={16} className="text-slate-400 sm:w-5 sm:h-5" />
    }
  }

  const getEstadoLabel = (estado: EstadoEstudiante) => {
    switch (estado) {
      case 'ACTIVO':
        return 'Activo'
      case 'BECADO_50':
        return 'Becado 50%'
      case 'BECADO_100':
        return 'Becado 100%'
      case 'NO_VIENE_MAS':
        return 'No viene más'
      default:
        return estado
    }
  }

  const getEstadoColor = (estado: EstadoEstudiante) => {
    switch (estado) {
      case 'ACTIVO':
        return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'BECADO_50':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'BECADO_100':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      case 'NO_VIENE_MAS':
        return 'bg-red-500/20 text-red-300 border-red-500/50'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50'
    }
  }

  const estadosDisponibles: EstadoEstudiante[] = ['ACTIVO', 'BECADO_50', 'BECADO_100', 'NO_VIENE_MAS']
  const mesesNombre = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const anosDisponibles = [2024, 2025, 2026, 2027, 2028]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-2 sm:p-4">
        <div className="text-center">
          <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg sm:rounded-xl mb-3 sm:mb-4 border border-blue-500/50">
            <Users size={28} className="text-blue-400 animate-spin sm:w-8 sm:h-8" />
          </div>
          <p className="text-slate-400 font-semibold text-sm sm:text-base">Cargando estudiantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 md:p-4 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
          <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl shadow-lg shadow-purple-500/50 flex-shrink-0">
            <Users size={24} className="text-white sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
              Gestión de Estudiantes
            </h1>
            <p className="text-slate-400 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">Controla estado e ingreso</p>
          </div>
        </div>
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-purple-400 transition-all flex-shrink-0"
        >
          <RefreshCw size={20} className={`sm:w-6 sm:h-6 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMessage && (
        <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-400 font-semibold text-xs sm:text-sm flex items-center gap-2 mb-4 sm:mb-5 md:mb-6">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
          <span className="truncate">{successMessage}</span>
        </div>
      )}

      {/* FILTROS RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">🔍 Buscar</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Nombre o DNI..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:border-purple-500/50 focus:outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">📚 Carrera</label>
          <select
            value={filtroCarrera || ''}
            onChange={(e) => setFiltroCarrera(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white focus:border-purple-500/50 focus:outline-none transition"
          >
            <option value="">Todas ({estudiantes.length})</option>
            {carreras.map(carr => {
              const count = estudiantes.filter(e => e.carrera_id === carr.id).length
              return (
                <option key={carr.id} value={carr.id}>
                  {carr.nombre} ({count})
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* RESUMEN ESTADOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6">
        <div className="p-2 sm:p-3 md:p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
          <p className="text-xs text-green-400 font-bold">ACTIVOS</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-green-300 mt-0.5 sm:mt-1">{estudiantes.filter(e => e.estado === 'ACTIVO').length}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-center">
          <p className="text-xs text-yellow-400 font-bold">BECADO 50%</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-yellow-300 mt-0.5 sm:mt-1">{estudiantes.filter(e => e.estado === 'BECADO_50').length}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-orange-500/20 border border-orange-500/50 rounded-lg text-center">
          <p className="text-xs text-orange-400 font-bold">BECADO 100%</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-orange-300 mt-0.5 sm:mt-1">{estudiantes.filter(e => e.estado === 'BECADO_100').length}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
          <p className="text-xs text-red-400 font-bold">NO VIENE</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-red-300 mt-0.5 sm:mt-1">{estudiantes.filter(e => e.estado === 'NO_VIENE_MAS').length}</p>
        </div>
      </div>

      {/* TABLA DE ESTUDIANTES */}
      <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl overflow-x-auto">
        <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
          <Users size={20} className="text-purple-400 sm:w-6 sm:h-6" />
          Estudiantes ({estudiantesFiltrados.length})
        </h2>

        {estudiantesFiltrados.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <AlertCircle size={28} className="text-slate-500 mx-auto mb-2 sm:mb-3 sm:w-8 sm:h-8" />
            <p className="text-slate-400 font-semibold text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold">Nombre</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold hidden sm:table-cell">DNI</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold hidden md:table-cell">Carrera</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-300 font-bold">Estado</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-300 font-bold hidden sm:table-cell">Ingreso</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-300 font-bold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {estudiantesFiltrados.map(estudiante => (
                  <tr key={estudiante.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-2 sm:px-4 py-2 sm:py-4">
                      <p className="font-bold text-white text-xs sm:text-sm truncate">
                        {estudiante.nombre} {estudiante.apellido}
                      </p>
                      <p className="text-slate-400 text-xs sm:hidden">{estudiante.dni}</p>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-slate-400 font-mono text-xs hidden sm:table-cell truncate">{estudiante.dni}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-slate-400 text-xs hidden md:table-cell truncate">
                      {(estudiante.carreras as any)?.nombre || 'Sin carrera'}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getEstadoIcon(estudiante.estado)}
                        <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs font-bold border hidden sm:inline-block ${getEstadoColor(estudiante.estado)}`}>
                          {getEstadoLabel(estudiante.estado).split(' ')[0]}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center hidden sm:table-cell">
                      <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold">
                        {mesesNombre[estudiante.mes_ingreso].slice(0, 3)} {estudiante.ano_ingreso}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-4 text-center">
                      {editandoId === estudiante.id ? (
                        <div className="space-y-2 min-w-max p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Estado</label>
                            <select
                              value={nuevoEstado}
                              onChange={(e) => setNuevoEstado(e.target.value as EstadoEstudiante)}
                              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                            >
                              {estadosDisponibles.map(est => (
                                <option key={est} value={est}>
                                  {getEstadoLabel(est as EstadoEstudiante)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Mes</label>
                            <select
                              value={nuevoMesIngreso}
                              onChange={(e) => setNuevoMesIngreso(parseInt(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                            >
                              {mesesNombre.map((mes, idx) => (
                                idx > 0 && <option key={idx} value={idx}>{mes}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Año</label>
                            <select
                              value={nuevoAnoIngreso}
                              onChange={(e) => setNuevoAnoIngreso(parseInt(e.target.value))}
                              className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                            >
                              {anosDisponibles.map(ano => (
                                <option key={ano} value={ano}>{ano}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-1.5 justify-center pt-2">
                            <button
                              onClick={() => handleGuardarEstado(estudiante.id)}
                              disabled={guardando}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded text-xs font-bold transition"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-bold transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditandoId(estudiante.id)
                            setNuevoEstado(estudiante.estado)
                            setNuevoMesIngreso(estudiante.mes_ingreso)
                            setNuevoAnoIngreso(estudiante.ano_ingreso)
                          }}
                          className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 mx-auto transition whitespace-nowrap"
                        >
                          <Edit2 size={14} />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default GestionEstudiantesModerno
