import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useCierre, type CierreDiario } from '@renderer/hooks/useCierre'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { useExcelExport } from '@renderer/hooks/useExcelExport'
import { Calendar, Download, AlertTriangle, CheckCircle2, Lock, X } from 'lucide-react'

export const Cierre: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { pagos, cargarPagos } = usePagos()
  const { estudiantes, cargarEstudiantes } = useEstudiantes()
  const { crearCierreDiario, obtenerUltimoCierreDiario, crearCierreAnual, loading } = useCierre()
  const { exportarReporte } = useExcelExport()

  const [cierreDiario, setCierreDiario] = useState<CierreDiario | null>(null)
  const [cierreHoy, setCierreHoy] = useState(false)
  const [mostrarModalCierreAnio, setMostrarModalCierreAnio] = useState(false)
  const [confirmacionCierreAnio1, setConfirmacionCierreAnio1] = useState('')
  const [confirmacionCierreAnio2, setConfirmacionCierreAnio2] = useState(false)
  const [confirmacionCierreAnio3, setConfirmacionCierreAnio3] = useState('')

  useEffect(() => {
    const cargarDatos = async () => {
      await cargarPagos(institucionActiva.id)
      await cargarEstudiantes(institucionActiva.id)
      const ultimoCierre = await obtenerUltimoCierreDiario(institucionActiva.id)
      setCierreDiario(ultimoCierre)
      
      // Verificar si ya existe cierre de hoy
      if (ultimoCierre) {
        const hoy = new Date().toISOString().split('T')[0]
        setCierreHoy(ultimoCierre.fecha === hoy)
      }
    }
    cargarDatos()
  }, [institucionActiva.id])

  const handleCrearCierreDiario = async () => {
    const nuevosCierre = await crearCierreDiario(institucionActiva.id)
    if (nuevosCierre) {
      setCierreDiario(nuevosCierre)
      setCierreHoy(true)
      alert('Cierre diario creado exitosamente')
    }
  }

  const handleExportarCierreDiario = () => {
    if (!cierreDiario) return

    const datos = [
      ['Fecha', formatoFecha(cierreDiario.fecha)],
      ['Hora', new Date(cierreDiario.creado_en).toLocaleTimeString('es-AR')],
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
    // Exportar TODOS los datos del año
    const { data: pagosAnio } = await supabase
      .from('pagos')
      .select('*')
      .eq('institucion_id', institucionActiva.id)

    // Exportar pagos múltiples también
    const { data: pagosMultiplesAnio } = await supabase
      .from('pagos_multiples')
      .select(`
        *,
        pagos_multiples_detalle(*)
      `)
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

    // Preparar datos para Excel
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

    // Preparar datos de pagos múltiples
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

    // Exportar datos completos
    await handleExportarAnualCompleto()

    // Crear cierre anual
    const exitoso = await crearCierreAnual(institucionActiva.id)

    if (exitoso) {
      // Eliminar pagos de tabla PAGOS
      const { error: errorPagos } = await supabase
        .from('pagos')
        .delete()
        .eq('institucion_id', institucionActiva.id)

      // Eliminar pagos de tabla PAGOS_MULTIPLES
      const { error: errorPagosMultiples } = await supabase
        .from('pagos_multiples')
        .delete()
        .eq('institucion_id', institucionActiva.id)

      // Desactivar estudiantes que dieron de baja
      const { error: errorEst } = await supabase
        .from('estudiantes')
        .update({ estado: 'NO_VIENE_MAS' })
        .eq('institucion_id', institucionActiva.id)
        .eq('estado', 'NO_VIENE_MAS')

      if (errorPagos || errorPagosMultiples || errorEst) {
        alert('Error al resetear datos. Verifica manualmente.')
        console.error('Errores al resetear:', { errorPagos, errorPagosMultiples, errorEst })
      } else {
        alert('✓ Cierre anual completado exitosamente. Los datos han sido respaldados y reseteados (incluyendo pagos múltiples).')
        setMostrarModalCierreAnio(false)
        setConfirmacionCierreAnio1('')
        setConfirmacionCierreAnio2(false)
        setConfirmacionCierreAnio3('')
      }
    } else {
      alert('Error al crear cierre anual')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Cierre de Caja</h1>
      <p className="text-gray-600 mb-8">{institucionActiva.nombre}</p>

      {/* CIERRE DIARIO */}
      <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar size={32} className="text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Cierre Diario</h2>
              <p className="text-sm text-gray-600">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <button
            onClick={handleCrearCierreDiario}
            disabled={cierreHoy || loading}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
              cierreHoy
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {cierreHoy ? (
              <>
                <CheckCircle2 size={20} />
                Cierre Realizado
              </>
            ) : (
              'Crear Cierre Diario'
            )}
          </button>
        </div>

        {cierreDiario && (
          <div className="space-y-6">
            {/* INDICADORES */}
            <div className="grid grid-cols-6 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Pagos Registrados</p>
                <p className="text-2xl font-bold text-blue-900">{cierreDiario.cantidad_pagos}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 mb-1">Recaudación</p>
                <p className="text-2xl font-bold text-green-900">{formatoMoneda(cierreDiario.total_pagos)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-xs text-red-600 mb-1">Deudas Vencidas</p>
                <p className="text-2xl font-bold text-red-900">{formatoMoneda(cierreDiario.total_deudas_vencidas)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 mb-1">Estudiantes Activos</p>
                <p className="text-2xl font-bold text-purple-900">{cierreDiario.total_estudiantes}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 mb-1">En Mora</p>
                <p className="text-2xl font-bold text-orange-900">{cierreDiario.estudiantes_en_mora}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-xs text-indigo-600 mb-1">% Cobro Hoy</p>
                <p className="text-2xl font-bold text-indigo-900">{cierreDiario.porcentaje_cobro}%</p>
              </div>
            </div>

            {/* TABLA MÉTODOS DE PAGO */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3">Recaudación por Método</h3>
              <div className="space-y-2">
                {Object.entries(cierreDiario.resumen_por_metodo).map(([metodo, monto]) => (
                  <div key={metodo} className="flex justify-between items-center p-3 bg-white rounded border border-gray-200">
                    <span className="font-medium text-gray-700">{metodo}</span>
                    <span className="font-bold text-green-700">{formatoMoneda(monto as number)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÓN EXPORTAR */}
            <button
              onClick={handleExportarCierreDiario}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Exportar Cierre Diario a Excel
            </button>
          </div>
        )}
      </div>

      {/* CIERRE DE AÑO */}
      <div className="bg-white rounded-lg border border-red-300 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Lock size={32} className="text-red-600" />
            <div>
              <h2 className="text-2xl font-bold text-red-800">Cierre de Año</h2>
              <p className="text-sm text-red-600">⚠️ Esta acción reseteará todos los datos del año actual</p>
            </div>
          </div>
          <button
            onClick={() => setMostrarModalCierreAnio(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <Lock size={20} />
            Iniciar Cierre de Año
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Advertencia:</strong> El cierre de año:
          </p>
          <ul className="text-sm text-red-700 mt-2 ml-4 space-y-1">
            <li>✓ Exportará todos los datos a Excel como backup</li>
            <li>✓ Eliminará todos los registros de pagos</li>
            <li>✓ Reseteará el sistema para el siguiente año</li>
            <li>⚠️ Esta acción NO puede deshacerse</li>
          </ul>
        </div>
      </div>

      {/* MODAL CIERRE DE AÑO */}
      {mostrarModalCierreAnio && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle size={28} className="text-red-600" />
                <h3 className="text-xl font-bold text-red-800">Cierre de Año</h3>
              </div>
              <button
                onClick={() => {
                  setMostrarModalCierreAnio(false)
                  setConfirmacionCierreAnio1('')
                  setConfirmacionCierreAnio2(false)
                  setConfirmacionCierreAnio3('')
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Debes confirmar 3 veces para completar el cierre de año. Esto es irreversible.
            </p>

            {/* Confirmación 1 */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Escribe "CERRAR AÑO" para continuar:
              </label>
              <input
                type="text"
                value={confirmacionCierreAnio1}
                onChange={(e) => setConfirmacionCierreAnio1(e.target.value)}
                placeholder="CERRAR AÑO"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Confirmo que entiendo que esto NO puede deshacerse
                  </span>
                </label>
              </div>
            )}

            {/* Confirmación 3 */}
            {confirmacionCierreAnio2 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Escribe "CONFIRMAR CIERRE ANUAL" para finalizar:
                </label>
                <input
                  type="text"
                  value={confirmacionCierreAnio3}
                  onChange={(e) => setConfirmacionCierreAnio3(e.target.value)}
                  placeholder="CONFIRMAR CIERRE ANUAL"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
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
                className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white ${
                  confirmacionCierreAnio1 === 'CERRAR AÑO' &&
                  confirmacionCierreAnio2 &&
                  confirmacionCierreAnio3 === 'CONFIRMAR CIERRE ANUAL'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Finalizar Cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
