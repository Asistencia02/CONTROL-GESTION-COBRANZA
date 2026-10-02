import React, { useState, useEffect } from 'react'
import { useGlobal } from '@renderer/hooks/useGlobal'
import { formatoMoneda } from '@renderer/lib/helpers'
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'

type VistaGlobal = 'anual' | 'mes-actual'

export const GlobalModerno: React.FC = () => {
  const { datosGlobales, datosPorMesAnual, datosPorMesActual, loading, error, cargarDatosGlobales, cargarDatosPorMes } = useGlobal()
  const [vistaActiva, setVistaActiva] = useState<VistaGlobal>('anual')

  useEffect(() => {
    cargarDatosGlobales()
    cargarDatosPorMes(vistaActiva === 'anual')
  }, [vistaActiva, cargarDatosGlobales, cargarDatosPorMes])

  const datosPorMes = vistaActiva === 'anual' ? datosPorMesAnual : datosPorMesActual

  const totalPorConcepto = (concepto: keyof typeof datosPorMes[0]) => {
    return datosPorMes.reduce((sum, mes) => sum + (mes[concepto] || 0), 0)
  }

  if (loading && datosGlobales.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl mb-4 border border-purple-500/50">
            <TrendingUp size={32} className="text-purple-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando reporte global...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/50">
              <TrendingUp size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reporte Global
              </h1>
              <p className="text-slate-400 mt-1">Vista consolidada de ambas instituciones</p>
            </div>
          </div>
          <button
            onClick={() => {
              cargarDatosGlobales()
              cargarDatosPorMes(vistaActiva === 'anual')
            }}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-lg text-red-400 font-semibold flex items-center gap-2 mb-6">
            <AlertCircle size={20} />
            {error}
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="mb-8">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <button
            onClick={() => setVistaActiva('anual')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
              vistaActiva === 'anual'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Anual
          </button>
          <button
            onClick={() => setVistaActiva('mes-actual')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
              vistaActiva === 'mes-actual'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Mes Actual
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL - POR INSTITUCIÓN */}
      <div className="mb-8 overflow-x-auto">
        <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-6">Resumen por Institución</h2>

          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Concepto</th>
                {datosGlobales.map(inst => (
                  <th key={inst.institucion_id} className="px-4 py-3 text-right text-slate-300 font-bold">
                    {inst.institucion_nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {/* Cuotas */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Cuotas Recaudadas</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-orange-400 font-semibold">
                    {formatoMoneda(inst.cuotas_recaudadas)}
                  </td>
                ))}
              </tr>

              {/* Inscripción */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Inscripción Recaudada</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-blue-400 font-semibold">
                    {formatoMoneda(inst.inscripcion_recaudada)}
                  </td>
                ))}
              </tr>

              {/* Seguro */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Seguro Recaudado</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-green-400 font-semibold">
                    {formatoMoneda(inst.seguro_recaudado)}
                  </td>
                ))}
              </tr>

              {/* Subtotal Cobranza */}
              <tr className="bg-slate-700/50 hover:bg-slate-700/70 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-white">Subtotal Cobranza</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-amber-400 font-black text-lg">
                    {formatoMoneda(inst.subtotal_cobranza)}
                  </td>
                ))}
              </tr>

              {/* Deudas Pendientes */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Total Deudas Pendientes</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-red-400 font-semibold">
                    {formatoMoneda(inst.total_deudas)}
                  </td>
                ))}
              </tr>

              {/* Gastos */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Total Gastos</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-rose-400 font-semibold">
                    {formatoMoneda(inst.total_gastos)}
                  </td>
                ))}
              </tr>

              {/* Otros Ingresos */}
              <tr className="bg-slate-700/30 hover:bg-slate-700/50 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-slate-200">Otros Ingresos:</td>
                <td></td>
              </tr>

              {/* Caja Grande Kiosco */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300 pl-8">├─ Caja Grande (Kiosco)</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-400 font-semibold">
                    {formatoMoneda(inst.caja_grande_kiosco)}
                  </td>
                ))}
              </tr>

              {/* Ventas Insumo */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300 pl-8">└─ Ventas Insumo</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-400 font-semibold">
                    {formatoMoneda(inst.ventas_insumo)}
                  </td>
                ))}
              </tr>

              {/* Subtotal Otros Ingresos */}
              <tr className="bg-slate-700/50 hover:bg-slate-700/70 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-white">Subtotal Otros Ingresos</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-300 font-black text-lg">
                    {formatoMoneda(inst.subtotal_otros_ingresos)}
                  </td>
                ))}
              </tr>

              {/* Total Ingresos */}
              <tr className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40 transition border-y border-purple-500/50">
                <td className="px-4 py-3 font-bold text-white">TOTAL INGRESOS</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-purple-300 font-black text-xl">
                    {formatoMoneda(inst.total_ingresos)}
                  </td>
                ))}
              </tr>

              {/* Balance Final */}
              <tr className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 hover:from-green-600/40 hover:to-emerald-600/40 transition border-y border-green-500/50">
                <td className="px-4 py-3 font-black text-white">💰 BALANCE FINAL</td>
                {datosGlobales.map(inst => (
                  <td
                    key={inst.institucion_id}
                    className={`px-4 py-3 text-right font-black text-xl ${
                      inst.balance >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {formatoMoneda(inst.balance)}
                  </td>
                ))}
              </tr>

              {/* BALANCE GLOBAL (SUMA DE AMBAS) */}
              <tr className="bg-gradient-to-r from-blue-600/40 to-cyan-600/40 border-y border-blue-500/50">
                <td className="px-4 py-3 font-black text-white text-lg">🌍 BALANCE GLOBAL TOTAL</td>
                <td
                  colSpan={datosGlobales.length}
                  className={`px-4 py-3 text-right font-black text-2xl ${
                    datosGlobales.reduce((sum, inst) => sum + inst.balance, 0) >= 0 ? 'text-cyan-300' : 'text-red-300'
                  }`}
                >
                  {formatoMoneda(datosGlobales.reduce((sum, inst) => sum + inst.balance, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DETALLADA POR MES */}
      {datosPorMes.length > 0 && (
        <div className="overflow-x-auto">
          <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-6">
              Desglose {vistaActiva === 'anual' ? 'Anual' : 'Mes Actual'}
            </h2>

            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">Mes</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Cuotas</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Inscrip.</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Seguro</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Deudas</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Gastos</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Kiosco</th>
                  <th className="px-4 py-3 text-right text-slate-300 font-bold">Insumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {datosPorMes.map((mes, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-300 capitalize">{mes.mes_nombre}</td>
                    <td className="px-4 py-3 text-right text-orange-400 font-semibold">{formatoMoneda(mes.cuotas)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold">{formatoMoneda(mes.inscripcion)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatoMoneda(mes.seguro)}</td>
                    <td className="px-4 py-3 text-right text-red-400 font-semibold">{formatoMoneda(mes.deudas)}</td>
                    <td className="px-4 py-3 text-right text-rose-400 font-semibold">{formatoMoneda(mes.gastos)}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{formatoMoneda(mes.kiosco)}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{formatoMoneda(mes.insumo)}</td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-slate-700/50 hover:bg-slate-700/70 transition border-t-2 border-slate-600">
                  <td className="px-4 py-3 font-bold text-white">TOTAL</td>
                  <td className="px-4 py-3 text-right text-orange-300 font-black">{formatoMoneda(totalPorConcepto('cuotas'))}</td>
                  <td className="px-4 py-3 text-right text-blue-300 font-black">{formatoMoneda(totalPorConcepto('inscripcion'))}</td>
                  <td className="px-4 py-3 text-right text-green-300 font-black">{formatoMoneda(totalPorConcepto('seguro'))}</td>
                  <td className="px-4 py-3 text-right text-red-300 font-black">{formatoMoneda(totalPorConcepto('deudas'))}</td>
                  <td className="px-4 py-3 text-right text-rose-300 font-black">{formatoMoneda(totalPorConcepto('gastos'))}</td>
                  <td className="px-4 py-3 text-right text-cyan-300 font-black">{formatoMoneda(totalPorConcepto('kiosco'))}</td>
                  <td className="px-4 py-3 text-right text-cyan-300 font-black">{formatoMoneda(totalPorConcepto('insumo'))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalModerno
