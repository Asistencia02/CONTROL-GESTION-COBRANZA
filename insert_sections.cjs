const fs = require('fs');

const content = fs.readFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', 'utf-8');
const lines = content.split('\n');

// SECCIÓN 1: Métodos de Pago - insertar DESPUÉS de línea 628
const metodosPago = `
                  {/* NUEVA SECCIÓN: INGRESOS POR MÉTODO DE PAGO */}
                  <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl mt-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={20} className="text-indigo-400" />Ingresos por Método de Pago</h3>
                    {ingresosPorMetodo && ingresosPorMetodo.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ingresosPorMetodo.map((metodo, idx) => (
                          <div key={idx} className="p-4 bg-gradient-to-br from-slate-700/80 to-slate-800/40 border border-slate-600/50 rounded-lg text-center">
                            <p className="text-xs text-slate-400 font-bold mb-2">
                              {metodo.metodo_pago === 'EFECTIVO' && '💵'}
                              {metodo.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                              {metodo.metodo_pago === 'TARJETA_CRÉDITO' && '💳'}
                              {metodo.metodo_pago === 'TARJETA_DÉBITO' && '🪙'}
                              {' ' + metodo.metodo_pago}
                            </p>
                            <p className="text-xl font-black text-cyan-300">{formatoMoneda(metodo.total)}</p>
                            <p className="text-xs text-slate-400 mt-2">{metodo.porcentaje.toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm text-center py-4">Sin datos de métodos de pago</p>
                    )}
                  </div>`;

// SECCIÓN 2: Real vs Teórico - insertar ANTES de línea 706
const realVsTeoricoSection = `
        
        {/* NUEVA SECCIÓN: REAL VS TEÓRICO POR CARRERA */}
        {realVsTeoricoCarrera && realVsTeoricoCarrera.length > 0 && (
          <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-teal-400" />Real vs Teórico por Carrera</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                  <th className="px-4 py-3 text-left font-bold text-white">📚 Carrera</th>
                  <th className="px-4 py-3 text-right font-bold text-blue-400">💎 Insc. Real</th>
                  <th className="px-4 py-3 text-right font-bold text-purple-400">💎 Teórico</th>
                  <th className="px-4 py-3 text-right font-bold text-cyan-400">📅 Cuotas Real</th>
                  <th className="px-4 py-3 text-right font-bold text-purple-400">📅 Teórico</th>
                  <th className="px-4 py-3 text-center font-bold text-green-400">✅ % Cumpl.</th>
                </tr>
              </thead>
              <tbody>
                {realVsTeoricoCarrera.map((carrera, idx) => (
                  <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-200">{carrera.carrera}</td>
                    <td className="px-4 py-3 text-right text-blue-300 font-bold text-xs">{formatoMoneda(carrera.inscripcion_real)}</td>
                    <td className="px-4 py-3 text-right text-purple-300 font-bold text-xs">{formatoMoneda(carrera.inscripcion_teorico)}</td>
                    <td className="px-4 py-3 text-right text-cyan-300 font-bold text-xs">{formatoMoneda(carrera.cuotas_real)}</td>
                    <td className="px-4 py-3 text-right text-purple-300 font-bold text-xs">{formatoMoneda(carrera.cuotas_teorico)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={\`px-2 py-1 rounded-lg font-bold text-xs \${getEfficiencyClass(carrera.porcentaje_cumplimiento)}\`}>
                        {carrera.porcentaje_cumplimiento.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}`;

// Insertar métodos de pago después de línea 628
lines.splice(629, 0, metodosPago);

// Recalcular índices después de la primera inserción
const nuevasLineas = lines.length;
const desgloseLineIdx = lines.findIndex(l => l.includes("case 'desglose':"));
const aldiaLineIdx = lines.findIndex((l, i) => i > desgloseLineIdx && l.includes("case 'aldia':"));

console.log(`Métodos de Pago insertados`);
console.log(`ALDIA ahora en línea: ${aldiaLineIdx + 1}`);

// Insertar Real vs Teórico antes del cierre )}  de desglose (antes de ALDIA)
let insertPos = aldiaLineIdx - 2;
while (insertPos > 0 && !lines[insertPos].includes(')}')) {
  insertPos--;
}

lines.splice(insertPos, 0, realVsTeoricoSection);

console.log(`Real vs Teórico insertado`);

fs.writeFileSync('src/renderer/modules/ReportesFinancierosModerno.tsx', lines.join('\n'), 'utf-8');
console.log('✅ INTEGRACIÓN COMPLETADA');
