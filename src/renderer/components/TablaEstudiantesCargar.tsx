import React, { useState, useMemo } from 'react'
import { Eye, Search } from 'lucide-react'
import type { Estudiante } from '@renderer/hooks/useEstudiantes'

interface TablaEstudiantesCargarProps {
  estudiantes: Estudiante[]
  loading?: boolean
  onVerConceptos?: (estudiante: Estudiante) => void
}

export const TablaEstudiantesCargar: React.FC<TablaEstudiantesCargarProps> = ({
  estudiantes,
  loading = false,
  onVerConceptos,
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  const estudiantesFiltrados = useMemo(() => {
    return estudiantes.filter((est) => {
      const coincideBusqueda =
        est.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        est.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
        est.dni.includes(busqueda)

      const coincideEstado = !filtroEstado || est.estado === filtroEstado

      return coincideBusqueda && coincideEstado
    })
  }, [estudiantes, busqueda, filtroEstado])

  const getColorEstado = (estado: string): string => {
    switch (estado) {
      case 'ACTIVO':
        return 'bg-green-100 text-green-800'
      case 'BECADO_100':
        return 'bg-blue-100 text-blue-800'
      case 'BECADO_50':
        return 'bg-yellow-100 text-yellow-800'
      case 'NO_VIENE_MAS':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoLabel = (estado: string): string => {
    switch (estado) {
      case 'ACTIVO':
        return 'Activo'
      case 'BECADO_100':
        return 'Becado 100%'
      case 'BECADO_50':
        return 'Becado 50%'
      case 'NO_VIENE_MAS':
        return 'No viene más'
      default:
        return estado
    }
  }

  return (
    <div className="space-y-4">
      {/* FILTROS */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre, apellido o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="BECADO_100">Becado 100%</option>
            <option value="BECADO_50">Becado 50%</option>
            <option value="NO_VIENE_MAS">No viene más</option>
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">DNI</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Carrera</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Teléfono</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Cargando estudiantes...
                  </td>
                </tr>
              ) : estudiantesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No hay estudiantes
                  </td>
                </tr>
              ) : (
                estudiantesFiltrados.map((est) => (
                  <tr key={est.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {est.nombre} {est.apellido}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono">{est.dni}</td>
                    <td className="px-6 py-4 text-gray-700 text-sm">
                      {/* Aquí iría nombre carrera si está disponible en objeto */}
                      {est.carrera_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getColorEstado(est.estado)}`}>
                        {getEstadoLabel(est.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{est.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{est.telefono || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onVerConceptos?.(est)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold transition"
                        title="Ver conceptos y registrar pagos"
                      >
                        <Eye size={14} />
                        Conceptos
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
