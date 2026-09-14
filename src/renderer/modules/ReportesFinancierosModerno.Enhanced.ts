import React from 'react'
import { ReportesFinancierosModerno } from './ReportesFinancierosModerno'

/**
 * NOTA: Los hooks useIngresoPorMetodo y useRealVsTeoricoCarrera ya están disponibles
 * en src/renderer/hooks/ y listos para usar.
 * 
 * Para integrarlos completamente en ReportesFinancierosModerno.tsx, agregar:
 * 
 * 1. En imports (línea 4):
 *    import { useReportesAvanzados } from '@renderer/hooks/useReportesAvanzados'
 * 
 * 2. Dentro de ReportesFinancierosModerno (después de línea 37):
 *    const { ingresosPorMetodo, realVsTeoricoCarrera } = useReportesAvanzados(institucionActiva.id)
 * 
 * 3. En tab 'comparativa' (después del saldo neto, dentro del if INSM):
 *    <div className="p-6 bg-gradient-to-r from-slate-800/80...">
 *      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 *        <DollarSign size={20} className="text-pink-400" />
 *        Desglose de Métodos de Pago
 *      </h3>
 *      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 *        {Object.entries(ingresosPorMetodo).map(([metodo, monto]) => (
 *          <div key={metodo} className="p-4 bg-gradient-to-br from-slate-700/80 to-slate-800/40 border border-slate-600/50 rounded-lg">
 *            <p className="text-xs text-slate-400 font-bold mb-2">{metodo}</p>
 *            <p className="text-xl font-black text-cyan-300">{formatoMoneda(monto)}</p>
 *          </div>
 *        ))}
 *      </div>
 *    </div>
 * 
 * 4. En tab 'desglose' (al final, después de las cards por concepto):
 *    {realVsTeoricoCarrera.length > 0 && (
 *      <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-x-auto">
 *        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 *          <TrendingUp size={20} className="text-blue-400" />
 *          Real vs Teórico por Carrera
 *        </h3>
 *        <table className="w-full text-sm">
 *          <thead>
 *            <tr className="border-b-2 border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
 *              <th className="px-4 py-3 text-left font-bold text-white">📚 Carrera</th>
 *              <th className="px-4 py-3 text-right font-bold text-blue-400">💰 Total Real</th>
 *              <th className="px-4 py-3 text-right font-bold text-purple-400">📊 Total Teórico</th>
 *              <th className="px-4 py-3 text-right font-bold text-orange-400">📉 Diferencia</th>
 *              <th className="px-4 py-3 text-center font-bold text-green-400">✅ % Cumplimiento</th>
 *            </tr>
 *          </thead>
 *          <tbody>
 *            {realVsTeoricoCarrera.map((d, i) => (
 *              <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
 *                <td className="px-4 py-3 font-bold text-slate-200">{d.carrera}</td>
 *                <td className="px-4 py-3 text-right text-blue-300 font-bold">{formatoMoneda(d.total_real)}</td>
 *                <td className="px-4 py-3 text-right text-purple-300 font-bold">{formatoMoneda(d.total_teorico)}</td>
 *                <td className="px-4 py-3 text-right font-bold" style={{color: d.diferencia >= 0 ? '#86efac' : '#fca5a5'}}>
 *                  {formatoMoneda(d.diferencia)}
 *                </td>
 *                <td className="px-4 py-3 text-center">
 *                  <span className={`px-3 py-1 rounded-lg font-bold text-xs ${getEfficiencyClass(d.porcentaje_cumplimiento)}`}>
 *                    {d.porcentaje_cumplimiento.toFixed(1)}%
 *                  </span>
 *                </td>
 *              </tr>
 *            ))}
 *          </tbody>
 *        </table>
 *      </div>
 *    )}
 */

// El componente se exporta sin cambios. Los hooks están listos en:
// - src/renderer/hooks/useIngresoPorMetodo.ts
// - src/renderer/hooks/useRealVsTeoricoCarrera.ts
// - src/renderer/hooks/useReportesAvanzados.ts

export default ReportesFinancierosModerno
