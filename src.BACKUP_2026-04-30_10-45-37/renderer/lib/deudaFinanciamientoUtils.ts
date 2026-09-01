import { supabase } from '@renderer/lib/supabase'

interface RegistroFinanciamientoParams {
  estudiante_id: number
  institucion_id: string
  deuda_original: number
  pago_inicial: number
  cuotas: number
  año_deuda: number
  año_financiamiento: number
  concepto_inscripcion_id?: number
  metodo_pago?: string
  numero_talonario?: string
}

interface RegistroFinanciamientoResponse {
  success: boolean
  mensaje: string
  deuda_financiada_id?: number
  pago_id?: number
  error?: string
}

export const registrarFinanciamientoDeuda = async (
  params: RegistroFinanciamientoParams
): Promise<RegistroFinanciamientoResponse> => {
  try {
    const {
      estudiante_id,
      institucion_id,
      deuda_original,
      pago_inicial,
      cuotas,
      año_deuda,
      año_financiamiento,
      concepto_inscripcion_id,
      metodo_pago,
      numero_talonario
    } = params

    const saldo_financiar = deuda_original - pago_inicial
    const monto_extra_cuota = Math.round((saldo_financiar / cuotas) * 100) / 100
    const cuotaBase = 20000
    const monto_cuota_final = cuotaBase + monto_extra_cuota // Cuota base + extra

    // 1. Crear registro de financiamiento
    const { data: deudaFinanciada, error: errorDeuda } = await supabase
      .from('deuda_financiada')
      .insert([
        {
          institucion_id,
          estudiante_id,
          año_deuda,
          año_financiamiento,
          deuda_original,
          pago_inicial,
          saldo_financiar,
          cuotas_mensuales: cuotas,
          monto_extra_cuota,
          monto_cuota_final,
          mes_inicio: 3,
          mes_fin: 12,
          estado: 'ACTIVO'
        }
      ])
      .select()
      .single()

    if (errorDeuda) throw errorDeuda

    console.log(`✓ Financiamiento creado: ID ${deudaFinanciada.id}`)

    // 2. Crear detalles para cada mes
    const detalles = []
    for (let mes = 3; mes <= 12; mes++) {
      detalles.push({
        institucion_id,
        estudiante_id,
        deuda_financiada_id: deudaFinanciada.id,
        mes,
        monto_cuota_regular: cuotaBase,
        monto_deuda_mes: monto_extra_cuota,
        monto_total: monto_cuota_final,
        pagado: false
      })
    }

    const { error: errorDetalles } = await supabase
      .from('pagos_deuda_detalle')
      .insert(detalles)

    if (errorDetalles) throw errorDetalles

    console.log(`✓ ${detalles.length} cuotas con deuda creadas`)

    // 3. Si hay pago inicial, registrarlo en pagos
    let pago_id: number | undefined

    if (pago_inicial > 0 && concepto_inscripcion_id) {
      const { data: pagoPago, error: errorPago } = await supabase
        .from('pagos')
        .insert([
          {
            institucion_id,
            estudiante_id,
            concepto_id: concepto_inscripcion_id,
            monto_pagado: pago_inicial,
            monto_original: pago_inicial,
            metodo_pago: metodo_pago || 'EFECTIVO',
            numero_talonario: numero_talonario || null,
            fecha_pago: new Date().toISOString(),
            estado: 'COMPLETADO',
            notas: `Pago inicial de deuda ${año_deuda} financiada en ${año_financiamiento}`
          }
        ])
        .select()
        .single()

      if (errorPago) throw errorPago
      pago_id = pagoPago.id
      console.log(`✓ Pago inicial registrado: ID ${pago_id}`)
    }

    // 4. Actualizar deuda histórica a PARCIALMENTE_PAGADA si hay pago inicial
    if (pago_inicial > 0) {
      const { error: errorActualizarDeuda } = await supabase
        .from('deudas_historicas')
        .update({ estado: 'PARCIALMENTE_PAGADA' })
        .eq('estudiante_id', estudiante_id)
        .eq('año_deuda', año_deuda)
        .eq('institucion_id', institucion_id)

      if (errorActualizarDeuda) throw errorActualizarDeuda
    }

    // 5. Actualizar estudiante
    const { error: errorEstudiante } = await supabase
      .from('estudiantes')
      .update({
        deuda_años_anteriores: saldo_financiar,
        última_actualización_deuda: new Date().toISOString()
      })
      .eq('id', estudiante_id)

    if (errorEstudiante) throw errorEstudiante

    return {
      success: true,
      mensaje: `Financiamiento registrado. Deuda: $${deuda_original.toLocaleString('es-AR')} en ${cuotas} cuotas de $${monto_cuota_final.toLocaleString('es-AR')}`,
      deuda_financiada_id: deudaFinanciada.id,
      pago_id
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'Error al registrar financiamiento'
    console.error('Error registrarFinanciamientoDeuda:', err)
    return {
      success: false,
      mensaje: 'Error',
      error: mensaje
    }
  }
}

// Obtener deuda de estudiante
export const obtenerDeudaEstudiante = async (
  estudiante_id: number,
  institucion_id: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('deudas_historicas')
      .select('total_adeudado')
      .eq('estudiante_id', estudiante_id)
      .eq('institucion_id', institucion_id)
      .eq('estado', 'PENDIENTE')
      .maybeSingle()

    if (error) throw error
    return data?.total_adeudado || 0
  } catch (err) {
    console.error('Error obtenerDeudaEstudiante:', err)
    return 0
  }
}

// Marcar pago de cuota con deuda
export const marcarPagoCuotaDeuda = async (
  pago_deuda_detalle_id: number,
  pago_id: number,
  numero_talonario?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('pagos_deuda_detalle')
      .update({
        pagado: true,
        fecha_pago: new Date().toISOString(),
        pago_id,
        numero_talonario: numero_talonario || null
      })
      .eq('id', pago_deuda_detalle_id)

    if (error) throw error
    console.log(`✓ Cuota con deuda marcada como pagada`)
    return true
  } catch (err) {
    console.error('Error marcarPagoCuotaDeuda:', err)
    return false
  }
}

// Verificar si todas las cuotas están pagadas
export const verificarDeudaFinanciada = async (
  deuda_financiada_id: number
): Promise<{ pagadas: number; totales: number; completada: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('pagos_deuda_detalle')
      .select('pagado')
      .eq('deuda_financiada_id', deuda_financiada_id)

    if (error) throw error

    const totales = data?.length || 0
    const pagadas = data?.filter(d => d.pagado).length || 0
    const completada = pagadas === totales && totales > 0

    if (completada) {
      // Actualizar estado a PAGADA
      await supabase
        .from('deuda_financiada')
        .update({ estado: 'PAGADA', fecha_actualizacion: new Date().toISOString() })
        .eq('id', deuda_financiada_id)
    }

    return { pagadas, totales, completada }
  } catch (err) {
    console.error('Error verificarDeudaFinanciada:', err)
    return { pagadas: 0, totales: 0, completada: false }
  }
}

