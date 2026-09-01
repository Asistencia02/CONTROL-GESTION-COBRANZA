import { supabase } from '@renderer/lib/supabase'

/**
 * Tipos para el generador de conceptos
 */
export interface ConfiguracionCarrera {
  id: number
  carrera_id: number
  institucion_id: number
  monto_inscripcion: number
  monto_cuota: number
  monto_seguro: number
}

export interface ConceptoGenerado {
  institucion_id: number
  carrera_id: number
  nombre: string
  tipo: string
  monto: number
  mes?: number
  año: number
  activo: boolean
}

/**
 * Genera conceptos de pago basados en configuracion_carreras
 * Crea: INSCRIPCION, SEGURO, y CUOTAS (Enero a Diciembre)
 * 
 * @param institucionId ID de la institución
 * @param año Año para los conceptos (default: año actual)
 * @returns Lista de conceptos generados
 */
export const generarConceptosPorCarrera = async (
  institucionId: number,
  año: number = new Date().getFullYear()
): Promise<{ success: boolean; mensaje: string; conceptosGenerados?: number; errores?: string[] }> => {
  try {
    // 1. Obtener todas las configuraciones de carreras para esta institución
    const { data: configuracionesCarreras, error: errorConfiguraciones } = await supabase
      .from('configuracion_carreras')
      .select('*')
      .eq('institucion_id', institucionId)

    if (errorConfiguraciones) throw errorConfiguraciones
    if (!configuracionesCarreras || configuracionesCarreras.length === 0) {
      return {
        success: false,
        mensaje: 'No hay configuraciones de carreras para esta institución',
      }
    }

    // 2. Obtener conceptos ya existentes para evitar duplicados
    const { data: conceptosExistentes, error: errorExistentes } = await supabase
      .from('conceptos_pago')
      .select('carrera_id, tipo, mes, año')
      .eq('institucion_id', institucionId)
      .eq('año', año)

    if (errorExistentes) throw errorExistentes

    const conceptosExistentesMap = new Map<string, boolean>()
    conceptosExistentes?.forEach((c: any) => {
      const key = `${c.carrera_id}-${c.tipo}-${c.mes || 'sin-mes'}`
      conceptosExistentesMap.set(key, true)
    })

    // 3. Generar conceptos para cada carrera
    const conceptosAInsertar: ConceptoGenerado[] = []
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    for (const config of configuracionesCarreras) {
      // INSCRIPCIÓN (una sola)
      const keyInscripcion = `${config.carrera_id}-INSCRIPCION-sin-mes`
      if (!conceptosExistentesMap.has(keyInscripcion)) {
        conceptosAInsertar.push({
          institucion_id: institucionId,
          carrera_id: config.carrera_id,
          nombre: `Inscripción ${año}`,
          tipo: 'INSCRIPCION',
          monto: config.monto_inscripcion,
          mes: undefined,
          año,
          activo: true,
        })
      }

      // SEGURO (una sola)
      const keySeguro = `${config.carrera_id}-SEGURO-sin-mes`
      if (!conceptosExistentesMap.has(keySeguro)) {
        conceptosAInsertar.push({
          institucion_id: institucionId,
          carrera_id: config.carrera_id,
          nombre: `Seguro ${año}`,
          tipo: 'SEGURO',
          monto: config.monto_seguro,
          mes: undefined,
          año,
          activo: true,
        })
      }

      // CUOTAS (12 meses)
      for (let mesNum = 1; mesNum <= 12; mesNum++) {
        const keyCuota = `${config.carrera_id}-CUOTA-${mesNum}`
        if (!conceptosExistentesMap.has(keyCuota)) {
          conceptosAInsertar.push({
            institucion_id: institucionId,
            carrera_id: config.carrera_id,
            nombre: `Cuota ${meses[mesNum - 1]}`,
            tipo: 'CUOTA',
            monto: config.monto_cuota,
            mes: mesNum,
            año,
            activo: true,
          })
        }
      }
    }

    // 4. Insertar conceptos si hay alguno nuevo
    if (conceptosAInsertar.length === 0) {
      return {
        success: true,
        mensaje: 'Todos los conceptos ya existen, no hay nuevos para generar',
        conceptosGenerados: 0,
      }
    }

    const { error: errorInsert } = await supabase
      .from('conceptos_pago')
      .insert(conceptosAInsertar)

    if (errorInsert) throw errorInsert

    return {
      success: true,
      mensaje: `✓ ${conceptosAInsertar.length} conceptos generados exitosamente para ${año}`,
      conceptosGenerados: conceptosAInsertar.length,
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido'
    return {
      success: false,
      mensaje: `Error al generar conceptos: ${mensaje}`,
      errores: [mensaje],
    }
  }
}

/**
 * Genera conceptos para MÚLTIPLES INSTITUCIONES
 * Útil cuando tienes 2 instituciones (id:1 e id:2)
 * 
 * @param institucionIds Array de IDs de instituciones
 * @param año Año para los conceptos
 * @returns Resumen de operación
 */
export const generarConceptosMultiplesInstituciones = async (
  institucionIds: number[],
  año: number = new Date().getFullYear()
): Promise<{ success: boolean; resultados: any[] }> => {
  const resultados = []

  for (const instId of institucionIds) {
    const resultado = await generarConceptosPorCarrera(instId, año)
    resultados.push({
      institucion_id: instId,
      ...resultado,
    })
  }

  const todosExitosos = resultados.every((r) => r.success)
  const totalGenerados = resultados.reduce((sum, r) => sum + (r.conceptosGenerados || 0), 0)

  return {
    success: todosExitosos,
    resultados: [
      ...resultados,
      {
        resumen: `Total: ${totalGenerados} conceptos generados en ${institucionIds.length} institución(es)`,
      },
    ],
  }
}

/**
 * Obtiene el desglose de conceptos por institución y carrera
 * Útil para visualizar qué se va a generar
 * 
 * @param institucionId ID de la institución
 * @param año Año a consultar
 * @returns Desglose de conceptos
 */
export const obtenerDesgloceConceptos = async (
  institucionId: number,
  año: number = new Date().getFullYear()
): Promise<{
  por_carrera: Record<
    number,
    {
      carrera_nombre: string
      inscripcion: number | null
      seguro: number | null
      cuota_mensual: number | null
      total_anual: number | null
    }
  >
}> => {
  try {
    const { data, error } = await supabase
      .from('v_conceptos_por_carrera')
      .select('*')
      .eq('institucion_id', institucionId)
      .eq('año', año)

    if (error) throw error

    const desglose: Record<
      number,
      {
        carrera_nombre: string
        inscripcion: number | null
        seguro: number | null
        cuota_mensual: number | null
        total_anual: number | null
      }
    > = {}

    data?.forEach((row: any) => {
      if (!desglose[row.carrera_id]) {
        desglose[row.carrera_id] = {
          carrera_nombre: row.carrera_nombre || `Carrera ${row.carrera_id}`,
          inscripcion: null,
          seguro: null,
          cuota_mensual: null,
          total_anual: null,
        }
      }

      if (row.tipo === 'INSCRIPCION') desglose[row.carrera_id].inscripcion = row.monto
      if (row.tipo === 'SEGURO') desglose[row.carrera_id].seguro = row.monto
      if (row.tipo === 'CUOTA') desglose[row.carrera_id].cuota_mensual = row.monto
    })

    // Calcular totales anuales
    Object.keys(desglose).forEach((carreraId) => {
      const carrera = desglose[parseInt(carreraId)]
      const inscripcion = carrera.inscripcion || 0
      const seguro = carrera.seguro || 0
      const cuota = (carrera.cuota_mensual || 0) * 12
      carrera.total_anual = inscripcion + seguro + cuota
    })

    return { por_carrera: desglose }
  } catch (error) {
    console.error('Error obteniendo desglose:', error)
    return { por_carrera: {} }
  }
}

/**
 * Actualiza montos de conceptos existentes
 * Útil cuando cambias valores en configuracion_carreras
 * 
 * @param institucionId ID de la institución
 * @param carreraId ID de la carrera (opcional, si no se especifica actualiza todas)
 * @param año Año a actualizar
 * @returns Resultado de operación
 */
export const actualizarConceptosDesdeConfiguracion = async (
  institucionId: number,
  carreraId?: number,
  año: number = new Date().getFullYear()
): Promise<{ success: boolean; mensaje: string; actualizados?: number }> => {
  try {
    // 1. Obtener configuraciones
    let queryConfiguraciones = supabase
      .from('configuracion_carreras')
      .select('*')
      .eq('institucion_id', institucionId)

    if (carreraId) {
      queryConfiguraciones = queryConfiguraciones.eq('carrera_id', carreraId)
    }

    const { data: configuracionesCarreras, error: errorConfiguraciones } = await queryConfiguraciones

    if (errorConfiguraciones) throw errorConfiguraciones
    if (!configuracionesCarreras || configuracionesCarreras.length === 0) {
      return { success: false, mensaje: 'No hay configuraciones para actualizar' }
    }

    let actualizados = 0

    // 2. Actualizar cada concepto
    for (const config of configuracionesCarreras) {
      // Actualizar INSCRIPCIÓN
      const { error: errIns } = await supabase
        .from('conceptos_pago')
        .update({ monto: config.monto_inscripcion })
        .match({
          institucion_id: institucionId,
          carrera_id: config.carrera_id,
          tipo: 'INSCRIPCION',
          año,
        })

      if (!errIns) actualizados++

      // Actualizar SEGURO
      const { error: errSeg } = await supabase
        .from('conceptos_pago')
        .update({ monto: config.monto_seguro })
        .match({
          institucion_id: institucionId,
          carrera_id: config.carrera_id,
          tipo: 'SEGURO',
          año,
        })

      if (!errSeg) actualizados++

      // Actualizar CUOTAS
      const { error: errCuota } = await supabase
        .from('conceptos_pago')
        .update({ monto: config.monto_cuota })
        .match({
          institucion_id: institucionId,
          carrera_id: config.carrera_id,
          tipo: 'CUOTA',
          año,
        })

      if (!errCuota) actualizados += 12
    }

    return {
      success: true,
      mensaje: `✓ ${actualizados} conceptos actualizados`,
      actualizados,
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido'
    return {
      success: false,
      mensaje: `Error al actualizar: ${mensaje}`,
    }
  }
}
