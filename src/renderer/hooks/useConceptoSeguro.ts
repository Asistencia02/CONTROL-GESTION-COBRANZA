import { supabase } from '@renderer/lib/supabase'

export const crearConceptosSeguroDistribuido = async (institucionId: number, carreraId: number, montoSeguro: number) => {
  try {
    // Verificar si ya existen conceptos de seguro para esta carrera
    const { data: conceptosExistentes, error: errCheck } = await supabase
      .from('conceptos_pago')
      .select('id, mes')
      .eq('institucion_id', institucionId)
      .eq('carrera_id', carreraId)
      .eq('tipo', 'SEGURO')
      .eq('activo', true)

    if (errCheck) throw errCheck

    // Si ya existen, no crear nuevos
    if ((conceptosExistentes || []).length >= 10) {
      console.log('[SEGURO] Ya existen 10 conceptos de seguro para esta carrera')
      return { success: true, created: 0, message: 'Ya existen 10 conceptos de seguro' }
    }

    // ✅ v2.FIX: Usar monto_seguro directamente (NO dividir por 10)
    // Crear 10 conceptos de seguro (1 por mes) con el monto configurado
    const conceptosACrear: any[] = []

    for (let mes = 1; mes <= 10; mes++) {
      conceptosACrear.push({
        institucion_id: institucionId,
        carrera_id: carreraId,
        nombre: `Seguro - Mes ${mes}`,
        tipo: 'SEGURO',
        monto: montoSeguro,
        mes: mes,
        año: new Date().getFullYear(),
        activo: true,
        descripcion: `Pago de seguro mensual (${montoSeguro} por mes)`,
      })
    }

    const { data: conceptosCreados, error: errCreate } = await supabase
      .from('conceptos_pago')
      .insert(conceptosACrear)
      .select()

    if (errCreate) throw errCreate

    console.log(`[SEGURO] Creados ${conceptosCreados?.length || 0} conceptos de seguro`)
    return { success: true, created: conceptosCreados?.length || 0, message: 'Conceptos de seguro creados exitosamente' }
  } catch (error) {
    console.error('[SEGURO] Error creando conceptos:', error)
    return { success: false, created: 0, message: error instanceof Error ? error.message : 'Error desconocido' }
  }
}
