import React, { useState } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  estado: string
  carrera_id: number
}

interface FiltrosCobranzasProps {
  estudiantes: Estudiante[]
  carreras: any[]
  onFiltrosChange: (filtrados: Estudiante[]) => void
  onEstudianteSeleccionado: (estudianteId: number | null) => void
  estudianteSeleccionado: number | null
}

export const FiltrosCobranzas: React.FC<FiltrosCobranzasProps> = ({
  estudiantes,
  carreras,
  onFiltrosChange,
  onEstudianteSeleccionado,
  estudianteSeleccionado,
}) => {
  const [expandedFilters, setExpandedFilters] = useState(true)
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroDni, setFiltroDni] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null)
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false)

  const aplicarFiltros = (nombre: string, dni: string, estado: string, carrera: number | null) => {
    let resultado = estudiantes

    if (nombre.trim()) {
      resultado = resultado.filter((e) =>
        (e.nombre + ' ' + e.apellido).toLowerCase().includes(nombre.toLowerCase())
      )
    }

    if (dni.trim()) {
      resultado = resultado.filter((e) => e.dni.includes(dni))
    }

    if (estado) {
      resultado = resultado.filter((e) => e.estado === estado)
    }

    if (carrera) {
      resultado = resultado.filter((e) => e.carrera_id === carrera)
    }

    onFiltrosChange(resultado)
  }

  const handleNombreChange = (valor: string) => {
    setFiltroNombre(valor)
    aplicarFiltros(valor, filtroDni, filtroEstado, filtroCarrera)
  }

  const handleDniChange = (valor: string) => {
    setFiltroDni(valor)
    aplicarFiltros(filtroNombre, valor, filtroEstado, filtroCarrera)
  }

  const handleEstadoChange = (valor: string) => {
    setFiltroEstado(valor)
    aplicarFiltros(filtroNombre, filtroDni, valor, filtroCarrera)
  }

  const handleCarreraChange = (valor: number | null) => {
    setFiltroCarrera(valor)
    aplicarFiltros(filtroNombre, filtroDni, filtroEstado, valor)
  }

  const limpiarFiltros = () => {
    setFiltroNombre('')
    setFiltroDni('')
    setFiltroEstado('')
    setFiltroCarrera(null)
    onFiltrosChange(estudiantes)
    onEstudianteSeleccionado(null)
  }

  const tieneFilterosActivos = filtroNombre || filtroDni || filtroEstado || filtroCarrera

  const estadosDisponibles = ['ACTIVO', 'BECADO_50', 'BECADO_100']
  const estudiantesEnRango = estudiantes.filter((e) => estadosDisponibles.includes(e.estado))

  return (
    <div className="space-y-4">
      {/* HEADER FILTROS */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4">
        <button
          onClick={() => setExpandedFilters(!expandedFilters)}
          className="w-full flex items-center justify-between hover:opacity-80 transition"
        >
          <div className="flex items-center gap-3">
            <Search size={20} className="text-blue-600" />
            <span className="font-bold text-gray-800">Filtros de Búsqueda</span>
            {tieneFilterosActivos && (
              <span className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                {filtroNombre || filtroDni || filtroEstado || filtroCarrera ? 'ACTIVOS' : ''}
              </span>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`text-blue-600 transition ${expandedFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* FILTROS EXPANDIDOS */}
      {expandedFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          {/* FILA 1: BÚSQUEDA RÁPIDA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda por Nombre */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                Nombre o Apellido
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Juan, Pérez..."
                  value={filtroNombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Búsqueda por DNI */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                DNI
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="12345678"
                  value={filtroDni}
                  onChange={(e) => handleDniChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* BOTÓN FILTROS AVANZADOS */}
          <button
            onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 transition"
          >
            <ChevronDown size={16} className={mostrarFiltrosAvanzados ? 'rotate-180' : ''} />
            {mostrarFiltrosAvanzados ? 'Ocultar' : 'Mostrar'} Filtros Avanzados
          </button>

          {/* FILTROS AVANZADOS */}
          {mostrarFiltrosAvanzados && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              {/* Estado */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Estado del Alumno
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) => handleEstadoChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVO">✓ Activo</option>
                  <option value="BECADO_50">🎓 Becado 50%</option>
                  <option value="BECADO_100">🎓 Becado 100%</option>
                </select>
              </div>

              {/* Carrera */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Carrera / Nivel
                </label>
                <select
                  value={filtroCarrera || ''}
                  onChange={(e) => handleCarreraChange(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
                >
                  <option value="">Todas las carreras</option>
                  {carreras.map((carrera) => (
                    <option key={carrera.id} value={carrera.id}>
                      {carrera.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* BOTÓN LIMPIAR */}
          {tieneFilterosActivos && (
            <button
              onClick={limpiarFiltros}
              className="w-full px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 rounded-lg font-semibold transition flex items-center justify-center gap-2 border border-gray-300"
            >
              <X size={16} />
              Limpiar todos los filtros
            </button>
          )}
        </div>
      )}

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-3 text-center">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">Alumnos</p>
          <p className="text-2xl font-bold text-green-900">{estudiantes.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-3 text-center">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">En Cobranza</p>
          <p className="text-2xl font-bold text-blue-900">{estudiantesEnRango.length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-3 text-center">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Resultados</p>
          <p className="text-2xl font-bold text-orange-900">
            {estudiantesEnRango.length > 0 ? Math.round((estudiantesEnRango.length / estudiantes.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  )
}
