import { supabase } from '@renderer/lib/supabase'

export const crearOActualizarConceptos = async (
  institucionId: number,
  carreraId: number,
  montoInscripcion: number,
  montoCuota: number,
  montoSeguro: number,
  configAnterior?: { monto_inscripcion: number; monto_cuota: number; monto_seguro: number }
) => {
  try {
    console.log('[CONCEPTOS] Verificando qué cambió...')
    
    const anioActual = new Date().getFullYear()
    const conceptosACrear: any[] = []

    // 1. INSCRIPCIÓN - solo si cambió o es nueva
    const inscripcionCambio = !configAnterior || configAnterior.monto_inscripcion !== montoInscripcion
    if (montoInscripcion > 0 && inscripcionCambio) {
      console.log(`[CONCEPTOS] Inscripción cambió: ${configAnterior?.monto_inscripcion || 'nueva'} → ${montoInscripcion}`)
      conceptosACrear.push({
        p_institucion_id: institucionId,
        p_carrera_id: carreraId,
        p_nombre: 'Inscripción',
        p_tipo: 'INSCRIPCION',
        p_monto: montoInscripcion,
        p_mes: null,
        p_año: null,
      })
    }

    // 2. CUOTAS - solo si cambió o es nueva
    const cuotaCambio = !configAnterior || configAnterior.monto_cuota !== montoCuota
    if (montoCuota > 0 && cuotaCambio) {
      console.log(`[CONCEPTOS] Cuota cambió: ${configAnterior?.monto_cuota || 'nueva'} → ${montoCuota}`)
      const mesesNombres = {
        3: 'Marzo',
        4: 'Abril',
        5: 'Mayo',
        6: 'Junio',
        7: 'Julio',
        8: 'Agosto',
        9: 'Septiembre',
        10: 'Octubre',
        11: 'Noviembre',
        12: 'Diciembre',
      }
      for (let mes = 3; mes <= 12; mes++) {
        conceptosACrear.push({
          p_institucion_id: institucionId,
          p_carrera_id: carreraId,
          p_nombre: `Cuota - ${mesesNombres[mes as keyof typeof mesesNombres]}`,
          p_tipo: 'CUOTA',
          p_monto: montoCuota,
          p_mes: mes,
          p_año: anioActual,
        })
      }
    }

    // 3. SEGURO - solo si cambió o es nueva
    const seguroCambio = !configAnterior || configAnterior.monto_seguro !== montoSeguro
    if (montoSeguro > 0 && seguroCambio) {
      console.log(`[CONCEPTOS] Seguro cambió: ${configAnterior?.monto_seguro || 'nueva'} → ${montoSeguro}`)
      const montoSeguroMensual = Math.round((montoSeguro / 10) * 100) / 100
      const mesesNombres = {
        3: 'Marzo',
        4: 'Abril',
        5: 'Mayo',
        6: 'Junio',
        7: 'Julio',
        8: 'Agosto',
        9: 'Septiembre',
        10: 'Octubre',
        11: 'Noviembre',
        12: 'Diciembre',
      }
      for (let mes = 3; mes <= 12; mes++) {
        conceptosACrear.push({
          p_institucion_id: institucionId,
          p_carrera_id: carreraId,
          p_nombre: `Seguro - ${mesesNombres[mes as keyof typeof mesesNombres]}`,
          p_tipo: 'SEGURO',
          p_monto: montoSeguroMensual,
          p_mes: mes,
          p_año: anioActual,
        })
      }
    }

    if (conceptosACrear.length === 0) {
      console.log('[CONCEPTOS] No hay cambios, omitiendo RPC')
      return { success: true, created: 0, updated: 0, total: 0, message: 'Sin cambios' }
    }

    console.log(`[CONCEPTOS] Llamando RPC ${conceptosACrear.length} veces...`)

    // Ejecutar cada upsert
    const resultados: any[] = []
    for (const concepto of conceptosACrear) {
      try {
        const { data, error } = await supabase.rpc('upsert_conceptos_pago', concepto)

        if (error) {
          console.error(`[CONCEPTOS] Error en RPC para ${concepto.p_nombre}:`, error)
          throw error
        }

        console.log(`[CONCEPTOS] ✓ ${concepto.p_nombre} - ${data?.action || 'OK'}`)
        resultados.push(data)
      } catch (err) {
        console.error(`[CONCEPTOS] Error procesando ${concepto.p_nombre}:`, err)
        throw err
      }
    }

    const inserts = resultados.filter(r => r?.action === 'INSERT').length
    const updates = resultados.filter(r => r?.action === 'UPDATE').length
    const totales = resultados.length

    console.log(`[CONCEPTOS] Completado: ${inserts} insertados, ${updates} actualizados, ${totales} totales`)

    return {
      success: true,
      created: inserts,
      updated: updates,
      total: totales,
      message: `${inserts} creados, ${updates} actualizados`,
    }
  } catch (error) {
    console.error('[CONCEPTOS] Error:', error)
    const mensaje = error instanceof Error ? error.message : 'Error desconocido'
    return { success: false, created: 0, updated: 0, total: 0, message: `Error: ${mensaje}` }
  }
}

