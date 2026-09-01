import React, { useState, useMemo } from 'react'
import { Search, X, ChevronDown, Users, Filter, RotateCcw } from 'lucide-react'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  estado: string
  carrera_id: number
}

interface FiltrosCobranzasModernosProps {
  estudiantes: Estudiante[]
  carreras: any[]
  onFiltrosChange: (filtrados: Estudiante[]) => void
  onEstudianteSeleccionado: (estudianteId: number | null) => void
  estudianteSeleccionado: number | null
}

export const FiltrosCobranzasModernos: React.FC<FiltrosCobranzasModernosProps> = ({
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

  // Calcular estudiantes filtrados y estadísticas en tiempo real
  const estudianosFiltrados = useMemo(() => {
    let resultado = estudiantes

    if (filtroNombre.trim()) {
      resultado = resultado.filter((e) =>
        (e.nombre + ' ' + e.apellido).toLowerCase().includes(filtroNombre.toLowerCase())
      )
    }

    if (filtroDni.trim()) {
      resultado = resultado.filter((e) => e.dni.includes(filtroDni))
    }

    if (filtroEstado) {
      resultado = resultado.filter((e) => e.estado === filtroEstado)
    }

    if (filtroCarrera) {
      resultado = resultado.filter((e) => e.carrera_id === filtroCarrera)
    }

    return resultado
  }, [filtroNombre, filtroDni, filtroEstado, filtroCarrera, estudiantes])

  // Actualizar parent cada vez que filtrados cambian
  React.useEffect(() => {
    onFiltrosChange(estudianosFiltrados)
  }, [estudianosFiltrados, onFiltrosChange])

  const handleNombreChange = (valor: string) => {
    setFiltroNombre(valor)
  }

  const handleDniChange = (valor: string) => {
    setFiltroDni(valor)
  }

  const handleEstadoChange = (valor: string) => {
    setFiltroEstado(valor)
  }

  const handleCarreraChange = (valor: number | null) => {
    setFiltroCarrera(valor)
  }

  const limpiarFiltros = () => {
    setFiltroNombre('')
    setFiltroDni('')
    setFiltroEstado('')
    setFiltroCarrera(null)
    onEstudianteSeleccionado(null)
  }

  const tieneFilterosActivos = filtroNombre || filtroDni || filtroEstado || filtroCarrera

  // Estadísticas
  const totalEstudiantes = estudiantes.length
  const activos = estudiantes.filter((e) => e.estado === 'ACTIVO').length
  const becados50 = estudiantes.filter((e) => e.estado === 'BECADO_50').length
  const becados100 = estudiantes.filter((e) => e.estado === 'BECADO_100').length
  const enCobranza = activos + becados50 + becados100

  const resultados = estudianosFiltrados.length
  const porcentajeResultados = totalEstudiantes > 0 ? Math.round((resultados / totalEstudiantes) * 100) : 0

  return (
    <div className="space-y-6">
      {/* HEADER FILTROS MODERNO */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                <Search size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Búsqueda Avanzada</h3>
                <p className="text-blue-100 text-sm mt-1">Filtra alumnos para realizar cobranza</p>
              </div>
            </div>
            <button
              onClick={() => setExpandedFilters(!expandedFilters)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
              title={expandedFilters ? 'Contraer' : 'Expandir'}
            >
              <ChevronDown
                size={20}
                className={`transition duration-300 ${expandedFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* FILTROS ACTIVOS BADGE */}
          {tieneFilterosActivos && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filtroNombre && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  <Users size={14} />
                  {filtroNombre}
                </span>
              )}
              {filtroDni && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  <Filter size={14} />
                  DNI: {filtroDni}
                </span>
              )}
              {filtroEstado && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  <Filter size={14} />
                  {filtroEstado === 'ACTIVO'
                    ? 'Activo'
                    : filtroEstado === 'BECADO_50'
                    ? 'Becado 50%'
                    : 'Becado 100%'}
                </span>
              )}
              {filtroCarrera && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  <Filter size={14} />
                  {carreras.find((c) => c.id === filtroCarrera)?.nombre || 'Carrera'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FILTROS EXPANDIDOS */}
      {expandedFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-md">
          {/* FILA 1: BÚSQUEDA RÁPIDA */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Search size={16} className="text-blue-600" />
              Búsqueda Rápida
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Búsqueda por Nombre */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Nombre o Apellido
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: Juan, Pérez..."
                    value={filtroNombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                  />
                </div>
                {filtroNombre && (
                  <p className="mt-2 text-xs text-blue-600 font-semibold">
                    {estudianosFiltrados.length} resultado(s)
                  </p>
                )}
              </div>

              {/* Búsqueda por DNI */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  DNI
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ej: 12345678"
                    value={filtroDni}
                    onChange={(e) => handleDniChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition"
                  />
                </div>
                {filtroDni && (
                  <p className="mt-2 text-xs text-blue-600 font-semibold">
                    {estudianosFiltrados.length} resultado(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* BOTÓN FILTROS AVANZADOS */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setMostrarFiltrosAvanzados(!mostrarFiltrosAvanzados)}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 transition hover:gap-3"
            >
              <Filter size={16} />
              {mostrarFiltrosAvanzados ? '−' : '+'} Filtros Avanzados
              <ChevronDown
                size={16}
                className={`transition duration-300 ${mostrarFiltrosAvanzados ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* FILTROS AVANZADOS */}
          {mostrarFiltrosAvanzados && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Filter size={16} className="text-blue-600" />
                Filtros Adicionales
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estado */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Estado del Alumno
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition"
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
            </div>
          )}

          {/* BOTÓN LIMPIAR */}
          {tieneFilterosActivos && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={limpiarFiltros}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 text-red-700 hover:text-red-800 rounded-lg font-bold transition flex items-center justify-center gap-2 border-2 border-red-200"
              >
                <RotateCcw size={18} />
                Limpiar todos los filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ESTADÍSTICAS EN TIEMPO REAL - GRID MEJORADO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Alumnos */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 p-4 text-center hover:shadow-lg transition">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-slate-200 rounded-lg">
              <Users size={20} className="text-slate-700" />
            </div>
          </div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-black text-slate-900">{totalEstudiantes}</p>
          <p className="text-xs text-slate-600 mt-2">alumnos registrados</p>
        </div>

        {/* En Cobranza */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 p-4 text-center hover:shadow-lg transition">
          <div className="flex justify-center mb-2">
            <div className="p-2 bg-blue-200 rounded-lg">
              <Filter size={20} className="text-blue-700" />
            </div>
          </div>
          <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">En Cobranza</p>
          <p className="text-3xl font-black text-blue-900">{enCobranza}</p>
          <p className="text-xs text-blue-600 mt-2">disponibles</p>
        </div>

        {/* Resultados Filtrados */}
        <div className={`rounded-xl border-2 p-4 text-center hover:shadow-lg transition ${
          resultados > 0
            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
        }`}>
          <div className="flex justify-center mb-2">
            <div className={`p-2 rounded-lg ${
              resultados > 0 ? 'bg-green-200' : 'bg-gray-200'
            }`}>
              <Search size={20} className={resultados > 0 ? 'text-green-700' : 'text-gray-700'} />
            </div>
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
            resultados > 0 ? 'text-green-700' : 'text-gray-700'
          }`}>Resultados</p>
          <p className={`text-3xl font-black ${
            resultados > 0 ? 'text-green-900' : 'text-gray-900'
          }`}>{resultados}</p>
          <p className={`text-xs mt-2 ${resultados > 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {resultados === 1 ? 'alumno encontrado' : 'alumnos encontrados'}
          </p>
        </div>

        {/* Porcentaje */}
        <div className={`rounded-xl border-2 p-4 text-center hover:shadow-lg transition ${
          porcentajeResultados >= 50
            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300'
            : porcentajeResultados >= 25
            ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300'
            : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'
        }`}>
          <div className="flex justify-center mb-2">
            <div className={`p-2 rounded-lg ${
              porcentajeResultados >= 50
                ? 'bg-emerald-200'
                : porcentajeResultados >= 25
                ? 'bg-orange-200'
                : 'bg-red-200'
            }`}>
              <span className={`text-lg font-black ${
                porcentajeResultados >= 50
                  ? 'text-emerald-700'
                  : porcentajeResultados >= 25
                  ? 'text-orange-700'
                  : 'text-red-700'
              }`}>%</span>
            </div>
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
            porcentajeResultados >= 50
              ? 'text-emerald-700'
              : porcentajeResultados >= 25
              ? 'text-orange-700'
              : 'text-red-700'
          }`}>Cobertura</p>
          <p className={`text-3xl font-black ${
            porcentajeResultados >= 50
              ? 'text-emerald-900'
              : porcentajeResultados >= 25
              ? 'text-orange-900'
              : 'text-red-900'
          }`}>{porcentajeResultados}%</p>
          <p className={`text-xs mt-2 ${
            porcentajeResultados >= 50
              ? 'text-emerald-600'
              : porcentajeResultados >= 25
              ? 'text-orange-600'
              : 'text-red-600'
          }`}>del total</p>
        </div>
      </div>

      {/* INFORMACIÓN ADICIONAL */}
      {tieneFilterosActivos && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Search size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">
                {resultados === 0
                  ? 'Sin resultados que coincidan con los filtros'
                  : `${resultados} ${resultados === 1 ? 'alumno' : 'alumnos'} encontrado(s) (${porcentajeResultados}% del total)`}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {tieneFilterosActivos && resultados > 0
                  ? 'Selecciona un alumno para comenzar la cobranza'
                  : 'Ajusta los filtros para encontrar alumnos específicos'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
