import React, { useState, useMemo } from 'react'
import { AlertCircle, Filter, Search, TrendingDown } from 'lucide-react'
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
        // Usar es_deudor en lugar de saldo_adeudado
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

  const getColorEstado = (saldoAdeudado: number, estado: string): string => {
    if (saldoAdeudado === 0) return 'bg-green-100 text-green-800'
    if (estado === 'BECADO_100') return 'bg-blue-100 text-blue-800'
    if (estado === 'BECADO_50') return 'bg-yellow-100 text-yellow-800'
    if (estado === 'INACTIVO') return 'bg-gray-100 text-gray-800'
    if (estado === 'ACTIVO') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800' // Default fallback
  }

  const getIndicadorMora = (saldoAdeudado: number): string => {
    if (saldoAdeudado === 0) return '✓ Al día'
    if (saldoAdeudado < 5000) return '⚠️ Deuda menor'
    if (saldoAdeudado < 15000) return '⚠️ Deuda media'
    return '🔴 Deuda crítica'
  }

  return (
    <div className="space-y-4">
      {/* RESUMEN SUPERIOR */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">En Mora</p>
          <p className="text-2xl font-bold text-red-900">{resumen.enMora}</p>
          <p className="text-xs text-red-600 mt-1">estudiantes</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">Al Día</p>
          <p className="text-2xl font-bold text-green-900">{resumen.pagado}</p>
          <p className="text-xs text-green-600 mt-1">estudiantes</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">Total Adeudado</p>
          <p className="text-2xl font-bold text-blue-900">{formatoMoneda(resumen.totalDeuda)}</p>
          <p className="text-xs text-blue-600 mt-1">en toda la cartera</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filtros</h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="mora">En Mora</option>
              <option value="pagado">Al Día</option>
            </select>
          </div>

          <div>
            <select
              value={filtroCarrera}
              onChange={(e) => setFiltroCarrera(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las carreras</option>
              {carreras.map((carrera) => (
                <option key={carrera} value={carrera}>
                  {carrera}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setOrdenar('deuda')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              ordenar === 'deuda'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ordenar por Deuda
          </button>
          <button
            onClick={() => setOrdenar('nombre')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              ordenar === 'nombre'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ordenar por Nombre
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Estudiante</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">DNI</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Carrera</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Teléfono</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Total Adeudado</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Total Pagado</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Indicador</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    Cargando deudas...
                  </td>
                </tr>
              ) : deudasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No hay deudas que mostrar
                  </td>
                </tr>
              ) : (
                deudasFiltradas.map((deuda) => (
                  <tr
                    key={deuda.estudiante_id}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      deuda.es_deudor ? 'bg-red-50' : ''
                    }`}
                    onClick={() => onSeleccionar?.(deuda.estudiante_id)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {deuda.nombre_completo}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{deuda.dni}</td>
                    <td className="px-6 py-4 text-gray-700">{deuda.carrera}</td>
                    <td className="px-6 py-4 text-gray-600">{deuda.telefono || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getColorEstado(
                          deuda.saldo_adeudado,
                          deuda.estado
                        )}`}
                      >
                        {deuda.estado === 'BECADO_100'
                          ? 'Becado 100%'
                          : deuda.estado === 'BECADO_50'
                            ? 'Becado 50%'
                            : 'Activo'}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${
                        deuda.es_deudor ? 'text-red-700' : 'text-green-700'
                      }`}
                    >
                      {formatoMoneda(deuda.saldo_adeudado)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-700">
                      {formatoMoneda(deuda.total_pagado)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                          deuda.saldo_adeudado === 0
                            ? 'bg-green-100 text-green-800'
                            : deuda.saldo_adeudado < 5000
                              ? 'bg-yellow-100 text-yellow-800'
                              : deuda.saldo_adeudado < 15000
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {deuda.saldo_adeudado === 0 ? '✓' : '!'}
                        {getIndicadorMora(deuda.saldo_adeudado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSeleccionar?.(deuda.estudiante_id)
                        }}
                        className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold transition"
                      >
                        Ver
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
