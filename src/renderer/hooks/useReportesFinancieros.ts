import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { useVentasInsumos } from '@renderer/hooks/useVentasInsumos'

export interface ResumenEjecutivo {
  // ANUAL (TODO sin filtro de vencimiento)
  total_recaudable_año: number
  recaudado_hasta_hoy: number
  deuda_actual: number
  porcentaje_cobro: number
  total_estudiantes: number
  estudiantes_en_mora: number
  porcentaje_en_mora: number
  extra_por_recargo: number
  
  // HASTA MES ACTUAL (solo conceptos vencidos - actualiza mes a mes)
  recaudable_mes_actual: number
  recaudado_mes_actual: number
  pendiente_mes_actual: number
  porcentaje_cobro_mes_actual: number
  estudiantes_mora_mes_actual: number
  porcentaje_mora_mes_actual: number
  
  mes_actual_nombre: string
  fecha_reporte: string
}

export interface ReportePorCarrera {
  carrera_id: number
  carrera: string
  recaudable_año: number
  recaudable_hasta_hoy: number
  realmente_recaudado_hasta_hoy: number
  deuda_actual: number
  pendiente_hasta_hoy: number
  porcentaje_cobro: number
  total_estudiantes: number
  estudiantes_en_mora: number
}

export interface ReporteMesAMes {
  carrera: string
  cantidad_estudiantes: number
  mes_actual: number
  mes_nombre: string
  inscripcion_deberia: number
  cuotas_deberia: number
  seguro_deberia: number
  deberia_cobrar_total: number
  cobre_real_total: number
  diferencia: number
  estado_diferencia: string
  porcentaje_cumplimiento: number
}

export interface TopEstudiantesMora {
  ranking: number
  dni: string
  nombre_completo: string
  carrera: string
  deuda_monto: number
  meses_adeudados: string
  cantidad_conceptos_adeudados: number
}

export interface ProyeccionAño {
  mes_actual: number
  recaudado_hasta_hoy: number
  recaudable_año: number
  proyeccion_recaudado_año: number
  porcentaje_proyeccion: number
  fecha_calculo: string
}

// ========== CONSTANTES ==========
const PRIMER_MES_ACADEMICO = 3  // Marzo
const ULTIMO_MES_ACADEMICO = 8  // Agosto
const PRIMER_DIA_VENCIMIENTO = 10

export const useReportesFinancieros = (institucionId: number) => {
  const { obtenerTotalVentasPeriodo } = useVentasInsumos()
  const [resumenEjecutivo, setResumenEjecutivo] = useState<ResumenEjecutivo | null>(null)
  const [reportePorCarrera, setReportePorCarrera] = useState<ReportePorCarrera[]>([])
  const [reporteMesAMes, setReporteMesAMes] = useState<ReporteMesAMes[]>([])
  const [topEstudiantesMora, setTopEstudiantesMora] = useState<TopEstudiantesMora[]>([])
  const [proyeccionAño, setProyeccionAño] = useState<ProyeccionAño | null>(null)
  const [totalGastos, setTotalGastos] = useState(0)
  const [totalVentasInsumos, setTotalVentasInsumos] = useState(0)
  const [totalVentasKiosco, setTotalVentasKiosco] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarReportes = async () => {
    try {
      console.log('[REPORTES] Cargando para institucion ID:', institucionId)
      setLoading(true)
      setError(null)

      const today = new Date()
      const diaActual = today.getDate()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()
      
      // Día de vencimiento: 10 - si es antes del día 10, el mes aún no vence
      const mesVencidoActual = diaActual >= PRIMER_DIA_VENCIMIENTO ? mesActual : mesActual - 1
      const anioVencidoActual = mesVencidoActual < mesActual ? anioActual : anioActual

      const mesesNombre = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const mesActualNombre = mesesNombre[mesActual]

      // ========== OBTENER DATOS BASE ==========
      // Estudiantes activos
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, carreras(nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst
      console.log('[REPORTES] Estudiantes activos:', estudiantes?.length || 0)

      const estudiantesActivos = estudiantes || []
      
      // Agrupar estudiantes por carrera - necesario para RECAUDABLE y PROYECCIÓN
      const estudiantesPorCarrera = new Map<number, number>()
      estudiantesActivos.forEach(est => {
        estudiantesPorCarrera.set(est.carrera_id, (estudiantesPorCarrera.get(est.carrera_id) || 0) + 1)
      })
      
      if (estudiantesActivos.length === 0) {
        setResumenEjecutivo(null)
        setReportePorCarrera([])
        setReporteMesAMes([])
        setTopEstudiantesMora([])
        setProyeccionAño(null)
        setLoading(false)
        return
      }

      // Obtener TODOS los conceptos de la institución (no filtrar por carrera aquí)
      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      console.log('[REPORTES] TODOS los conceptos:', conceptos?.length)
      console.log('[REPORTES] Por carrera:', conceptos?.reduce((acc: any, c: any) => { acc[c.carrera_id] = (acc[c.carrera_id] || 0) + 1; return acc }, {}))

      // INSCRIPCION (sin mes/año)
      const inscripciones = (conceptos || []).filter(c => 
        c.tipo?.toUpperCase() === 'INSCRIPCION' && 
        (!c.mes || !c.año)
      )

      // CUOTAS + SEGURO (ambos con mes/año - SOLO meses académicos 3-8)
      // IMPORTANTE: Si día < 10, NO incluir mes actual
      const conceptosVencidos = (conceptos || []).filter(c => {
        // Incluir INSCRIPCION sin mes/año
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
          return true
        }
        // Para CUOTA y SEGURO, aplicar filtro de mes/año
        if (c.mes && c.año) {
          // Excluir enero y febrero - solo contar marzo a agosto
          if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false
          
          if (c.año < anioActual) return true
          if (c.año === anioActual) {
            // Si está en mes actual Y día < 10, NO incluir mes actual
            if (c.mes === mesActual && diaActual < PRIMER_DIA_VENCIMIENTO) return false
            if (c.mes < mesActual) return true
            if (c.mes === mesActual && diaActual >= PRIMER_DIA_VENCIMIENTO) return true
          }
        }
        return false
      })

      const conceptosFiltrados = [...inscripciones, ...conceptosVencidos]

      console.log('[REPORTES] Conceptos - Inscripciones:', inscripciones.length, '| Vencidos:', conceptosVencidos.length)
      if (inscripciones.length > 0) console.log('[REPORTES] Inscripción carrera_id:', inscripciones[0].carrera_id)
      if (conceptosVencidos.length > 0) console.log('[REPORTES] Vencidos carrera_ids:', conceptosVencidos.slice(0, 3).map((c: any) => c.carrera_id))
      const desglose = conceptosVencidos.reduce((acc, c) => {
        const tipo = c.tipo?.toUpperCase() || 'OTRO'
        acc[tipo] = (acc[tipo] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('[REPORTES] Desglose vencidos:', desglose)

      // ========== PAGOS - BUSCAR EN AMBAS TABLAS ==========
      // 1. Pagos individuales
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('id, estudiante_id, concepto_id, monto_pagado, estado')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (errPagos) throw errPagos

      // 2. Pagos múltiples - convertir a mismo formato
      const { data: pagosMultiples, error: errPagosMultiples } = await supabase
        .from('pagos_multiples_detalle')
        .select(`
          id,
          concepto_id,
          monto_pagado,
          pagos_multiples!inner(
            estudiante_id,
            estado,
            institucion_id
          )
        `)
        .eq('pagos_multiples.institucion_id', institucionId)
        .neq('pagos_multiples.estado', 'ANULADO')

      if (errPagosMultiples) throw errPagosMultiples

      // Convertir pagos múltiples al mismo formato
      const pagosMultiplesFormato = (pagosMultiples || []).map((p: any) => ({
        id: p.id,
        estudiante_id: p.pagos_multiples?.estudiante_id,
        concepto_id: p.concepto_id,
        monto_pagado: p.monto_pagado,
        estado: p.pagos_multiples?.estado || 'PAGADO'
      }))

      // Combinar ambas tablas
      const pagosValidos = [...(pagos || []), ...pagosMultiplesFormato]
      console.log('[REPORTES] Pagos válidos:', pagosValidos.length, '(', (pagos?.length || 0), 'individuales +', pagosMultiplesFormato.length, 'múltiples)')

      // ========== CALCULAR VENCIDOS ANTES DE DÍA 10 DEL MES ACTUAL ==========
      // Si día < 10: mes actual NO vence hasta día 10
      // Si día >= 10: mes actual ya vence
      const conceptosVencidosMoraLocal = conceptosVencidos.filter(c => {
        if (c.mes && c.año) {
          if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false
          if (c.año < anioVencidoActual) return true
          if (c.año === anioVencidoActual && c.mes <= mesVencidoActual) return true
        }
        return false
      })
      console.log('[MORA] Conceptos vencidos para mora:', conceptosVencidosMoraLocal.length, 'de', conceptosVencidos.length, '| diaActual:', diaActual, 'mesVencidoActual:', mesVencidoActual)

      // ========== CALCULAR RESUMEN EJECUTIVO - PARTE ANUAL ==========
      let totalRecaudable = 0
      let totalRecaudado = 0
      let estudiantesEnMora = 0
      const conceptoPorEstudiante = new Map<number, number>()

      // Calcular deuda por estudiante - USAR conceptosVencidos COMPLETO (sin filtro día 10)
      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        conceptosVencidos.forEach(concepto => {
          // SOLO conceptos de la carrera del estudiante
          if (concepto.carrera_id !== est.carrera_id) return
          
          const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === concepto.id && p.monto_pagado >= concepto.monto)
          if (!tienePago) {
            deudaEst += concepto.monto
          }
        })
        if (deudaEst > 0) {
          conceptoPorEstudiante.set(est.id, deudaEst)
          estudiantesEnMora++
        }
      })

      // CORREGIDO: Calcular recaudable por carrera y sumar - NO multiplicar por TODOS los estudiantes
      totalRecaudable = 0
      estudiantesActivos.forEach(est => {
        const conceptosDelEstudiante = conceptosFiltrados.filter(c => c.carrera_id === est.carrera_id)
        conceptosDelEstudiante.forEach(c => {
          totalRecaudable += c.monto
        })
      })
      totalRecaudado = pagosValidos.reduce((sum, p) => sum + p.monto_pagado, 0)

      const porcentajeCobro = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const pendiente = Math.max(0, totalRecaudable - totalRecaudado)

      // ========== CALCULAR RESUMEN EJECUTIVO - PARTE MES ACTUAL ==========
      // SOLO conceptos vencidos ANTES del mes actual (no incluir mes actual todavía)
      // NO incluir INSCRIPCIÓN porque no tiene vencimiento de mes
      const conceptosAntesdeMesActual = conceptosFiltrados.filter(c => {
        // EXCLUIR inscripción sin mes/año - no tiene "vencimiento anterior"
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
          return false
        }
        // Solo incluir CUOTA y SEGURO de meses ANTERIORES - excluir enero y febrero
        if (c.mes && c.año) {
          if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false
          if (c.año < anioActual) return true
          if (c.año === anioActual && c.mes < mesActual) return true
        }
        return false
      })

      let totalRecaudableMesActual = 0
      let estudiantesEnMoraMesActual = 0
      const conceptoPorEstudianteMesActual = new Map<number, number>()

      // Calcular deuda por estudiante - SOLO CONCEPTOS ANTES DE MES ACTUAL
      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        conceptosAntesdeMesActual.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === concepto.id && p.monto_pagado >= concepto.monto)
          if (!tienePago) {
            deudaEst += concepto.monto
          }
        })
        if (deudaEst > 0) {
          conceptoPorEstudianteMesActual.set(est.id, deudaEst)
          estudiantesEnMoraMesActual++
        }
      })

      // Recaudable mes actual (hasta antes de vencer el mes)
      totalRecaudableMesActual = 0
      estudiantesActivos.forEach(est => {
        const conceptosDelEstudiante = conceptosAntesdeMesActual.filter(c => c.carrera_id === est.carrera_id)
        conceptosDelEstudiante.forEach(c => {
          totalRecaudableMesActual += c.monto
        })
      })
      
      // Pagos para conceptos antes de mes actual
      const pagosValidosMesActual = pagosValidos.filter(p => {
        const concepto = conceptosFiltrados.find(c => c.id === p.concepto_id)
        if (!concepto) return false
        if (concepto.mes && concepto.año) {
          if (concepto.año < anioActual) return true
          if (concepto.año === anioActual && concepto.mes < mesActual) return true
        } else {
          return concepto.tipo?.toUpperCase() === 'INSCRIPCION'
        }
        return false
      })
      const totalRecaudadoMesActual = pagosValidosMesActual.reduce((sum, p) => sum + p.monto_pagado, 0)
      const porcentajeCobroMesActual = totalRecaudableMesActual > 0 ? (totalRecaudadoMesActual / totalRecaudableMesActual) * 100 : 0
      const pendienteMesActual = Math.max(0, totalRecaudableMesActual - totalRecaudadoMesActual)

      setResumenEjecutivo({
        total_recaudable_año: totalRecaudable,
        recaudado_hasta_hoy: totalRecaudado,
        deuda_actual: pendiente,
        porcentaje_cobro: parseFloat(porcentajeCobro.toFixed(1)),
        total_estudiantes: estudiantesActivos.length,
        estudiantes_en_mora: estudiantesEnMora,
        porcentaje_en_mora: parseFloat(((estudiantesEnMora / (estudiantesActivos.length || 1)) * 100).toFixed(1)),
        extra_por_recargo: Math.max(0, totalRecaudado - totalRecaudable),
        recaudable_mes_actual: totalRecaudableMesActual,
        recaudado_mes_actual: totalRecaudadoMesActual,
        pendiente_mes_actual: pendienteMesActual,
        porcentaje_cobro_mes_actual: parseFloat(porcentajeCobroMesActual.toFixed(1)),
        estudiantes_mora_mes_actual: estudiantesEnMoraMesActual,
        porcentaje_mora_mes_actual: parseFloat(((estudiantesEnMoraMesActual / (estudiantesActivos.length || 1)) * 100).toFixed(1)),
        mes_actual_nombre: mesActualNombre,
        fecha_reporte: new Date().toISOString(),
      })
      console.log('[REPORTES] ANUAL - Recaudable:', totalRecaudable, '| Recaudado:', totalRecaudado, '| En mora:', estudiantesEnMora)
      console.log('[REPORTES] HASTA', mesActualNombre, '- Recaudable:', totalRecaudableMesActual, '| Recaudado:', totalRecaudadoMesActual, '| En mora:', estudiantesEnMoraMesActual)

      // ========== REPORTES POR CARRERA ==========
      const carreras = new Map<number, any>()
      estudiantesActivos.forEach(est => {
        if (!carreras.has(est.carrera_id)) {
          carreras.set(est.carrera_id, {
            carrera_id: est.carrera_id,
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            estudiantes: [],
          })
        }
        carreras.get(est.carrera_id).estudiantes.push(est.id)
      })

      const reportePorCar: ReportePorCarrera[] = Array.from(carreras.values()).map(carr => {
        const estCarrera = carr.estudiantes
        let recaudadoCarrera = 0
        let enMoraCarrera = 0

        pagosValidos.forEach(pago => {
          if (estCarrera.includes(pago.estudiante_id)) {
            recaudadoCarrera += pago.monto_pagado
          }
        })

        estCarrera.forEach(estId => {
          if (conceptoPorEstudiante.has(estId)) {
            enMoraCarrera++
          }
        })

        // CORREGIDO: Solo conceptos de esta carrera
        const recaudableCarrera = conceptosFiltrados
          .filter(c => c.carrera_id === carr.carrera_id)
          .reduce((sum, c) => sum + (c.monto * estCarrera.length), 0)
        const porcentajeCobroCarrera = recaudableCarrera > 0 ? (recaudadoCarrera / recaudableCarrera) * 100 : 0

        return {
          carrera_id: carr.carrera_id,
          carrera: carr.carrera,
          recaudable_año: recaudableCarrera,
          recaudable_hasta_hoy: recaudableCarrera,
          realmente_recaudado_hasta_hoy: recaudadoCarrera,
          deuda_actual: Math.max(0, recaudableCarrera - recaudadoCarrera),
          pendiente_hasta_hoy: Math.max(0, recaudableCarrera - recaudadoCarrera),
          porcentaje_cobro: parseFloat(porcentajeCobroCarrera.toFixed(1)),
          total_estudiantes: estCarrera.length,
          estudiantes_en_mora: enMoraCarrera,
        }
      })

      setReportePorCarrera(reportePorCar)

      // ========== REPORTES MES A MES ==========
      const reporteMeses: ReporteMesAMes[] = reportePorCar.map(carr => {
        const estCarrera = carr.total_estudiantes
        
        // ✅ FILTRAR CONCEPTOS POR CARRERA
        const inscripcionesCarrera = inscripciones.filter(c => c.carrera_id === carr.carrera_id)
        const conceptosVencidosCarrera = conceptosVencidos.filter(c => c.carrera_id === carr.carrera_id)
        console.log('[REPORTES] Carrera', carr.carrera_id, '- Inscripciones:', inscripcionesCarrera.length, 'Vencidos:', conceptosVencidosCarrera.length)
        
        // Separar por tipo - SOLO DE ESTA CARRERA
        const inscripcionDeberia = inscripcionesCarrera.reduce((sum, c) => sum + (c.monto * estCarrera), 0)
        
        const cuotasDeberia = conceptosVencidosCarrera
          .filter(c => c.tipo?.toUpperCase() === 'CUOTA')
          .reduce((sum, c) => sum + (c.monto * estCarrera), 0)
        
        const seguroDeberia = conceptosVencidosCarrera
          .filter(c => c.tipo?.toUpperCase() === 'SEGURO')
          .reduce((sum, c) => sum + (c.monto * estCarrera), 0)
        
        const totalDeberia = inscripcionDeberia + cuotasDeberia + seguroDeberia

        // Lo que realmente se cobró - SOLO DE ESTA CARRERA
        const conceptosFiltradosCarrera = [...inscripcionesCarrera, ...conceptosVencidosCarrera]
        const conceptosIds = conceptosFiltradosCarrera.map(c => c.id)
        const pagosCarrera = pagosValidos.filter(p => conceptosIds.includes(p.concepto_id))
        const cobradoReal = pagosCarrera.reduce((sum, p) => sum + p.monto_pagado, 0)

        return {
          carrera: carr.carrera,
          cantidad_estudiantes: estCarrera,
          mes_actual: mesActual,
          mes_nombre: new Date(anioActual, mesActual - 1).toLocaleString('es-AR', { month: 'long' }),
          inscripcion_deberia: inscripcionDeberia,
          cuotas_deberia: cuotasDeberia,
          seguro_deberia: seguroDeberia,
          deberia_cobrar_total: totalDeberia,
          cobre_real_total: cobradoReal,
          diferencia: cobradoReal - totalDeberia,
          estado_diferencia: cobradoReal >= totalDeberia ? 'SUPERADO' : 'FALTA',
          porcentaje_cumplimiento: totalDeberia > 0 ? (cobradoReal / totalDeberia) * 100 : 0,
        }
      })

      setReporteMesAMes(reporteMeses)

      // ========== TOP 20 EN MORA ==========
      // Ya calculado: conceptosVencidosMoraLocal (conceptos vencidos antes de día 10)
      const morosos: TopEstudiantesMora[] = []
      estudiantesActivos.forEach(est => {
        // Calcular deuda NUEVA - SOLO con conceptos vencidos antes de mes actual
        let deudaMora = 0
        conceptosVencidosMoraLocal.forEach(c => {
          if (c.carrera_id !== est.carrera_id) return
          const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === c.id && p.monto_pagado >= c.monto)
          if (!tienePago) {
            deudaMora += c.monto
          }
        })
        
        if (deudaMora > 0) {
          // Agrupar conceptos vencidos ANTES de mes actual por mes
          const conceptosPorMes = new Map<string, any[]>()
          
          conceptosVencidosMoraLocal.forEach(c => {
            if (c.carrera_id !== est.carrera_id) return
            const mesKey = (c.mes && c.año) ? `${c.año}-${c.mes}` : 'INSCRIPCION'
            if (!conceptosPorMes.has(mesKey)) {
              conceptosPorMes.set(mesKey, [])
            }
            conceptosPorMes.get(mesKey)!.push(c)
          })
          
          // Contar SOLO meses que tienen al menos 1 concepto sin pagar
          let mesesConDeuda = 0
          let conceptosAdeudadosTotal = 0
          
          conceptosPorMes.forEach((conceptosDelMes, mesKey) => {
            let tieneDeudaEnMes = false
            
            conceptosDelMes.forEach(c => {
              const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === c.id && p.monto_pagado >= c.monto)
              if (!tienePago) {
                tieneDeudaEnMes = true
                conceptosAdeudadosTotal++
              }
            })
            
            // Solo contar el mes si tiene al menos 1 concepto sin pagar
            if (tieneDeudaEnMes) {
              mesesConDeuda++
            }
          })

          morosos.push({
            ranking: 0,
            dni: est.dni || '',
            nombre_completo: `${est.nombre || ''} ${est.apellido || ''}`,
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            deuda_monto: deudaMora,
            meses_adeudados: mesesConDeuda.toString(),
            cantidad_conceptos_adeudados: conceptosAdeudadosTotal,
          })
        }
      })

      morosos.sort((a, b) => b.deuda_monto - a.deuda_monto)
      morosos.forEach((m, idx) => m.ranking = idx + 1)

      setTopEstudiantesMora(morosos.slice(0, 20))

      // ========== PROYECCIÓN ==========
      // ✅ CORREGIDO: Proyectar usando porcentaje de cobro actual
      
      // Calcular conceptos por vencer (septiembre-diciembre)
      const conceptosPorVencer = (conceptos || []).filter(c => {
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) return false
        if (c.mes && c.año) {
          if (c.año > anioActual) return true
          if (c.año === anioActual && c.mes > mesActual) return true
        }
        return false
      })
      
      // Contar estudiantes NO becados (solo los que pagan)
      const estudiantesNoBecados = estudiantesActivos.filter(e => e.estado !== 'BECADO_100' && e.estado !== 'BECADO_50').length
      
      // Total recaudable anual = lo vencido + lo por vencer POR CARRERA (SIN becados)
      let recaudablePorVencer = 0
      Array.from(estudiantesPorCarrera.entries()).forEach(([carreraId, cantEstudiantes]) => {
        // Solo NO becados de esta carrera
        const estudiantesNoBecadosCarrera = estudiantesActivos.filter(e => 
          e.carrera_id === carreraId && e.estado !== 'BECADO_100' && e.estado !== 'BECADO_50'
        ).length
        
        // Conceptos por vencer de esta carrera
        const conceptosPorVencerCarrera = conceptosPorVencer.filter(c => c.carrera_id === carreraId)
        const sumaConceptosPorVencer = conceptosPorVencerCarrera.reduce((sum, c) => sum + c.monto, 0)
        
        recaudablePorVencer += sumaConceptosPorVencer * estudiantesNoBecadosCarrera
      })
      const recaudableAnualTotal = totalRecaudable + recaudablePorVencer
      
      // Proyección anual = recaudable total × porcentaje de cobro actual
      const porcentajeCobroActual = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const proyeccionTotal = recaudableAnualTotal * (porcentajeCobroActual / 100)

      setProyeccionAño({
        mes_actual: mesActual,
        recaudado_hasta_hoy: totalRecaudado,
        recaudable_año: recaudableAnualTotal,
        proyeccion_recaudado_año: Math.max(0, proyeccionTotal),
        porcentaje_proyeccion: parseFloat(porcentajeCobroActual.toFixed(1)),
        fecha_calculo: new Date().toISOString(),
      })

      // ========== GASTOS E INSUMOS (solo INSM) ==========
      if (institucionId === 2) {
        const { data: gastosData } = await supabase
          .from('gastos')
          .select('monto')
          .eq('institucion_id', 2)

        if (gastosData) {
          const total = gastosData.reduce((sum, g) => sum + (g.monto || 0), 0)
          setTotalGastos(total)
        }

        const fechaInicio = new Date(anioActual, 0, 1).toISOString().split('T')[0]
        const fechaFin = new Date().toISOString().split('T')[0]
        const totalVentasIns = await obtenerTotalVentasPeriodo(institucionId, fechaInicio, fechaFin)
        setTotalVentasInsumos(totalVentasIns)

        const { data: cajaGrandeData } = await supabase
          .from('caja_grande')
          .select('monto')
          .eq('institucion_id', 2)

        if (cajaGrandeData) {
          const total = cajaGrandeData.reduce((sum, c) => sum + (c.monto || 0), 0)
          setTotalVentasKiosco(total)
        }
      }

    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensaje)
      console.error('[REPORTES] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (institucionId) {
      cargarReportes()
    }
  }, [institucionId])

  return {
    resumenEjecutivo,
    reportePorCarrera,
    reporteMesAMes,
    topEstudiantesMora,
    proyeccionAño,
    loading,
    error,
    refrescar: cargarReportes,
    totalGastos,
    totalVentasInsumos,
    totalVentasKiosco,
  }
}
