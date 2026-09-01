import React, { useState, useMemo } from 'react'
import { AlertCircle, Filter, Search, TrendingDown, ChevronDown } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import type { Deuda } from '@renderer/hooks/useDeudas'

interface TablaDeudasProps {
  deudas: Deuda[]
  loading?: boolean
  onSeleccionar?: (estudiante_id: number) => void
}

export const TablaDeudas: React.FC<TablaDeudasProps> = ({
  deudas,
  loading = false,
  onSeleccionar,
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [filtroCarrera, setFiltroCarrera] = useState<string>('')
  const [ordenar, setOrdenar] = useState<'deuda' | 'nombre'>('deuda')
  const [expandido, setExpandido] = useState<number | null>(null)

  const carreras = useMemo(() => {
    return [...new Set(deudas.map((d) => d.carrera))].sort()
  }, [deudas])

  const deudasFiltradas = useMemo(() => {
    let resultado = deudas.filter((deuda) => {
      const coincideBusqueda =
        deuda.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        deuda.dni.includes(busqueda)

      let coincideEstado = true
      if (filtroEstado === 'mora') {
        coincideEstado = deuda.es_deudor === true
      } else if (filtroEstado === 'pagado') {
        coincideEstado = deuda.es_deudor === false
      }

      const coincideCarrera = !filtroCarrera || deuda.carrera === filtroCarrera

      return coincideBusqueda && coincideEstado && coincideCarrera
    })

    if (ordenar === 'deuda') {
      resultado.sort((a, b) => b.saldo_adeudado - a.saldo_adeudado)
    } else {
      resultado.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
    }

    return resultado
  }, [deudas, busqueda, filtroEstado, filtroCarrera, ordenar])

  const resumen = useMemo(() => {
    return {
      totalDeuda: deudasFiltradas.reduce((sum, d) => sum + d.saldo_adeudado, 0),
      enMora: deudasFiltradas.filter((d) => d.es_deudor === true).length,
      pagado: deudasFiltradas.filter((d) => d.es_deudor === false).length,
    }
  }, [deudasFiltradas])

  // ? CORREGIDO: Usar porcentaje de deuda real
  const getIndicadorMora = (deuda: Deuda): { texto: string; color: string } => {
    if (deuda.saldo_adeudado === 0) {
      return { texto: 'Al día', color: 'bg-green-500/20 border-green-500/50 text-green-400' }
    }
    
    const totalResponsable = deuda.total_adeudado + deuda.total_pagado
    const porcentajeDeuda = totalResponsable > 0 ? (deuda.total_adeudado / totalResponsable) * 100 : 0
    
    if (porcentajeDeuda > 50) {
      return { texto: 'Deuda crítica (>50%)', color: 'bg-red-500/20 border-red-500/50 text-red-400' }
    } else if (porcentajeDeuda > 25) {
      return { texto: 'Deuda media', color: 'bg-orange-500/20 border-orange-500/50 text-orange-400' }
    } else if (porcentajeDeuda > 0) {
      return { texto: 'Deuda menor', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' }
    }
    
    return { texto: 'Al día', color: 'bg-green-500/20 border-green-500/50 text-green-400' }
  }
  return (
    <div className="space-y-6">
      {/* RESUMEN SUPERIOR */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/50 rounded-xl">
          <p className="text-xs text-red-300 font-bold mb-1">En Mora</p>
          <p className="text-2xl font-black text-red-400">{resumen.enMora}</p>
          <p className="text-xs text-red-300 mt-1">estudiantes</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/50 rounded-xl">
          <p className="text-xs text-green-300 font-bold mb-1">Al DÃ­a</p>
          <p className="text-2xl font-black text-green-400">{resumen.pagado}</p>
          <p className="text-xs text-green-300 mt-1">estudiantes</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/50 rounded-xl">
          <p className="text-xs text-blue-300 font-bold mb-1">Total Adeudado</p>
          <p className="text-2xl font-black text-blue-400">{formatoMoneda(resumen.totalDeuda)}</p>
          <p className="text-xs text-blue-300 mt-1">en cartera</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-400" />
          <h3 className="font-bold text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar nombre o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none transition"
          >
            <option value="">Todos</option>
            <option value="mora">En Mora</option>
            <option value="pagado">Al DÃ­a</option>
          </select>

          <select
            value={filtroCarrera}
            onChange={(e) => setFiltroCarrera(e.target.value)}
            className="px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white focus:border-blue-500/50 focus:outline-none transition"
          >
            <option value="">Todas las carreras</option>
            {carreras.map((carrera) => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setOrdenar('deuda')}
            className={`px-3 py-1.5 rounded text-sm font-bold transition ${
              ordenar === 'deuda'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
            }`}
          >
            Por Deuda â†“
          </button>
          <button
            onClick={() => setOrdenar('nombre')}
            className={`px-3 py-1.5 rounded text-sm font-bold transition ${
              ordenar === 'nombre'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
            }`}
          >
            Por Nombre A-Z
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Estudiante</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">DNI</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Carrera</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Estado</th>
                <th className="px-4 py-3 text-right font-bold text-slate-300">Deuda</th>
                <th className="px-4 py-3 text-left font-bold text-slate-300">Indicador</th>
                <th className="px-4 py-3 text-center font-bold text-slate-300">AcciÃ³n</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle size={18} className="animate-spin" />
                      Cargando deudas...
                    </div>
                  </td>
                </tr>
              ) : deudasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle size={18} />
                      No hay deudas que mostrar
                    </div>
                  </td>
                </tr>
              ) : (
                deudasFiltradas.map((deuda) => {
                  const indicador = getIndicadorMora(deuda)
                  const esExpandido = expandido === deuda.estudiante_id

                  return (
                    <React.Fragment key={deuda.estudiante_id}>
                      <tr
                        className={`hover:bg-slate-700/30 transition cursor-pointer ${
                          deuda.es_deudor ? 'bg-red-500/10' : 'bg-green-500/10'
                        }`}
                        onClick={() => onSeleccionar?.(deuda.estudiante_id)}
                      >
                        <td className="px-4 py-4 font-semibold text-white">
                          {deuda.nombre_completo}
                        </td>
                        <td className="px-4 py-4 text-slate-400 font-mono">{deuda.dni}</td>
                        <td className="px-4 py-4 text-slate-400">{deuda.carrera}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            deuda.estado === 'BECADO_100' ? 'bg-blue-500/30 text-blue-300' :
                            deuda.estado === 'BECADO_50' ? 'bg-purple-500/30 text-purple-300' :
                            'bg-slate-600/30 text-slate-300'
                          }`}>
                            {deuda.estado === 'BECADO_100' ? 'Becado 100%' :
                             deuda.estado === 'BECADO_50' ? 'Becado 50%' :
                             'Activo'}
                          </span>
                        </td>
                        <td className={`px-4 py-4 text-right font-black ${
                          deuda.es_deudor ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {formatoMoneda(deuda.saldo_adeudado)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${indicador.color}`}>
                            {indicador.texto}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandido(esExpandido ? null : deuda.estudiante_id)
                              onSeleccionar?.(deuda.estudiante_id)
                            }}
                            className="p-2 hover:bg-blue-600/30 rounded-lg text-blue-400 hover:text-blue-300 transition"
                          >
                            <ChevronDown size={18} className={`transition ${esExpandido ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>

                      {/* FILA EXPANDIDA */}
                      {esExpandido && (
                        <tr className="bg-slate-700/20 border-t border-slate-700/30">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-4 gap-4">
                              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
                                <p className="text-xs text-slate-400 mb-1">Total Conceptos</p>
                                <p className="text-lg font-bold text-white">{deuda.conceptos_totales}</p>
                              </div>
                              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                <p className="text-xs text-green-300 mb-1">Pagados</p>
                                <p className="text-lg font-bold text-green-400">{deuda.conceptos_pagados}</p>
                              </div>
                              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                <p className="text-xs text-red-300 mb-1">Adeudados</p>
                                <p className="text-lg font-bold text-red-400">{deuda.conceptos_adeudados}</p>
                              </div>
                              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                <p className="text-xs text-blue-300 mb-1">Pagado</p>
                                <p className="text-lg font-bold text-blue-400">{formatoMoneda(deuda.total_pagado)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}





