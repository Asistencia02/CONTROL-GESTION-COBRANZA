const fs = require('fs');

let content = fs.readFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', 'utf-8');

// SECCIÓN 1: Agregar en tab "comparativa" después de los cards de ingresos
const comparativaInsert = `
            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={28} className="text-indigo-400" />Ingresos por Método de Pago</h3>
              <p className="text-xs text-slate-400 mb-6">Desglose de cobros según forma de pago</p>
              
              {ingresosPorMetodo && ingresosPorMetodo.length > 0 ? (
                <>
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                          <th className="px-4 py-4 text-left font-bold text-white">💳 Método de Pago</th>
                          <th className="px-4 py-4 text-right font-bold text-green-400">💰 Total Cobrado</th>
                          <th className="px-4 py-4 text-center font-bold text-blue-400">📊 % Total</th>
                          <th className="px-4 py-4 text-center font-bold text-amber-400">📈 Transacciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresosPorMetodo.map((metodo, i) => (
                          <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-200">
                              {metodo.metodo_pago === 'EFECTIVO' && '💵'}
                              {metodo.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                              {metodo.metodo_pago === 'TARJETA_CRÉDITO' && '💳'}
                              {metodo.metodo_pago === 'TARJETA_DÉBITO' && '🪙'}
                              {' ' + metodo.metodo_pago}
                            </td>
                            <td className="px-4 py-4 text-right text-green-400 font-bold">{formatoMoneda(metodo.total)}</td>
                            <td className="px-4 py-4 text-center"><span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-lg font-bold text-sm">{metodo.porcentaje.toFixed(1)}%</span></td>
                            <td className="px-4 py-4 text-center text-amber-400 font-bold">{metodo.cantidad_transacciones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {ingresosPorMetodo.map((metodo, i) => (
                      <div key={i} className="p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-xl">
                        <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                          {metodo.metodo_pago === 'EFECTIVO' && '💵'}
                          {metodo.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                          {metodo.metodo_pago === 'TARJETA_CRÉDITO' && '💳'}
                          {metodo.metodo_pago === 'TARJETA_DÉBITO' && '🪙'}
                          {metodo.metodo_pago}
                        </h4>
                        <p className="text-2xl font-black text-cyan-300 mb-2">{formatoMoneda(metodo.total)}</p>
                        <div className="space-y-2 text-xs text-slate-400">
                          <p>Transacciones: <span className="text-amber-400 font-bold">{metodo.cantidad_transacciones}</span></p>
                          <p>Participación: <span className="text-blue-400 font-bold">{metodo.porcentaje.toFixed(1)}%</span></p>
                        </div>
                        <div className="relative h-6 bg-slate-700/50 rounded-full overflow-hidden mt-3 border border-slate-600/50">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 transition-all duration-1000" style={{ width: \`\${Math.min(metodo.porcentaje, 100)}%\` }} />
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-white drop-shadow">{metodo.porcentaje.toFixed(0)}%</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                  <p className="text-slate-400 font-semibold">Sin datos de métodos de pago</p>
                </div>
              )}
            </div>`;

// SECCIÓN 2: Agregar en tab "desglose" después de los conceptos
const desgloseInsert = `
      <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><TrendingUp size={28} className="text-teal-400" />Real vs Teórico por Carrera</h2>
        <p className="text-xs text-slate-400 mb-6">Comparativa de ingresos reales vs montos esperados</p>
        
        {realVsTeoricoCarrera && realVsTeoricoCarrera.length > 0 ? (
          <>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                    <th className="px-3 py-3 text-left font-bold text-white">📚 Carrera</th>
                    <th className="px-3 py-3 text-center font-bold text-blue-400">💎 Inscripción<br/><span className="text-xs text-slate-300">R/T</span></th>
                    <th className="px-3 py-3 text-center font-bold text-cyan-400">📅 Cuotas<br/><span className="text-xs text-slate-300">R/T</span></th>
                    <th className="px-3 py-3 text-center font-bold text-violet-400">🛡️ Seguros<br/><span className="text-xs text-slate-300">R/T</span></th>
                    <th className="px-3 py-3 text-center font-bold text-emerald-400">💰 Total<br/><span className="text-xs text-slate-300">R/T</span></th>
                    <th className="px-3 py-3 text-center font-bold text-orange-400">📊 % Cumpl.</th>
                  </tr>
                </thead>
                <tbody>
                  {realVsTeoricoCarrera.map((carrera, i) => (
                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
                      <td className="px-3 py-3 font-bold text-slate-200">{carrera.carrera}</td>
                      <td className="px-3 py-3 text-center text-blue-400 font-bold text-xs">
                        {formatoMoneda(carrera.inscripcion_real)} / {formatoMoneda(carrera.inscripcion_teorico)}
                      </td>
                      <td className="px-3 py-3 text-center text-cyan-400 font-bold text-xs">
                        {formatoMoneda(carrera.cuotas_real)} / {formatoMoneda(carrera.cuotas_teorico)}
                      </td>
                      <td className="px-3 py-3 text-center text-violet-400 font-bold text-xs">
                        {formatoMoneda(carrera.seguros_real)} / {formatoMoneda(carrera.seguros_teorico)}
                      </td>
                      <td className="px-3 py-3 text-center text-emerald-400 font-bold text-xs">
                        {formatoMoneda(carrera.total_real)} / {formatoMoneda(carrera.total_teorico)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={'px-2 py-1 rounded-lg font-bold text-xs ' + getEfficiencyClass(carrera.porcentaje_cumplimiento)}>
                          {carrera.porcentaje_cumplimiento.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {realVsTeoricoCarrera.map((carrera, i) => (
                <div key={i} className="p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-xl">
                  <h4 className="text-lg font-bold text-white mb-4 pb-2 border-b border-slate-700/50">{carrera.carrera}</h4>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-gradient-to-r from-blue-900/40 to-blue-800/20 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-blue-300 font-bold mb-1">💎 Inscripción</p>
                      <p className="text-sm text-blue-200 font-bold">{formatoMoneda(carrera.inscripcion_real)} / {formatoMoneda(carrera.inscripcion_teorico)}</p>
                      <div className="text-xs text-blue-400 mt-1">
                        {carrera.inscripcion_teorico > 0 && \`Cumpl: \${(carrera.inscripcion_real / carrera.inscripcion_teorico * 100).toFixed(1)}%\`}
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-cyan-900/40 to-cyan-800/20 rounded-lg border border-cyan-500/30">
                      <p className="text-xs text-cyan-300 font-bold mb-1">📅 Cuotas</p>
                      <p className="text-sm text-cyan-200 font-bold">{formatoMoneda(carrera.cuotas_real)} / {formatoMoneda(carrera.cuotas_teorico)}</p>
                      <div className="text-xs text-cyan-400 mt-1">
                        {carrera.cuotas_teorico > 0 && \`Cumpl: \${(carrera.cuotas_real / carrera.cuotas_teorico * 100).toFixed(1)}%\`}
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-violet-900/40 to-violet-800/20 rounded-lg border border-violet-500/30">
                      <p className="text-xs text-violet-300 font-bold mb-1">🛡️ Seguros</p>
                      <p className="text-sm text-violet-200 font-bold">{formatoMoneda(carrera.seguros_real)} / {formatoMoneda(carrera.seguros_teorico)}</p>
                      <div className="text-xs text-violet-400 mt-1">
                        {carrera.seguros_teorico > 0 && \`Cumpl: \${(carrera.seguros_real / carrera.seguros_teorico * 100).toFixed(1)}%\`}
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 rounded-lg border border-emerald-500/30">
                      <p className="text-xs text-emerald-300 font-bold mb-1">💰 Total</p>
                      <p className="text-sm text-emerald-200 font-bold">{formatoMoneda(carrera.total_real)} / {formatoMoneda(carrera.total_teorico)}</p>
                      <div className="text-xs text-emerald-400 mt-1">Diferencia: {formatoMoneda(carrera.total_real - carrera.total_teorico)}</div>
                    </div>

                    <div className="relative h-6 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000" style={{ width: \`\${Math.min(carrera.porcentaje_cumplimiento, 100)}%\` }} />
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-white drop-shadow">{carrera.porcentaje_cumplimiento.toFixed(1)}%</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <p className="text-slate-400 font-semibold">Sin datos de comparativa Real vs Teórico</p>
          </div>
        )}
      </div>`;

// Buscar e insertar en "comparativa"
const comparativaPattern = 'case \'comparativa\':';
const comparativaEnd = '              ) : (';
const comparativaIdx = content.indexOf(comparativaEnd);
if (comparativaIdx > -1) {
  content = content.substring(0, comparativaIdx) + comparativaInsert + '\n\n            ' + content.substring(comparativaIdx);
}

// Buscar e insertar en "desglose"
const desglosePattern = '// NUEVO CASO: DESGLOSE';
const afterDesgloseTable = 'case \'desglose\':\n  return (\n    <div className="space-y-6">';
const desgloseIdx = content.indexOf(afterDesgloseTable);
if (desgloseIdx > -1) {
  const afterTableIdx = content.indexOf('</div>', desgloseIdx) + 6;
  content = content.substring(0, afterTableIdx) + '\n' + desgloseInsert + '\n    ' + content.substring(afterTableIdx);
}

fs.writeFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', content, 'utf-8');
console.log('✅ Secciones agregadas');
