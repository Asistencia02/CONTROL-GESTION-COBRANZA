import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
} from 'lucide-react'

interface KPIMetrica {
  label: string
  valor: number
  formato: 'moneda' | 'numero' | 'porcentaje'
  color: 'green' | 'blue' | 'red' | 'orange' | 'purple'
  icon: React.ReactNode
}

interface ResumenFinanciero {
  institucion_id: number
  institucion_nombre: string
  carrera_id: number
  carrera_nombre: string

  // Deuda
  deuda_vencida: number
  deuda_proximo_vencimiento: number

  // Recaudación
  recaudado_pagos: number
  recaudado_kiosco: number
  recaudado_insumos: number
  recaudado_total: number

  // Capacidad
  capacidad_teorica: number
  tasa_cobranza: number // porcentaje

  // Alumnos
  alumnos_totales: number
  alumnos_al_dia: number
  alumnos_vencidos: number
}

export const ReporteFinanciero: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenFinanciero[]>([])
  const [gastos, setGastos] = useState(0)
  const [mesActual] = useState(new Date().getMonth() + 1)
  const [diaActual] = useState(new Date().getDate())

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[FINANCIERO] ========== INICIANDO CARGA ==========')
      console.log(`[FINANCIERO] Mes actual: ${mesActual}, Día actual: ${diaActual}`)

      // 1. Definir rango de deuda vencida
      // Si día > 10: marzo a mes actual
      // Si día <= 10: marzo a mes anterior
      const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1
      console.log(`[FINANCIERO] Deuda vencida: marzo hasta mes ${mesVencimientoHasta}`)

      // 2. Obtener instituciones, carreras, config
      const { data: instituciones } = await supabase.from('instituciones').select('id, nombre')
      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const { data: configCarreras } = await supabase
        .from('configuracion_carreras')
        .select('institucion_id, carrera_id')

      const instMap = new Map(instituciones?.map(i => [i.id, i.nombre]) || [])
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      // 3. Obtener TODOS los pagos (paginado)
      let allPagos: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const from = page * 1000
        const to = from + 999

        const { data: pagosDetalle } = await supabase
          .from('pagos_multiples_detalle')
          .select('concepto_id, monto_pagado, dias_vencimiento, created_at')
          .range(from, to)

        if (!pagosDetalle || pagosDetalle.length === 0) {
          hasMore = false
        } else {
          allPagos = [...allPagos, ...pagosDetalle]
          page++
        }
      }

      console.log(`[FINANCIERO] Total pagos: ${allPagos.length}`)

      // 4. Obtener conceptos
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, institucion_id, carrera_id, monto, mes, año, dias_vencimiento')

      // 5. Obtener pagos_multiples con fecha
      const { data: pagosMult } = await supabase
        .from('pagos_multiples')
        .select('id, institucion_id, estudiante_id, fecha_cobro, estado')

      // 6. Obtener ventas kiosco e insumos (solo INSM = institucion 2)
      const { data: ventasKiosco } = await supabase
        .from('venta_kiosco')
        .select('monto, fecha')
        .eq('institucion_id', 2)

      const { data: ventasInsumos } = await supabase
        .from('ventas_insumos')
        .select('monto, fecha')
        .eq('institucion_id', 2)

      // 7. Obtener gastos
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto')
        .eq('mes', mesActual)

      const totalGastos = gastosData?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0
      setGastos(totalGastos)

      console.log(`[FINANCIERO] Gastos mes actual: ${formatoMoneda(totalGastos)}`)

      // 8. Obtener estudiantes para contar
      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, institucion_id, carrera_id')

      // 9. Crear mapa de pagos
      const pagosMap = new Map<number, number>() // concepto_id -> monto_pagado
      const fechaPagosMap = new Map<number, Date>() // concepto_id -> fecha_pago

      allPagos.forEach((p: any) => {
        pagosMap.set(p.concepto_id, (pagosMap.get(p.concepto_id) || 0) + (p.monto_pagado || 0))
        if (p.created_at) {
          fechaPagosMap.set(p.concepto_id, new Date(p.created_at))
        }
      })

      // 10. Calcular resumen por institución-carrera
      const resumenMap = new Map<string, ResumenFinanciero>()

      configCarreras?.forEach((config: any) => {
        const key = `${config.institucion_id}-${config.carrera_id}`
        const instNombre = instMap.get(config.institucion_id) || `Inst ${config.institucion_id}`
        const carrNombre = carrMap.get(config.carrera_id) || `Carrera ${config.carrera_id}`

        resumenMap.set(key, {
          institucion_id: config.institucion_id,
          institucion_nombre: instNombre,
          carrera_id: config.carrera_id,
          carrera_nombre: carrNombre,
          deuda_vencida: 0,
          deuda_proximo_vencimiento: 0,
          recaudado_pagos: 0,
          recaudado_kiosco: 0,
          recaudado_insumos: 0,
          recaudado_total: 0,
          capacidad_teorica: 0,
          tasa_cobranza: 0,
          alumnos_totales: 0,
          alumnos_al_dia: 0,
          alumnos_vencidos: 0,
        })
      })

      // 11. Procesar conceptos
      conceptos?.forEach((concepto: any) => {
        const key = `${concepto.institucion_id}-${concepto.carrera_id}`
        const item = resumenMap.get(key)
        if (!item) return

        // Contar alumnos únicos
        const alumnosCarrera = estudiantes?.filter(
          e =>
            e.institucion_id === concepto.institucion_id &&
            e.carrera_id === concepto.carrera_id
        ) || []
        item.alumnos_totales = new Set(alumnosCarrera.map(a => a.id)).size

        // Capacidad teórica: monto * alumnos
        item.capacidad_teorica += concepto.monto * item.alumnos_totales

        // Deuda vencida: marzo a mes vencimiento (si día > 10)
        if (concepto.mes >= 3 && concepto.mes <= mesVencimientoHasta) {
          const montoPendiente = concepto.monto - (pagosMap.get(concepto.id) || 0)
          if (montoPendiente > 0) {
            item.deuda_vencida += montoPendiente
          }
        }

        // Deuda próximo vencimiento
        if (concepto.mes === mesVencimientoHasta + 1) {
          const montoPendiente = concepto.monto - (pagosMap.get(concepto.id) || 0)
          if (montoPendiente > 0) {
            item.deuda_proximo_vencimiento += montoPendiente
          }
        }

        // Recaudado
        const monto_pagado = pagosMap.get(concepto.id) || 0
        item.recaudado_pagos += monto_pagado
      })

      // 12. Agregar ventas kiosco e insumos (solo INSM)
      const ventasKioscoTotal = ventasKiosco?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0
      const ventasInsumosTotal = ventasInsumos?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0

      const keyMilagros = '2-4' // Institución 2, primer concepto aproximado
      const itemMilagros = Array.from(resumenMap.values()).find(
        r => r.institucion_id === 2
      )
      if (itemMilagros) {
        itemMilagros.recaudado_kiosco = ventasKioscoTotal
        itemMilagros.recaudado_insumos = ventasInsumosTotal
      }

      // 13. Calcular totales y porcentajes
      resumenMap.forEach(item => {
        item.recaudado_total =
          item.recaudado_pagos + item.recaudado_kiosco + item.recaudado_insumos
        item.tasa_cobranza =
          item.capacidad_teorica > 0
            ? (item.recaudado_pagos / item.capacidad_teorica) * 100
            : 0

        // Alumnos al día: estimado simple (TODO: refinar con lógica de pagos por estudiante)
        item.alumnos_al_dia = Math.round(
          item.alumnos_totales * (item.tasa_cobranza / 100)
        )
        item.alumnos_vencidos = item.alumnos_totales - item.alumnos_al_dia
      })

      const resumenArray = Array.from(resumenMap.values()).sort(
        (a, b) => b.recaudado_total - a.recaudado_total
      )

      setResumen(resumenArray)

      console.log(`[FINANCIERO] ✅ Resumen financiero cargado: ${resumenArray.length} carreras`)
    } catch (err) {
      console.error('[FINANCIERO] ERROR:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <BarChart3 size={48} className="text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-md">
          <p className="text-red-400 font-bold mb-2">Error</p>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={cargarDatos}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Calcular totales globales
  const totalRecaudado = resumen.reduce((sum, r) => sum + r.recaudado_total, 0)
  const totalCapacidad = resumen.reduce((sum, r) => sum + r.capacidad_teorica, 0)
  const totalDeuda = resumen.reduce((sum, r) => sum + r.deuda_vencida, 0)
  const totalAlumnos = resumen.reduce((sum, r) => sum + r.alumnos_totales, 0)
  const totalAlDia = resumen.reduce((sum, r) => sum + r.alumnos_al_dia, 0)
  const netFinanciero = totalRecaudado - gastos

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-1">
            💼 REPORTE FINANCIERO EJECUTIVO
          </h1>
          <p className="text-slate-400 text-sm">
            Análisis de recaudación, deuda y capacidad | Mes{' '}
            {['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][
              mesActual
            ]}
          </p>
        </div>
        <button onClick={cargarDatos} className="p-2 hover:bg-slate-700/50 rounded-lg">
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* KPIs GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Recaudado */}
        <div className="bg-gradient-to-br from-green-900 to-green-800 border border-green-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-semibold mb-1">💰 RECAUDADO NETO</p>
              <p className="text-2xl font-black text-green-300">{formatoMoneda(netFinanciero)}</p>
              <p className="text-xs text-green-400 mt-1">
                {((netFinanciero / totalCapacidad) * 100).toFixed(1)}% de capacidad
              </p>
            </div>
            <DollarSign size={32} className="text-green-400 opacity-30" />
          </div>
        </div>

        {/* Deuda Vencida */}
        <div className="bg-gradient-to-br from-red-900 to-red-800 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-200 text-xs font-semibold mb-1">⚠️ DEUDA VENCIDA</p>
              <p className="text-2xl font-black text-red-300">{formatoMoneda(totalDeuda)}</p>
              <p className="text-xs text-red-400 mt-1">
                {((totalDeuda / totalCapacidad) * 100).toFixed(1)}% del esperado
              </p>
            </div>
            <AlertCircle size={32} className="text-red-400 opacity-30" />
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-gradient-to-br from-orange-900 to-orange-800 border border-orange-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-xs font-semibold mb-1">📉 GASTOS MES</p>
              <p className="text-2xl font-black text-orange-300">{formatoMoneda(gastos)}</p>
              <p className="text-xs text-orange-400 mt-1">
                {((gastos / totalRecaudado) * 100).toFixed(1)}% de recaudación
              </p>
            </div>
            <TrendingUp size={32} className="text-orange-400 opacity-30" />
          </div>
        </div>

        {/* Capacidad Teórica */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-semibold mb-1">📊 CAP. TEÓRICA</p>
              <p className="text-2xl font-black text-blue-300">{formatoMoneda(totalCapacidad)}</p>
              <p className="text-xs text-blue-400 mt-1">{totalAlumnos} alumnos</p>
            </div>
            <BarChart3 size={32} className="text-blue-400 opacity-30" />
          </div>
        </div>

        {/* Alumnos al día */}
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 border border-purple-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-xs font-semibold mb-1">✅ AL DÍA</p>
              <p className="text-2xl font-black text-purple-300">
                {totalAlDia} / {totalAlumnos}
              </p>
              <p className="text-xs text-purple-400 mt-1">
                {((totalAlDia / totalAlumnos) * 100).toFixed(1)}% cobranza
              </p>
            </div>
            <Users size={32} className="text-purple-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* DETALLE POR INSTITUCIÓN-CARRERA */}
      <div className="space-y-6">
        {resumen.map((item, idx) => (
          <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
              <div>
                <h2 className="text-xl font-black text-slate-100">{item.institucion_nombre}</h2>
                <p className="text-sm text-slate-400 mt-1">📚 {item.carrera_nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs mb-1">Recaudación Neta</p>
                <p className="text-2xl font-black text-green-400">
                  {formatoMoneda(
                    item.recaudado_total - (item.institucion_id === 2 ? gastos / 3 : 0)
                  )}
                </p>
              </div>
            </div>

            {/* GRID DE MÉTRICAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Recaudación */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Recaudado</p>
                <p className="text-lg font-bold text-green-400">
                  {formatoMoneda(item.recaudado_total)}
                </p>
                {item.recaudado_kiosco + item.recaudado_insumos > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    (Pagos: {formatoMoneda(item.recaudado_pagos)})
                  </p>
                )}
              </div>

              {/* Deuda Vencida */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Deuda Vencida</p>
                <p className="text-lg font-bold text-red-400">{formatoMoneda(item.deuda_vencida)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {((item.deuda_vencida / item.capacidad_teorica) * 100).toFixed(1)}%
                </p>
              </div>

              {/* Próximo Vencimiento */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Próx. Vencimiento</p>
                <p className="text-lg font-bold text-orange-400">
                  {formatoMoneda(item.deuda_proximo_vencimiento)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Mes siguiente</p>
              </div>

              {/* Capacidad */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Capacidad Teórica</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatoMoneda(item.capacidad_teorica)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {item.tasa_cobranza.toFixed(1)}% logrado
                </p>
              </div>

              {/* Alumnos al día */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Alumnos al Día</p>
                <p className="text-lg font-bold text-purple-400">
                  {item.alumnos_al_dia} / {item.alumnos_totales}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {((item.alumnos_al_dia / item.alumnos_totales) * 100).toFixed(1)}%
                </p>
              </div>

              {/* Alumnos vencidos */}
              <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                <p className="text-xs text-slate-400 mb-1">Alumnos Vencidos</p>
                <p className="text-lg font-bold text-red-400">{item.alumnos_vencidos}</p>
                <p className="text-xs text-slate-400 mt-1">Requieren seguimiento</p>
              </div>

              {/* Kiosco (si INSM) */}
              {item.institucion_id === 2 && item.recaudado_kiosco > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Venta Kiosco</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {formatoMoneda(item.recaudado_kiosco)}
                  </p>
                </div>
              )}

              {/* Insumos (si INSM) */}
              {item.institucion_id === 2 && item.recaudado_insumos > 0 && (
                <div className="bg-slate-900/50 border border-slate-700/30 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Venta Insumos</p>
                  <p className="text-lg font-bold text-cyan-400">
                    {formatoMoneda(item.recaudado_insumos)}
                  </p>
                </div>
              )}
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="mt-4">
              <div className="flex justify-between mb-2">
                <p className="text-xs text-slate-400">Avance de Recaudación</p>
                <p className="text-xs font-bold text-slate-300">
                  {item.tasa_cobranza.toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(item.tasa_cobranza, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700/30 rounded-lg text-center text-xs text-slate-400">
        <p>
          Última actualización: {new Date().toLocaleString()} | Deuda vencida: Marzo hasta mes
          {diaActual > 10 ? ' actual' : ' anterior'}
        </p>
      </div>
    </div>
  )
}

export default ReporteFinanciero
