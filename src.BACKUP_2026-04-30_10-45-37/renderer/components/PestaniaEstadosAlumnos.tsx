import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { Edit2, Save, X, AlertCircle } from 'lucide-react'

interface EstudianteEstado {
  id: number
  nombre: string
  apellido: string
  dni: string
  carrera: string
  estado: string
}

interface PestaniaEstadosAlumnosProps {
  institucion_id: number
}

export const PestaniaEstadosAlumnos: React.FC<PestaniaEstadosAlumnosProps> = ({ institucion_id }) => {
  const { estudiantes, loading: estudiantesLoading } = useEstudiantes()
  const [filtro, setFiltro] = useState<string>('TODOS')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [estadoEditado, setEstadoEditado] = useState<Record<number, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [carrera, setCarrera] = useState<string>('')
  const [carreras, setCarreras] = useState<Array<{ id: number; nombre: string }>>([])

  useEffect(() => {
    const cargarCarreras = async () => {
      try {
        const { data } = await supabase.from('carreras').select('id, nombre').eq('institucion_id', institucion_id)
        setCarreras(data || [])
      } catch (error) {
        console.error('Error cargando carreras:', error)
      }
    }
    cargarCarreras()
  }, [institucion_id])

  const estudianteFiltrados = estudiantes.filter((est: any) => {
    const matchBusqueda = busqueda === '' || 
      est.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      est.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      est.dni.includes(busqueda)
    
    const matchEstado = filtro === 'TODOS' || est.estado === filtro
    
    const matchCarrera = carrera === '' || est.carrera_id === parseInt(carrera)

    return matchBusqueda && matchEstado && matchCarrera
  })

  const handleEditarEstado = (estudianteId: number, estadoActual: string) => {
    setEditando(estudianteId)
    setEstadoEditado({ [estudianteId]: estadoActual })
  }

  const handleCancelarEdicion = () => {
    setEditando(null)
    setEstadoEditado({})
  }

  const handleGuardarEstado = async (estudianteId: number) => {
    setGuardando(true)
    try {
      const nuevoEstado = estadoEditado[estudianteId]
      const { error } = await supabase
        .from('estudiantes')
        .update({ estado: nuevoEstado })
        .eq('id', estudianteId)

      if (error) throw error

      setMensaje(`✓ Estado actualizado correctamente`)
      setEditando(null)
      setEstadoEditado({})
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMensaje(`❌ Error al actualizar estado: ${error instanceof Error ? error.message : 'Desconocido'}`)
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setGuardando(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'BECADO_50':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'BECADO_100':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'NO_VIENE_MAS':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      ACTIVO: 'Activo',
      BECADO_50: 'Becado 50%',
      BECADO_100: 'Becado 100%',
      NO_VIENE_MAS: 'No viene más',
    }
    return labels[estado] || estado
  }

  const estadosUnicos = ['TODOS', ...new Set(estudiantes.map((e: any) => e.estado))]
  const conteoEstados = estadosUnicos.reduce((acc: Record<string, number>, est: string) => {
    if (est === 'TODOS') {
      acc[est] = estudiantes.length
    } else {
      acc[est] = estudiantes.filter((e: any) => e.estado === est).length
    }
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {mensaje && (
        <div
          className={`p-4 rounded-lg border flex items-center gap-2 ${
            mensaje.includes('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <AlertCircle size={18} />
          {mensaje}
        </div>
      )}

      {/* Información */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>Estados de Alumnos:</strong> Gestiona aquí el estado académico de los estudiantes. Los cambios afectarán directamente los cálculos de
          cobranza (descuentos por beca, cobros especiales, etc.).
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">Filtros</h3>

        <div className="grid grid-cols-3 gap-4">
          {/* Búsqueda por nombre/DNI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por Nombre o DNI</label>
            <input
              type="text"
              placeholder="Juan, Pérez, 12345678..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {estadosUnicos.map((estado) => (
                <option key={estado} value={estado}>
                  {estado === 'TODOS' ? 'Todos los Estados' : getEstadoLabel(estado)} ({conteoEstados[estado] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Carrera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Carrera</label>
            <select
              value={carrera}
              onChange={(e) => setCarrera(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las Carreras</option>
              {carreras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Estudiantes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {estudiantesLoading ? (
          <div className="p-6 text-center text-gray-500">Cargando estudiantes...</div>
        ) : estudianteFiltrados.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No se encontraron estudiantes con los filtros aplicados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">DNI</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Apellido</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Carrera</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado Actual</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {estudianteFiltrados.map((est: any) => (
                  <tr key={est.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{est.dni}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{est.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{est.apellido}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {carreras.find((c) => c.id === est.carrera_id)?.nombre || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editando === est.id ? (
                        <select
                          value={estadoEditado[est.id] || est.estado}
                          onChange={(e) =>
                            setEstadoEditado({
                              ...estadoEditado,
                              [est.id]: e.target.value,
                            })
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ACTIVO">Activo</option>
                          <option value="BECADO_50">Becado 50%</option>
                          <option value="BECADO_100">Becado 100%</option>
                          <option value="NO_VIENE_MAS">No viene más</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(est.estado)}`}>
                          {getEstadoLabel(est.estado)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editando === est.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleGuardarEstado(est.id)}
                            disabled={guardando}
                            className="text-green-600 hover:text-green-700 p-2 disabled:opacity-50"
                            title="Guardar"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancelarEdicion}
                            disabled={guardando}
                            className="text-red-600 hover:text-red-700 p-2 disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditarEstado(est.id, est.estado)}
                          className="text-blue-600 hover:text-blue-700 p-2 transition"
                          title="Editar"
                        >
                          <Edit2 size={18} />
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

      {/* Resumen de Estados */}
      <div className="grid grid-cols-4 gap-4">
        {['ACTIVO', 'BECADO_50', 'BECADO_100', 'NO_VIENE_MAS'].map((estado) => (
          <div key={estado} className={`rounded-lg border p-4 ${getEstadoColor(estado)}`}>
            <p className="text-xs font-medium opacity-75 mb-1">
              {getEstadoLabel(estado)}
            </p>
            <p className="text-2xl font-bold">
              {estudiantes.filter((e: any) => e.estado === estado).length}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
