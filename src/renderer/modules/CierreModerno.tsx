import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useGastos } from '@renderer/hooks/useGastos'
import { useCierre, type CierreDiario } from '@renderer/hooks/useCierre'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { useExcelExport } from '@renderer/hooks/useExcelExport'
import { Lock, AlertTriangle, CheckCircle2, DollarSign, TrendingUp, Download, X, RefreshCw, Calendar } from 'lucide-react'
import { ModalDetalleCierre } from '@renderer/components/ModalDetalleCierre'

type TabCierre = 'diario' | 'anual' | 'historial'

export const CierreModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { pagos, cargarPagos } = usePagos()
  const { estudiantes, cargarEstudiantes } = useEstudiantes()
  const { gastos } = useGastos()
  const { crearCierreDiario, obtenerUltimoCierreDiario, crearCierreAnual, obtenerCierres30Dias, loading } = useCierre()
  const { exportarReporte } = useExcelExport()

  const [cierreDiario, setCierreDiario] = useState<CierreDiario | null>(null)
  const [cierreHoy, setCierreHoy] = useState(false)
  const [mostrarModalCierreAnio, setMostrarModalCierreAnio] = useState(false)
  const [confirmacionCierreAnio1, setConfirmacionCierreAnio1] = useState('')
  const [confirmacionCierreAnio2, setConfirmacionCierreAnio2] = useState(false)
  const [confirmacionCierreAnio3, setConfirmacionCierreAnio3] = useState('')
  const [tabActiva, setTabActiva] = useState<TabCierre>('diario')
  const [cierres30Dias, setCierres30Dias] = useState<CierreDiario[]>([])
  const [cierreSeleccionado, setCierreSeleccionado] = useState<CierreDiario | null>(null)
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false)

  // Función para detectar si un pago está anulado
  const esAnulado = (pago: any): boolean => {
    return pago.estado === 'ANULADO'
  }

  const totalRecaudado = pagos.filter(p => !esAnulado(p)).reduce((sum, p) => sum + p.monto_pagado, 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const neto = totalRecaudado - totalGastos

  const cargarDatos = async () => {
    await cargarPagos(institucionActiva.id)
    await cargarEstudiantes(institucionActiva.id)
    const ultimoCierre = await obtenerUltimoCierreDiario(institucionActiva.id)
    setCierreDiario(ultimoCierre)
    
    if (ultimoCierre) {
      const hoy = new Date().toISOString().split('T')[0]
      setCierreHoy(ultimoCierre.fecha === hoy)
    }

    // Cargar historial de 30 días
    const cierresHistorial = await obtenerCierres30Dias(institucionActiva.id)
    setCierres30Dias(cierresHistorial)
  }

  useEffect(() => {
    cargarDatos()
  }, [institucionActiva.id])

  const handleCrearCierreDiario = async () => {
    const nuevosCierre = await crearCierreDiario(institucionActiva.id)
    if (nuevosCierre) {
      setCierreDiario(nuevosCierre)
      setCierreHoy(true)
      alert('Cierre diario creado exitosamente')
      await cargarDatos()
    }
  }

  const handleExportarCierreDiario = () => {
  if (!cierreDiario) return

  // Filtrar gastos del día actual
  const hoy = new Date().toISOString().split('T')[0]
  const gastosDia = gastos.filter(g => {
    const fechaGasto = new Date(g.fecha || new Date()).toISOString().split('T')[0]
    return fechaGasto === hoy && g.institucion_id === institucionActiva.id
  })

  // Agrupar gastos por categoría
  const gastosPorCategoria = gastosDia.reduce((acc, g) => {
    acc[g.categoria || 'Sin categoría'] = (acc[g.categoria || 'Sin categoría'] || 0) + g.monto
    return acc
  }, {} as Record<string, number>)

  // Datos a exportar
  const datos = [
    ['Fecha', formatoFecha(cierreDiario.fecha)],
    ['Hora', new Date(cierreDiario.creado_en).toLocaleTimeString('es-AR')],
    ['Institución', institucionActiva.nombre],
    [''],
    ['RESUMEN GENERAL'],
    ['Total Pagos del Día', cierreDiario.total_pagos],
    ['Cantidad de Pagos', cierreDiario.cantidad_pagos],
    ['Deudas Vencidas', cierreDiario.total_deudas_vencidas],
    ['Total Estudiantes', cierreDiario.total_estudiantes],
    ['Estudiantes en Mora', cierreDiario.estudiantes_en_mora],
    ['% Cobro del Día', `${cierreDiario.porcentaje_cobro}%`],
    [''],
    ['RECAUDACIÓN POR MÉTODO'],
    ...Object.entries(cierreDiario.resumen_por_metodo).map(([metodo, monto]) => [metodo, monto]),
    [''],
    ['GASTOS DEL DÍA'],
    ...Object.entries(gastosPorCategoria).map(([categoria, monto]) => [categoria, monto]),
    ['TOTAL GASTOS', totalGastos],
    [''],
    ['RESUMEN NETO'],
    ['Total Recaudado', totalRecaudado],
    ['(-) Total Gastos', totalGastos],
    ['= NETO DEL DÍA', neto],
  ]

  exportarReporte(
    {
      nombreArchivo: `Cierre_Diario_${cierreDiario.fecha}`,
      titulo: `Cierre Diario - ${formatoFecha(cierreDiario.fecha)}`,
      fechaReporte: new Date().toLocaleDateString('es-AR'),
    },
    [
      {
        nombre: 'Cierre Diario',
        encabezados: ['Concepto', 'Valor'],
        datos,
        esMoneda: [false, true],
      },
    ],
    institucionActiva.nombre
  )
}

  const handleExportarAnualCompleto = async () => {
    const { data: pagosAnio } = await supabase
      .from('pagos')
      .select('*')
      .eq('institucion_id', institucionActiva.id)

    const { data: pagosMultiplesAnio } = await supabase
      .from('pagos_multiples')
      .select('*, pagos_multiples_detalle(*)')
      .eq('institucion_id', institucionActiva.id)

    const { data: estudiantesAnio } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('institucion_id', institucionActiva.id)

    const { data: conceptosAnio } = await supabase
      .from('conceptos_pago')
      .select('*')
      .eq('institucion_id', institucionActiva.id)

    const { data: cierresAnio } = await supabase
      .from('cierres_diarios')
      .select('*')
      .eq('institucion_id', institucionActiva.id)

    const datosEstudiantes = (estudiantesAnio || []).map(e => [
      e.id,
      e.dni,
      e.nombre,
      e.apellido,
      e.estado,
      e.email,
      e.telefono,
    ])

    const datosConceptos = (conceptosAnio || []).map(c => [
      c.id,
      c.nombre,
      c.tipo,
      c.monto,
      c.mes || '',
      c.año,
      c.activo ? 'Sí' : 'No',
    ])

    const datosPagos = (pagosAnio || []).map(p => [
      p.id,
      p.estudiante_id,
      p.concepto_id,
      p.monto_pagado,
      p.metodo_pago,
      p.fecha_pago,
      p.numero_transaccion || '',
      p.notas || '',
    ])

    const datosPagosMultiples: any[] = []
    pagosMultiplesAnio?.forEach((pm: any) => {
      if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
        pm.pagos_multiples_detalle.forEach((detalle: any) => {
          datosPagosMultiples.push([
            pm.id,
            pm.estudiante_id,
            detalle.concepto_id,
            detalle.monto_pagado,
            pm.metodo_pago,
            pm.fecha_cobro,
            pm.numero_talonario || '',
            pm.estado || '',
          ])
        })
      }
    })

    const datosCierres = (cierresAnio || []).map(c => [
      c.fecha,
      c.cantidad_pagos,
      c.total_pagos,
      c.total_deudas_vencidas,
      c.estudiantes_en_mora,
      `${c.porcentaje_cobro}%`,
    ])

    exportarReporte(
      {
        nombreArchivo: `Backup_Completo_${new Date().getFullYear()}_${new Date().toISOString().split('T')[0]}`,
        titulo: `Backup Completo - ${new Date().getFullYear()}`,
        fechaReporte: new Date().toLocaleDateString('es-AR'),
      },
      [
        {
          nombre: 'Estudiantes',
          encabezados: ['ID', 'DNI', 'Nombre', 'Apellido', 'Estado', 'Email', 'Teléfono'],
          datos: datosEstudiantes,
          esMoneda: [false, false, false, false, false, false, false],
        },
        {
          nombre: 'Conceptos',
          encabezados: ['ID', 'Nombre', 'Tipo', 'Monto', 'Mes', 'Año', 'Activo'],
          datos: datosConceptos,
          esMoneda: [false, false, false, true, false, false, false],
        },
        {
          nombre: 'Pagos',
          encabezados: ['ID', 'Est. ID', 'Concepto ID', 'Monto', 'Método', 'Fecha', 'Transacción', 'Notas'],
          datos: datosPagos,
          esMoneda: [false, false, false, true, false, false, false, false],
        },
        {
          nombre: 'Pagos Múltiples',
          encabezados: ['Pago Múltiple ID', 'Est. ID', 'Concepto ID', 'Monto', 'Método', 'Fecha', 'Talonario', 'Estado'],
          datos: datosPagosMultiples,
          esMoneda: [false, false, false, true, false, false, false, false],
        },
        {
          nombre: 'Cierres Diarios',
          encabezados: ['Fecha', 'Cant. Pagos', 'Total Pagos', 'Deudas Vencidas', 'Est. en Mora', '% Cobro'],
          datos: datosCierres,
          esMoneda: [false, false, true, true, false, false],
        },
      ],
      institucionActiva.nombre
    )
  }

  const handleCierreAnio = async () => {
    if (confirmacionCierreAnio1 !== 'CERRAR AÑO') {
      alert('Debes escribir "CERRAR AÑO" para confirmar')
      return
    }
    if (!confirmacionCierreAnio2) {
      alert('Debes hacer clic en el checkbox')
      return
    }
    if (confirmacionCierreAnio3 !== 'CONFIRMAR CIERRE ANUAL') {
      alert('Debes escribir "CONFIRMAR CIERRE ANUAL"')
      return
    }

    await handleExportarAnualCompleto()

    const exitoso = await crearCierreAnual(institucionActiva.id)

    if (exitoso) {
      const { error: errorPagos } = await supabase
        .from('pagos')
        .delete()
        .eq('institucion_id', institucionActiva.id)

      const { error: errorPagosMultiples } = await supabase
        .from('pagos_multiples')
        .delete()
        .eq('institucion_id', institucionActiva.id)

      const { error: errorEst } = await supabase
        .from('estudiantes')
        .update({ estado: 'NO_VIENE_MAS' })
        .eq('institucion_id', institucionActiva.id)
        .eq('estado', 'NO_VIENE_MAS')

      if (errorPagos || errorPagosMultiples || errorEst) {
        alert('Error al resetear datos. Verifica manualmente.')
      } else {
        alert('✓ Cierre anual completado exitosamente. Los datos han sido respaldados y reseteados.')
        setMostrarModalCierreAnio(false)
        setConfirmacionCierreAnio1('')
        setConfirmacionCierreAnio2(false)
        setConfirmacionCierreAnio3('')
        await cargarDatos()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-lg shadow-amber-500/50">
              <Lock size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                Cierre de Período
              </h1>
              <p className="text-slate-400 mt-1">⚠️ Operación crítica - No se puede deshacer</p>
            </div>
          </div>
          <button
            onClick={cargarDatos}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-amber-400 transition-all duration-300"
          >
            <RefreshCw size={24} />
          </button>
        </div>
      </div>

      {/* ADVERTENCIA */}
      <div className="p-6 bg-red-500/20 border border-red-500/50 rounded-xl mb-12 flex gap-4">
        <AlertTriangle size={32} className="text-red-400 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-red-300 mb-2">⚠️ ADVERTENCIA IMPORTANTE</h3>
          <p className="text-sm text-red-200 leading-relaxed">
            El cierre de período es una operación <strong>irreversible</strong>. Una vez confirmado, no podrá deshacer esta acción. 
            Asegúrate de haber verificado todos los pagos y gastos antes de proceder.
          </p>
        </div>
      </div>

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 sm:mb-8 md:mb-12">
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-amber-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Recaudado</p>
          <p className="text-2xl font-black text-amber-400">{formatoMoneda(totalRecaudado)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-yellow-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Gastos</p>
          <p className="text-2xl font-black text-yellow-400">{formatoMoneda(totalGastos)}</p>
        </div>
        <div className={`p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-${neto >= 0 ? 'green' : 'red'}-500/50 transition-all`}>
          <p className="text-xs text-slate-400 font-bold mb-1">Neto</p>
          <p className={`text-2xl font-black ${neto >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatoMoneda(neto)}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setTabActiva('diario')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'diario'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={20} />
            Cierre Diario
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'historial'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={20} />
            Historial 30 Días
          </button>
          <button
            onClick={() => setTabActiva('anual')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'anual'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock size={20} />
            Cierre Anual
          </button>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="transition-all duration-500">
        {/* TAB: CIERRE DIARIO */}
        {tabActiva === 'diario' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Cierre Diario</h2>
                <button
                  onClick={handleCrearCierreDiario}
                  disabled={cierreHoy || loading}
                  className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition ${
                    cierreHoy
                      ? 'bg-green-600/50 text-green-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-lg'
                  }`}
                >
                  {cierreHoy ? (
                    <>
                      <CheckCircle2 size={20} />
                      Cierre Realizado
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Crear Cierre Diario
                    </>
                  )}
                </button>
              </div>

              {cierreDiario && (
                <div className="space-y-6">
                  {/* Indicadores */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                      <p className="text-xs text-blue-300 mb-1">Pagos</p>
                      <p className="text-xl font-black text-blue-400">{cierreDiario.cantidad_pagos}</p>
                    </div>
                    <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <p className="text-xs text-green-300 mb-1">Recaudación</p>
                      <p className="text-xl font-black text-green-400">{formatoMoneda(cierreDiario.total_pagos)}</p>
                    </div>
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-xs text-red-300 mb-1">Deudas</p>
                      <p className="text-xl font-black text-red-400">{formatoMoneda(cierreDiario.total_deudas_vencidas)}</p>
                    </div>
                    <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg">
                      <p className="text-xs text-purple-300 mb-1">Est. Activos</p>
                      <p className="text-xl font-black text-purple-400">{cierreDiario.total_estudiantes}</p>
                    </div>
                    <div className="p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                      <p className="text-xs text-orange-300 mb-1">En Mora</p>
                      <p className="text-xl font-black text-orange-400">{cierreDiario.estudiantes_en_mora}</p>
                    </div>
                    <div className="p-3 bg-indigo-500/20 border border-indigo-500/50 rounded-lg">
                      <p className="text-xs text-indigo-300 mb-1">% Cobro</p>
                      <p className="text-xl font-black text-indigo-400">{cierreDiario.porcentaje_cobro}%</p>
                    </div>
                  </div>

                  {/* Tabla métodos de pago */}
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="font-bold text-white mb-3">Recaudación por Método</h3>
                    <div className="space-y-2">
                      {Object.entries(cierreDiario.resumen_por_metodo).map(([metodo, monto]) => (
                        <div key={metodo} className="flex justify-between items-center p-3 bg-slate-700/50 rounded border border-slate-600/50 hover:bg-slate-700 transition">
                          <span className="font-medium text-slate-300">{metodo}</span>
                          <span className="font-bold text-green-400">{formatoMoneda(monto as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botón exportar */}
                  <button
                    onClick={handleExportarCierreDiario}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Download size={20} />
                    Exportar Cierre Diario a Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL 30 DÍAS */}
        {tabActiva === 'historial' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Historial de Cierres - Últimos 30 Días</h2>
                <button
                  onClick={cargarDatos}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition text-slate-400 hover:text-blue-400"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              {cierres30Dias.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-600 bg-slate-900/50">
                        <th className="px-4 py-4 text-left font-bold text-slate-400">📅 Fecha</th>
                        <th className="px-4 py-4 text-center font-bold text-slate-400">📊 Cantidad Pagos</th>
                        <th className="px-4 py-4 text-right font-bold text-slate-400">💰 Monto Total</th>
                        <th className="px-4 py-4 text-center font-bold text-slate-400">% Cobro</th>
                        <th className="px-4 py-4 text-center font-bold text-slate-400">Métodos</th>
                        <th className="px-4 py-4 text-center font-bold text-slate-400">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cierres30Dias.map((cierre) => {
                        const metodosCount = Object.keys(cierre.resumen_por_metodo).length
                        return (
                          <tr key={cierre.fecha} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition">
                            <td className="px-4 py-4 font-bold text-slate-300">{new Date(cierre.fecha).toLocaleDateString('es-AR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="px-4 py-4 text-center text-blue-400 font-bold">{cierre.cantidad_pagos}</td>
                            <td className="px-4 py-4 text-right text-green-400 font-bold">{formatoMoneda(cierre.total_pagos)}</td>
                            <td className="px-4 py-4 text-center">
                              <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                                cierre.porcentaje_cobro >= 100
                                  ? 'bg-green-500/30 text-green-300'
                                  : cierre.porcentaje_cobro >= 80
                                  ? 'bg-yellow-500/30 text-yellow-300'
                                  : 'bg-red-500/30 text-red-300'
                              }`}>
                                {cierre.porcentaje_cobro}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center text-purple-400 font-bold">{metodosCount} método{metodosCount !== 1 ? 's' : ''}</td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => {
                                  setCierreSeleccionado(cierre)
                                  setMostrarModalDetalle(true)
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-bold text-sm transition"
                              >
                                Ver Detalle
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar size={48} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No hay cierres en los últimos 30 días</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CIERRE ANUAL */}
        {tabActiva === 'anual' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-red-500/50 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Cierre de Año</h2>
                <button
                  onClick={() => setMostrarModalCierreAnio(true)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-lg font-bold flex items-center gap-2 transition shadow-lg"
                >
                  <Lock size={20} />
                  Iniciar Cierre de Año
                </button>
              </div>

              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg space-y-3">
                <p className="text-sm text-red-300 font-semibold">
                  El cierre de año:
                </p>
                <ul className="text-sm text-red-200 space-y-2 ml-4">
                  <li>✓ Exportará todos los datos a Excel como backup</li>
                  <li>✓ Eliminará todos los registros de pagos</li>
                  <li>✓ Reseteará el sistema para el siguiente año</li>
                  <li>⚠️ Esta acción NO puede deshacerse</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CIERRE ANUAL */}
      {mostrarModalCierreAnio && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle size={28} className="text-red-400" />
                <h3 className="text-xl font-bold text-red-300">Cierre de Año</h3>
              </div>
              <button
                onClick={() => {
                  setMostrarModalCierreAnio(false)
                  setConfirmacionCierreAnio1('')
                  setConfirmacionCierreAnio2(false)
                  setConfirmacionCierreAnio3('')
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              Debes confirmar 3 veces para completar el cierre de año. Esto es irreversible.
            </p>

            {/* Confirmación 1 */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Escribe "CERRAR AÑO" para continuar:
              </label>
              <input
                type="text"
                value={confirmacionCierreAnio1}
                onChange={(e) => setConfirmacionCierreAnio1(e.target.value)}
                placeholder="CERRAR AÑO"
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none transition"
              />
            </div>

            {/* Confirmación 2 */}
            {confirmacionCierreAnio1 === 'CERRAR AÑO' && (
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmacionCierreAnio2}
                    onChange={(e) => setConfirmacionCierreAnio2(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600/50 bg-slate-700/50 accent-red-500"
                  />
                  <span className="text-sm font-semibold text-slate-300">
                    Confirmo que entiendo que esto NO puede deshacerse
                  </span>
                </label>
              </div>
            )}

            {/* Confirmación 3 */}
            {confirmacionCierreAnio2 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Escribe "CONFIRMAR CIERRE ANUAL" para finalizar:
                </label>
                <input
                  type="text"
                  value={confirmacionCierreAnio3}
                  onChange={(e) => setConfirmacionCierreAnio3(e.target.value)}
                  placeholder="CONFIRMAR CIERRE ANUAL"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none transition"
                />
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalCierreAnio(false)
                  setConfirmacionCierreAnio1('')
                  setConfirmacionCierreAnio2(false)
                  setConfirmacionCierreAnio3('')
                }}
                className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCierreAnio}
                disabled={
                  confirmacionCierreAnio1 !== 'CERRAR AÑO' ||
                  !confirmacionCierreAnio2 ||
                  confirmacionCierreAnio3 !== 'CONFIRMAR CIERRE ANUAL'
                }
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white transition ${
                  confirmacionCierreAnio1 === 'CERRAR AÑO' &&
                  confirmacionCierreAnio2 &&
                  confirmacionCierreAnio3 === 'CONFIRMAR CIERRE ANUAL'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                    : 'bg-slate-600 cursor-not-allowed'
                }`}
              >
                Finalizar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE CIERRE */}
      {cierreSeleccionado && (
        <ModalDetalleCierre
          cierre={cierreSeleccionado}
          isOpen={mostrarModalDetalle}
          onClose={() => {
            setMostrarModalDetalle(false)
            setCierreSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}

export default CierreModerno

