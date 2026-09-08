import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Users, Filter, Edit2, CheckCircle, AlertCircle, Zap, Ban } from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  carrera_id: number
  estado: 'ACTIVO' | 'BECADO_50' | 'BECADO_100' | 'NO_VIENE_MAS'
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
  const [guardando, setGuardando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const cargarDatos = async () => {
    try {
      setLoading(true)

      // Cargar carreras
      const { data: carrData } = await supabase
        .from('carreras')
        .select('id, nombre')
        .eq('institucion_id', institucionActiva.id)

      if (carrData) setCarreras(carrData)

      // Cargar estudiantes
      const { data: estData } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, carreras(nombre)')
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
        .update({ estado: nuevoEstado })
        .eq('id', estudianteId)
        .eq('institucion_id', institucionActiva.id)

      if (error) throw error

      // Actualizar localmente
      setEstudiantes(prev =>
        prev.map(est =>
          est.id === estudianteId ? { ...est, estado: nuevoEstado } : est
        )
      )

      setSuccessMessage(`✓ Estado actualizado`)
      setEditandoId(null)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error guardando:', error)
      alert('Error al guardar estado')
    } finally {
      setGuardando(false)
    }
  }

  const getEstadoIcon = (estado: EstadoEstudiante) => {
    switch (estado) {
      case 'ACTIVO':
        return <CheckCircle size={20} className="text-green-400" />
      case 'BECADO_50':
        return <Zap size={20} className="text-yellow-400" />
      case 'BECADO_100':
        return <Zap size={20} className="text-orange-400" />
      case 'NO_VIENE_MAS':
        return <Ban size={20} className="text-red-400" />
      default:
        return <AlertCircle size={20} className="text-slate-400" />
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4 border border-blue-500/50">
            <Users size={32} className="text-blue-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando estudiantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/50">
            <Users size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Gestión de Estudiantes
            </h1>
            <p className="text-slate-400 mt-1">Controla estado y condiciones de estudiantes</p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-400 font-semibold flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {successMessage}
          </div>
        )}

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">🔍 Buscar por nombre o DNI</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Ingresa nombre o DNI..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-purple-500/50 focus:outline-none transition"
            />
          </div>

          {/* Filtro Carrera */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">📚 Filtrar por Carrera</label>
            <select
              value={filtroCarrera || ''}
              onChange={(e) => setFiltroCarrera(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:border-purple-500/50 focus:outline-none transition"
            >
              <option value="">Todas las carreras ({estudiantes.length})</option>
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

        {/* RESUMEN DE ESTADOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
            <p className="text-xs text-green-400 font-bold">ACTIVOS</p>
            <p className="text-xl font-black text-green-300">{estudiantes.filter(e => e.estado === 'ACTIVO').length}</p>
          </div>
          <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-center">
            <p className="text-xs text-yellow-400 font-bold">BECADO 50%</p>
            <p className="text-xl font-black text-yellow-300">{estudiantes.filter(e => e.estado === 'BECADO_50').length}</p>
          </div>
          <div className="p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg text-center">
            <p className="text-xs text-orange-400 font-bold">BECADO 100%</p>
            <p className="text-xl font-black text-orange-300">{estudiantes.filter(e => e.estado === 'BECADO_100').length}</p>
          </div>
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-center">
            <p className="text-xs text-red-400 font-bold">NO VIENE</p>
            <p className="text-xl font-black text-red-300">{estudiantes.filter(e => e.estado === 'NO_VIENE_MAS').length}</p>
          </div>
        </div>
      </div>

      {/* TABLA DE ESTUDIANTES */}
      <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users size={24} className="text-purple-400" />
          Listado de Estudiantes ({estudiantesFiltrados.length})
        </h2>

        {estudiantesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={32} className="text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 font-semibold">No hay estudiantes que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">Nombre Completo</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">DNI</th>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">Carrera</th>
                  <th className="px-4 py-3 text-center text-slate-300 font-bold">Estado Actual</th>
                  <th className="px-4 py-3 text-center text-slate-300 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {estudiantesFiltrados.map(estudiante => (
                  <tr key={estudiante.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-4">
                      <p className="font-bold text-white">
                        {estudiante.nombre} {estudiante.apellido}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-400 font-mono">{estudiante.dni}</td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold">
                        {(estudiante.carreras as any)?.nombre || 'Sin carrera'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getEstadoIcon(estudiante.estado)}
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getEstadoColor(estudiante.estado)}`}>
                          {getEstadoLabel(estudiante.estado)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {editandoId === estudiante.id ? (
                        <div className="space-y-2 min-w-max">
                          <select
                            value={nuevoEstado}
                            onChange={(e) => setNuevoEstado(e.target.value as EstadoEstudiante)}
                            className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                          >
                            {estadosDisponibles.map(est => (
                              <option key={est} value={est}>
                                {getEstadoLabel(est as EstadoEstudiante)}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleGuardarEstado(estudiante.id)}
                              disabled={guardando}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded text-xs font-bold transition"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-bold transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditandoId(estudiante.id)
                            setNuevoEstado(estudiante.estado)
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 mx-auto transition"
                        >
                          <Edit2 size={16} />
                          Editar
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
