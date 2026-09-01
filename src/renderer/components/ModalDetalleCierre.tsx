import React from 'react'
import { X, Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import type { CierreDiario } from '@renderer/hooks/useCierre'

interface ModalDetalleCierreProps {
  cierre: CierreDiario
  isOpen: boolean
  onClose: () => void
}

export const ModalDetalleCierre: React.FC<ModalDetalleCierreProps> = ({ cierre, isOpen, onClose }) => {
  if (!isOpen || !cierre) return null

  const fecha = new Date(cierre.fecha)
  const hora = new Date(cierre.creado_en).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  const totalMontoPorMetodo = Object.values(cierre.resumen_por_metodo).reduce((sum, monto) => sum + (monto as number), 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="sticky top-0 flex items-center justify-between p-6 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Calendar size={24} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Detalle del Cierre</h2>
              <p className="text-xs text-slate-400">{formatoFecha(cierre.fecha)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition text-slate-400 hover:text-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-6">
          {/* FECHA Y HORA */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-blue-400" />
                <p className="text-xs text-slate-400 font-bold">FECHA DEL CIERRE</p>
              </div>
              <p className="text-2xl font-black text-blue-300">{formatoFecha(cierre.fecha)}</p>
            </div>
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-purple-400" />
                <p className="text-xs text-slate-400 font-bold">HORA DEL CIERRE</p>
              </div>
              <p className="text-2xl font-black text-purple-300">{hora}</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-xs text-green-300 mb-1 font-bold">TOTAL RECAUDADO</p>
              <p className="text-xl font-black text-green-400">{formatoMoneda(cierre.total_pagos)}</p>
            </div>
            <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-xs text-blue-300 mb-1 font-bold">CANTIDAD PAGOS</p>
              <p className="text-xl font-black text-blue-400">{cierre.cantidad_pagos}</p>
            </div>
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-xs text-red-300 mb-1 font-bold">DEUDAS VENCIDAS</p>
              <p className="text-xl font-black text-red-400">{formatoMoneda(cierre.total_deudas_vencidas)}</p>
            </div>
            <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg">
              <p className="text-xs text-purple-300 mb-1 font-bold">ESTUDIANTES</p>
              <p className="text-xl font-black text-purple-400">{cierre.total_estudiantes}</p>
            </div>
            <div className="p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <p className="text-xs text-orange-300 mb-1 font-bold">EN MORA</p>
              <p className="text-xl font-black text-orange-400">{cierre.estudiantes_en_mora}</p>
            </div>
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/50 rounded-lg">
              <p className="text-xs text-indigo-300 mb-1 font-bold">% COBRO</p>
              <p className="text-xl font-black text-indigo-400">{cierre.porcentaje_cobro}%</p>
            </div>
          </div>

          {/* TABLA DE MÉTODOS DE PAGO */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-amber-400" />
              <h3 className="font-bold text-white text-lg">RECAUDACIÓN POR MÉTODO</h3>
            </div>

            {Object.keys(cierre.resumen_por_metodo).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-600 bg-slate-900/50">
                      <th className="text-left py-3 px-3 text-xs font-bold text-slate-400">Método</th>
                      <th className="text-center py-3 px-3 text-xs font-bold text-slate-400">Cantidad</th>
                      <th className="text-right py-3 px-3 text-xs font-bold text-slate-400">Monto</th>
                      <th className="text-right py-3 px-3 text-xs font-bold text-slate-400">% del Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(cierre.resumen_por_metodo).map(([metodo, monto]) => {
                      const cantidad = cierre.resumen_por_metodo_cantidad[metodo] || 0
                      const porcentaje = totalMontoPorMetodo > 0 ? ((monto as number) / totalMontoPorMetodo) * 100 : 0
                      return (
                        <tr key={metodo} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition">
                          <td className="py-3 px-3 font-medium text-slate-300">{metodo}</td>
                          <td className="py-3 px-3 text-center font-bold text-blue-400">{cantidad}</td>
                          <td className="py-3 px-3 text-right font-bold text-green-400">{formatoMoneda(monto as number)}</td>
                          <td className="py-3 px-3 text-right font-bold text-amber-400">{porcentaje.toFixed(1)}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-900/50 font-bold">
                      <td colSpan={1} className="py-3 px-3 text-slate-300">TOTAL</td>
                      <td className="py-3 px-3 text-center text-blue-400">{cierre.cantidad_pagos}</td>
                      <td className="py-3 px-3 text-right text-green-400">{formatoMoneda(totalMontoPorMetodo)}</td>
                      <td className="py-3 px-3 text-right text-amber-400">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">No hay registros de métodos de pago</p>
            )}
          </div>

          {/* RESUMEN FINAL */}
          <div className="p-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 font-bold mb-3">INFORMACIÓN DEL REGISTRO</p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Registrado en:</span>
                <span className="font-medium text-slate-300">{new Date(cierre.creado_en).toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de cierre:</span>
                <span className="font-medium text-slate-300">Diario</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-lg font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
