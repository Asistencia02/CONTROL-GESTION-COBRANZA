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

    // Crear 10 conceptos de seguro (1 por mes)
    const montoMensual = Math.round((montoSeguro / 10) * 100) / 100 // Redondear a 2 decimales
    const conceptosACrear: any[] = []

    for (let mes = 1; mes <= 10; mes++) {
      conceptosACrear.push({
        institucion_id: institucionId,
        carrera_id: carreraId,
        nombre: `Seguro - Mes ${mes}`,
        tipo: 'SEGURO',
        monto: montoMensual,
        mes: mes,
        año: new Date().getFullYear(),
        activo: true,
        descripcion: `Pago de seguro mensual (${montoMensual * 10} total distribuido en 10 cuotas)`,
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
