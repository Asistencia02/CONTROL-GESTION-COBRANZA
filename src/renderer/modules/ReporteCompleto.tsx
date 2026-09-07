import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, RefreshCw, DollarSign } from 'lucide-react'

interface ConceptoPago {
  id: number
  institucion_id: number
  institucion_nombre: string
  carrera_id: number
  carrera_nombre: string
  tipo: string
  mes: number | null
  monto: number
  monto_pagado: number
  cantidad_pagos: number
}

interface ResumenCarrera {
  carrera_id: number
  carrera_nombre: string
  monto_total: number
  cantidad_conceptos: number
}

interface ResumenInstitucion {
  institucion_id: number
  institucion_nombre: string
  monto_total: number
  carreras: ResumenCarrera[]
}

export const ReporteCompleto: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conceptos, setConceptos] = useState<ConceptoPago[]>([])
  const [resumen, setResumen] = useState<ResumenInstitucion[]>([])
  const [totalGlobal, setTotalGlobal] = useState(0)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[REPORTE] ========== INICIANDO CARGA ==========')

      // Paso 1: Obtener TODAS las instituciones y carreras
      const { data: instituciones } = await supabase.from('instituciones').select('id, nombre')
      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const { data: configCarreras } = await supabase.from('configuracion_carreras').select('institucion_id, carrera_id')

      const instMap = new Map(instituciones?.map(i => [i.id, i.nombre]) || [])
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      console.log(`[REPORTE] ${instMap.size} instituciones, ${carrMap.size} carreras`)

      // Paso 2: Obtener TODOS los pagos multiples detalle (paginado)
      let allPagos: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const from = page * 1000
        const to = from + 999

        const { data: pagosDetalle, error: errPagos } = await supabase
          .from('pagos_multiples_detalle')
          .select('id, monto_pagado, concepto_id')
          .range(from, to)

        if (errPagos) throw errPagos
        if (!pagosDetalle || pagosDetalle.length === 0) {
          hasMore = false
        } else {
          allPagos = [...allPagos, ...pagosDetalle]
          console.log(`[REPORTE] Página ${page}: cargados ${pagosDetalle.length} pagos (total acumulado: ${allPagos.length})`)
          page++
        }
      }

      console.log(`[REPORTE] ${allPagos.length} registros de pago cargados (TOTAL paginado)`)
      const pagosDetalle = allPagos

      // Paso 3: Obtener TODOS los conceptos
      const { data: conceptosData, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, institucion_id, carrera_id, tipo, mes, monto')

      if (errConc) throw errConc
      if (!conceptosData) throw new Error('No se pudieron cargar conceptos')

      console.log(`[REPORTE] ${conceptosData.length} conceptos cargados TOTALES`)

      // DEBUG DETALLADO: mostrar conceptos por institución-carrera
      const conceptosPorInstCarrera = new Map<string, number[]>()
      conceptosData.forEach((c: any) => {
        const key = `inst${c.institucion_id}-carr${c.carrera_id}`
        if (!conceptosPorInstCarrera.has(key)) {
          conceptosPorInstCarrera.set(key, [])
        }
        conceptosPorInstCarrera.get(key)!.push(c.id)
      })

      console.log('[REPORTE] 🔍 CONCEPTOS DETALLADOS POR INSTITUCIÓN-CARRERA:')
      conceptosPorInstCarrera.forEach((ids, key) => {
        console.log(`  ${key}: IDs ${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '...' : ''} (total: ${ids.length})`)
      })

      // Paso 4: Crear mapa de pagos por concepto
      const pagosMap = new Map<number, { monto: number; cantidad: number }>()

      pagosDetalle.forEach((pago: any) => {
        if (!pagosMap.has(pago.concepto_id)) {
          pagosMap.set(pago.concepto_id, { monto: 0, cantidad: 0 })
        }
        const item = pagosMap.get(pago.concepto_id)!
        item.monto += pago.monto_pagado
        item.cantidad++
      })

      console.log('[REPORTE] 📊 Conceptos únicos con pagos:', pagosMap.size)
      console.log('[REPORTE] 🔍 Primeros 10 concepto_ids con pagos:', Array.from(pagosMap.keys()).slice(0, 10))
      console.log('[REPORTE] 🔍 Últimos 10 concepto_ids con pagos:', Array.from(pagosMap.keys()).slice(-10))

      // DEBUG: verificar si los concepto_ids 523-564 están en pagosMap
      const idsVerificar = [523, 524, 525, 534, 544, 555, 564]
      const idsEnMapa = idsVerificar.filter(id => pagosMap.has(id))
      console.log('[REPORTE] 🔍 IDs 523-564 en pagosMap:', idsEnMapa.length, '/', idsVerificar.length)

      // Debug: contar cuántos pagos corresponden a cada carrera
      const pagosConceptos = new Map<number, number>()
      conceptosData.forEach((c: any) => {
        const pagos = pagosMap.get(c.id)
        if (pagos && pagos.cantidad > 0) {
          pagosConceptos.set(c.carrera_id, (pagosConceptos.get(c.carrera_id) || 0) + pagos.cantidad)
        }
      })
      console.log('[REPORTE] 💰 Pagos por carrera (desde conceptos):', Object.fromEntries(pagosConceptos))

      // Paso 5: Procesar conceptos y crear array de reportes
      const conceptosArray: ConceptoPago[] = conceptosData.map((concepto: any) => {
        const pagos = pagosMap.get(concepto.id) || { monto: 0, cantidad: 0 }
        return {
          id: concepto.id,
          institucion_id: concepto.institucion_id,
          institucion_nombre: instMap.get(concepto.institucion_id) || `Institución ${concepto.institucion_id}`,
          carrera_id: concepto.carrera_id,
          carrera_nombre: carrMap.get(concepto.carrera_id) || `Carrera ${concepto.carrera_id}`,
          tipo: concepto.tipo,
          mes: concepto.mes,
          monto: concepto.monto || 0,
          monto_pagado: pagos.monto,
          cantidad_pagos: pagos.cantidad,
        }
      })

      setConceptos(conceptosArray)
      console.log(`[REPORTE] ${conceptosArray.length} conceptos procesados`)

      // Paso 6: Crear resumen por institución y carrera - INCLUYENDO TODAS LAS CARRERAS
      const institucionesMap = new Map<number, ResumenInstitucion>()

      // Primero: crear entrada para cada institución-carrera
      configCarreras?.forEach((config: any) => {
        const instId = config.institucion_id
        const carrId = config.carrera_id

        if (!institucionesMap.has(instId)) {
          institucionesMap.set(instId, {
            institucion_id: instId,
            institucion_nombre: instMap.get(instId) || `Institución ${instId}`,
            monto_total: 0,
            carreras: [],
          })
        }

        const inst = institucionesMap.get(instId)!
        if (!inst.carreras.find(c => c.carrera_id === carrId)) {
          inst.carreras.push({
            carrera_id: carrId,
            carrera_nombre: carrMap.get(carrId) || `Carrera ${carrId}`,
            monto_total: 0,
            cantidad_conceptos: 0,
          })
        }
      })

      // Segundo: agregar pagos a las carreras
      conceptosArray.forEach(concepto => {
        if (concepto.monto_pagado === 0) return // Solo procesar conceptos con pagos

        const instId = concepto.institucion_id

        if (!institucionesMap.has(instId)) {
          institucionesMap.set(instId, {
            institucion_id: instId,
            institucion_nombre: concepto.institucion_nombre,
            monto_total: 0,
            carreras: [],
          })
        }

        const inst = institucionesMap.get(instId)!
        inst.monto_total += concepto.monto_pagado

        let carrera = inst.carreras.find(c => c.carrera_id === concepto.carrera_id)
        if (!carrera) {
          carrera = {
            carrera_id: concepto.carrera_id,
            carrera_nombre: concepto.carrera_nombre,
            monto_total: 0,
            cantidad_conceptos: 0,
          }
          inst.carreras.push(carrera)
        }

        carrera.monto_total += concepto.monto_pagado
        carrera.cantidad_conceptos++
      })

      const institucionesArray = Array.from(institucionesMap.values()).sort(
        (a, b) => b.monto_total - a.monto_total
      )

      // Ordenar carreras dentro de cada institución
      institucionesArray.forEach(inst => {
        inst.carreras.sort((a, b) => b.monto_total - a.monto_total)
      })

      setResumen(institucionesArray)

      const total = conceptosArray.reduce((sum, c) => sum + c.monto_pagado, 0)
      setTotalGlobal(total)

      console.log(`[REPORTE] ✅ Total recaudado: ${formatoMoneda(total)}`)
    } catch (err) {
      console.error('[REPORTE] ERROR:', err)
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
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-sm text-center">
          <p className="text-red-400 font-bold mb-2">Error</p>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button
            onClick={cargarDatos}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-1">
            📊 REPORTE COMPLETO
          </h1>
          <p className="text-slate-400 text-sm">Conceptos pagados por institución y carrera</p>
        </div>
        <button onClick={cargarDatos} className="p-2 hover:bg-slate-700/50 rounded-lg">
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* TOTAL GLOBAL */}
      <div className="bg-gradient-to-r from-green-900 to-green-800 border border-green-700 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm font-semibold mb-1">💰 TOTAL RECAUDADO GLOBAL</p>
            <p className="text-4xl font-black text-green-300">{formatoMoneda(totalGlobal)}</p>
          </div>
          <DollarSign size={48} className="text-green-400 opacity-20" />
        </div>
      </div>

      {/* INSTITUCIONES */}
      <div className="space-y-6">
        {resumen.map(institucion => (
          <div key={institucion.institucion_id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            {/* HEADER INSTITUCIÓN */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
              <div>
                <h2 className="text-2xl font-black text-slate-100">{institucion.institucion_nombre}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs mb-1">Recaudado</p>
                <p className="text-2xl font-black text-green-400">{formatoMoneda(institucion.monto_total)}</p>
              </div>
            </div>

            {/* CARRERAS */}
            <div className="space-y-4">
              {institucion.carreras.map(carrera => (
                <div key={carrera.carrera_id} className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-200">{carrera.carrera_nombre}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {carrera.cantidad_conceptos > 0
                          ? `${carrera.cantidad_conceptos} conceptos pagados`
                          : 'Sin pagos registrados'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400 mb-1">Recaudado</p>
                      <p className="text-xl font-black text-green-300">{formatoMoneda(carrera.monto_total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* TABLA DETALLADA DE CONCEPTOS */}
      <div className="mt-8 bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">📋 Detalle de Conceptos Pagados</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-3 py-2 text-left text-slate-300">Institución</th>
                <th className="px-3 py-2 text-left text-slate-300">Carrera</th>
                <th className="px-3 py-2 text-left text-slate-300">Tipo</th>
                <th className="px-3 py-2 text-center text-slate-300">Mes</th>
                <th className="px-3 py-2 text-right text-slate-300">Monto Unitario</th>
                <th className="px-3 py-2 text-right text-slate-300">Pagos</th>
                <th className="px-3 py-2 text-right text-slate-300">Total Pagado</th>
              </tr>
            </thead>
            <tbody>
              {conceptos
                .filter(c => c.monto_pagado > 0)
                .sort((a, b) => b.monto_pagado - a.monto_pagado)
                .map((concepto, idx) => (
                  <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="px-3 py-2 text-slate-300">{concepto.institucion_nombre}</td>
                    <td className="px-3 py-2 text-slate-300">{concepto.carrera_nombre}</td>
                    <td className="px-3 py-2 font-semibold text-cyan-400">{concepto.tipo}</td>
                    <td className="px-3 py-2 text-center text-slate-400">{concepto.mes || '-'}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(concepto.monto)}</td>
                    <td className="px-3 py-2 text-right text-blue-300">{concepto.cantidad_pagos}</td>
                    <td className="px-3 py-2 text-right font-bold text-green-300">{formatoMoneda(concepto.monto_pagado)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500 text-center">
        {conceptos.filter(c => c.monto_pagado > 0).length} conceptos con pagos registrados | Último actualizado:{' '}
        {new Date().toLocaleString()}
      </div>
    </div>
  )
}

export default ReporteCompleto
