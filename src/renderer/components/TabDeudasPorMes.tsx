import React, { useState } from 'react'
import { DeudasPorMes, AlumnoDeuda } from '@renderer/hooks/useDeudasPorMes'
import { formatoMoneda } from '@renderer/lib/helpers'
import { ChevronDown, AlertCircle, Users, Filter } from 'lucide-react'

interface TabDeudasPorMesProps {
  deudasPorMes: DeudasPorMes[]
  carreras: Array<{ id: number; nombre: string }>
  loading: boolean
  error: string | null
}

export const TabDeudasPorMes: React.FC<TabDeudasPorMesProps> = ({ deudasPorMes, carreras, loading, error }) => {
  const [mesExpandido, setMesExpandido] = useState<number | null>(null)
  const [filtroCarrera, setFiltroCarrera] = useState<number | null>(null)

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'BECADO_50':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'BECADO_100':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50'
    }
  }

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'ACTIVO':
        return 'Activo'
      case 'BECADO_50':
        return 'Becado 50%'
      case 'BECADO_100':
        return 'Becado 100%'
      default:
        return estado
    }
  }

  // Filtrar deudas por carrera
  const deudasFiltradas = deudasPorMes.map(mes => {
    const alumnosFiltrados = filtroCarrera 
      ? mes.alumnos.filter(a => a.carrera_id === filtroCarrera)
      : mes.alumnos

    return {
      ...mes,
      alumnos: alumnosFiltrados,
      total_alumnos: new Set(alumnosFiltrados.map(a => a.id)).size,
      monto_total: alumnosFiltrados.reduce((sum, a) => sum + a.deuda, 0),
    }
  })

  const totalGlobal = deudasFiltradas.reduce((sum, mes) => sum + mes.monto_total, 0)
  const totalAlumnosUnicos = new Set(
    deudasFiltradas.flatMap(mes => mes.alumnos.map(a => a.id))
  ).size

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4 border border-blue-500/50">
            <Users size={32} className="text-blue-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando deudas por mes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
        <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-300">Error al cargar deudas</p>
          <p className="text-red-200 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* FILTRO POR CARRERA */}
      <div className="p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <Filter size={24} className="text-blue-400" />
          </div>
          <label className="text-sm md:text-base font-bold text-slate-300">Filtrar por Carrera</label>
        </div>
        <select
          value={filtroCarrera || ''}
          onChange={(e) => setFiltroCarrera(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none transition"
        >
          <option value="">Todas las carreras</option>
          {carreras.map(carr => {
            const countTotal = new Set(deudasPorMes.flatMap(m => m.alumnos.filter(a => a.carrera_id === carr.id).map(a => a.id))).size
            return (
              <option key={carr.id} value={carr.id}>
                {carr.nombre} ({countTotal})
              </option>
            )
          })}
        </select>
      </div>

      {/* RESUMEN GLOBAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <p className="text-xs text-slate-400 font-bold mb-2">Alumnos únicos con deuda</p>
          <p className="text-3xl md:text-4xl font-black text-blue-400">{totalAlumnosUnicos}</p>
        </div>
        <div className="p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <p className="text-xs text-slate-400 font-bold mb-2">Total adeudado</p>
          <p className="text-3xl md:text-4xl font-black text-red-400">{formatoMoneda(totalGlobal)}</p>
        </div>
      </div>

      {/* ACORDEONES POR MES */}
      <div className="space-y-3">
        {deudasFiltradas.map(mesData => (
          <div key={mesData.mes} className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
            {/* HEADER DEL MES */}
            <button
              onClick={() => setMesExpandido(mesExpandido === mesData.mes ? null : mesData.mes)}
              className="w-full px-4 md:px-6 py-4 md:py-5 hover:bg-slate-700/30 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                    mesData.total_alumnos > 0 ? 'bg-red-600' : 'bg-slate-700'
                  }`}
                >
                  {mesData.mes}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base">{mesData.mes_nombre}</h3>
                  <p className="text-xs text-slate-400">
                    {mesData.total_alumnos > 0
                      ? `${mesData.total_alumnos} alumno(s) • ${formatoMoneda(mesData.monto_total)}`
                      : 'Sin deuda'}
                  </p>
                </div>
              </div>
              <ChevronDown
                size={20}
                className={`text-slate-400 transition-transform group-hover:text-slate-300 ${
                  mesExpandido === mesData.mes ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* CONTENIDO EXPANDIDO */}
            {mesExpandido === mesData.mes && mesData.total_alumnos > 0 && (
              <div className="border-t border-slate-700/50 bg-slate-900/30 px-4 md:px-6 py-4 md:py-5 space-y-3">
                {mesData.alumnos.map((alumno, idx) => (
                  <div
                    key={`${alumno.id}-${idx}`}
                    className="p-3 md:p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:border-slate-500/50 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                      {/* DATOS PERSONALES */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm md:text-base truncate">
                          {alumno.apellido}, {alumno.nombre}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs text-slate-400 font-mono bg-slate-800/50 px-2 py-1 rounded">
                            DNI: {alumno.dni}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded truncate">
                            {alumno.carrera}
                          </span>
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${getEstadoColor(alumno.estado)}`}>
                            {getEstadoLabel(alumno.estado)}
                          </span>
                        </div>
                      </div>

                      {/* MONTO */}
                      <div className="text-right">
                        <p className="text-xs text-slate-400 mb-0.5">Concepto: {alumno.concepto}</p>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-400">
                            {formatoMoneda(alumno.monto_original)} - {formatoMoneda(alumno.monto_pagado)}
                          </p>
                          <p className="text-lg md:text-xl font-black text-red-400">
                            {formatoMoneda(alumno.deuda)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MENSAJE CUANDO NO HAY DEUDA */}
            {mesExpandido === mesData.mes && mesData.total_alumnos === 0 && (
              <div className="border-t border-slate-700/50 bg-slate-900/30 px-4 md:px-6 py-6 md:py-8 text-center">
                <div className="inline-block p-3 md:p-4 bg-green-500/20 border border-green-500/50 rounded-lg mb-3">
                  <AlertCircle size={24} className="text-green-400" />
                </div>
                <p className="text-slate-400 font-semibold text-sm md:text-base">✓ Todos los alumnos pagaron</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MENSAJE SI NO HAY DATOS */}
      {deudasFiltradas.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle size={32} className="text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No hay datos disponibles</p>
        </div>
      )}
    </div>
  )
}

export default TabDeudasPorMes
