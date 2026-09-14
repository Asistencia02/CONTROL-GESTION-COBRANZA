# GUÍA EXACTA DE INTEGRACIÓN - INGRESOS POR MÉTODO Y REAL VS TEÓRICO

## 📍 UBICACIÓN 1: TAB "COMPARATIVA" - AGREGAR SECCIÓN DE MÉTODOS DE PAGO

**DÓNDE:** Línea 622 (después de `</div>` que cierra "Desglose de Ingresos")

**BUSCA ESTA LÍNEA:**
```
                  </div>
                </div>
              ) : institucionActiva.id === 1 ? (
```

**JUSTO ANTES de esa línea (después del `</div>` anterior), AGREGA ESTO:**

```jsx
                  {/* NUEVA SECCIÓN: INGRESOS POR MÉTODO DE PAGO */}
                  <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
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
                  </div>
```

---

## 📍 UBICACIÓN 2: TAB "DESGLOSE" - AGREGAR SECCIÓN REAL VS TEÓRICO

**DÓNDE:** Línea 695 (después del cierre de `map` de desgloseConceptos y antes del `)}`)

**BUSCA ESTA LÍNEA:**
```
          ))}
        </div>
      )}
    </div>
  )
```

**JUSTO ANTES de `)}` (el que cierra el map de conceptos), AGREGA ESTO:**

```jsx
          ))}
        </div>

        {/* NUEVA SECCIÓN: REAL VS TEÓRICO POR CARRERA */}
        {realVsTeoricoCarrera && realVsTeoricoCarrera.length > 0 && (
          <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-x-auto">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-teal-400" />Real vs Teórico por Carrera</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-700 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
                  <th className="px-4 py-3 text-left font-bold text-white">📚 Carrera</th>
                  <th className="px-4 py-3 text-right font-bold text-blue-400">💎 Inscripción Real</th>
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
                      <span className={`px-2 py-1 rounded-lg font-bold text-xs ${getEfficiencyClass(carrera.porcentaje_cumplimiento)}`}>
                        {carrera.porcentaje_cumplimiento.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      )}
```

---

## ✅ RESUMEN DE CAMBIOS

1. **TAB "COMPARATIVA"** → Agrega tabla de INGRESOS POR MÉTODO DE PAGO con emojis y porcentajes
2. **TAB "DESGLOSE"** → Agrega tabla de REAL VS TEÓRICO POR CARRERA con comparativa de montos

## 🔧 IMPORTS YA ESTÁN LISTOS
- `useReportesAvanzados` ✅ (línea 5)
- `const { ingresosPorMetodo, realVsTeoricoCarrera }` ✅ (línea 37)
- `DollarSign` icon ✅ (ya importado)
- `TrendingUp` icon ✅ (ya importado)

## 🚀 PRÓXIMOS PASOS
1. Copiar las 2 secciones exactas arriba
2. Insertar en las ubicaciones indicadas
3. Guardar y compilar: `npm run build`
4. Commit: `git add -A && git commit -m "feat: agregar tablas de métodos de pago y Real vs Teórico"`
5. Push: `git push`
