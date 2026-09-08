import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { useVentasInsumos } from '@renderer/hooks/useVentasInsumos'

export interface ResumenEjecutivo {
  total_recaudable_año: number
  recaudado_hasta_hoy: number
  deuda_actual: number
  porcentaje_cobro: number
  total_estudiantes: number
  estudiantes_en_mora: number
  porcentaje_en_mora: number
  extra_por_recargo: number
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

export interface DesgloseConcepto {
  tipo: string
  total_esperado: number
  total_cobrado: number
  total_pendiente: number
  porcentaje_cobro: number
  cantidad_conceptos: Set<number>
}

export interface EstudianteAlDia {
  id: number
  dni: string
  nombre_completo: string
  carrera: string
  total_responsable: number
  total_pagado: number
  estado_pago: string
  porcentaje_pagado: number
}

const PRIMER_MES_ACADEMICO = 3
const ULTIMO_MES_ACADEMICO = 8
const PRIMER_DIA_VENCIMIENTO = 10

const esConceptoBeca = (tipo: string): boolean => {
  if (!tipo) return true
  const tipoLower = tipo.toLowerCase()
  return !tipoLower.includes('inscripcion') && !tipoLower.includes('seguro')
}

export const useReportesFinancieros = (institucionId: number) => {
  const { obtenerTotalVentasPeriodo } = useVentasInsumos()
  const [resumenEjecutivo, setResumenEjecutivo] = useState<ResumenEjecutivo | null>(null)
  const [reportePorCarrera, setReportePorCarrera] = useState<ReportePorCarrera[]>([])
  const [reporteMesAMes, setReporteMesAMes] = useState<ReporteMesAMes[]>([])
  const [topEstudiantesMora, setTopEstudiantesMora] = useState<TopEstudiantesMora[]>([])
  const [proyeccionAño, setProyeccionAño] = useState<ProyeccionAño | null>(null)
  const [desgloseConceptos, setDesgloseConceptos] = useState<DesgloseConcepto[]>([])
  const [estudiantesAlDia, setEstudiantesAlDia] = useState<EstudianteAlDia[]>([])
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
      
      const mesVencidoActual = diaActual >= PRIMER_DIA_VENCIMIENTO ? mesActual : mesActual - 1
      const anioVencidoActual = mesVencidoActual < mesActual ? anioActual : anioActual

      const mesesNombre = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const mesActualNombre = mesesNombre[mesActual] || 'Mes Desconocido'

      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, carreras(nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst
      console.log('[REPORTES] Estudiantes activos:', estudiantes?.length || 0)

      const estudiantesActivos = estudiantes || []
      
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

      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      console.log('[REPORTES] TODOS los conceptos:', conceptos?.length)

      const inscripciones = (conceptos || []).filter(c => 
        c.tipo?.toUpperCase() === 'INSCRIPCION' && 
        (!c.mes || !c.año)
      )

      // IMPORTANTE: INCLUIR TODOS LOS CONCEPTOS SIN FILTRO DE FECHA
      const conceptosVencidos = conceptos || []

      const conceptosFiltrados = conceptosVencidos

      let todosPagos: any[] = []
      
      let pagina1 = 0
      let tieneRangoMas1 = true
      while (tieneRangoMas1) {
        const desde = pagina1 * 1000
        const hasta = desde + 999
        const { data: pagosBloques, error: err1 } = await supabase
          .from('pagos')
          .select('id, estudiante_id, concepto_id, monto_pagado, estado')
          .eq('institucion_id', institucionId)
          .neq('estado', 'ANULADO')
          .range(desde, hasta)
        if (err1) throw err1
        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas1 = false
        } else {
          todosPagos = [...todosPagos, ...pagosBloques]
          pagina1++
        }
      }

      let pagina2 = 0
      let tieneRangoMas2 = true
      while (tieneRangoMas2) {
        const desde = pagina2 * 1000
        const hasta = desde + 999
        const { data: pagosMulBloques, error: err2 } = await supabase
          .from('pagos_multiples_detalle')
          .select(`id, concepto_id, monto_pagado, pagos_multiples!inner(estudiante_id, estado, institucion_id)`)
          .eq('pagos_multiples.institucion_id', institucionId)
          .neq('pagos_multiples.estado', 'ANULADO')
          .range(desde, hasta)
        if (err2) throw err2
        if (!pagosMulBloques || pagosMulBloques.length === 0) {
          tieneRangoMas2 = false
        } else {
          pagosMulBloques.forEach((p: any) => {
            todosPagos.push({
              id: p.id,
              estudiante_id: p.pagos_multiples?.estudiante_id,
              concepto_id: p.concepto_id,
              monto_pagado: p.monto_pagado,
              estado: p.pagos_multiples?.estado || 'PAGADO'
            })
          })
          pagina2++
        }
      }

      const pagosValidos = todosPagos
      console.log('[REPORTES] Pagos válidos:', pagosValidos.length)

      const conceptosVencidosMoraLocal = conceptosVencidos.filter(c => {
        if (c.mes && c.año) {
          if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false
          if (c.año < anioVencidoActual) return true
          if (c.año === anioVencidoActual && c.mes <= mesVencidoActual) return true
        }
        return false
      })

      let totalRecaudable = 0
      let totalRecaudado = 0
      let estudiantesEnMora = 0
      const conceptoPorEstudiante = new Map<number, number>()

      estudiantesPorCarrera.forEach((cantEstudiantes, carreraId) => {
        const inscripcionCarrera = inscripciones.find(c => c.carrera_id === carreraId)
        if (inscripcionCarrera) {
          totalRecaudable += inscripcionCarrera.monto * cantEstudiantes
        }
        
        const cuotasCarrera = conceptosVencidos.filter(c => c.carrera_id === carreraId && c.tipo?.toUpperCase() === 'CUOTA')
        cuotasCarrera.forEach(c => {
          totalRecaudable += c.monto * cantEstudiantes
        })
        
        const segurosCarrera = conceptosVencidos.filter(c => c.carrera_id === carreraId && c.tipo?.toUpperCase() === 'SEGURO')
        segurosCarrera.forEach(c => {
          totalRecaudable += c.monto * cantEstudiantes
        })
      })

      estudiantesActivos.forEach(est => {
        const esBecado50 = est.estado === 'BECADO_50'
        const esBecado100 = est.estado === 'BECADO_100'
        
        if (esBecado50 || esBecado100) {
          const cuotasEst = conceptosVencidos.filter(c => c.carrera_id === est.carrera_id && c.tipo?.toUpperCase() === 'CUOTA')
          const segurosEst = conceptosVencidos.filter(c => c.carrera_id === est.carrera_id && c.tipo?.toUpperCase() === 'SEGURO')
          
          const montoDescontar = (
            cuotasEst.reduce((sum, c) => sum + c.monto, 0) + 
            segurosEst.reduce((sum, c) => sum + c.monto, 0)
          ) * (esBecado50 ? 0.5 : 1)
          
          totalRecaudable -= montoDescontar
        }
      })

      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        const esBecado100 = est.estado === 'BECADO_100'
        const esBecado50 = est.estado === 'BECADO_50'
        
        conceptosVencidos.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          
          const montoPago = pagosValidos.find(p => p.estudiante_id === est.id && p.concepto_id === concepto.id)?.monto_pagado || 0
          const montoOriginal = concepto.monto
          const aplicaBeca = esConceptoBeca(concepto.tipo)
          
          if (esBecado100 && aplicaBeca) {
            return
          }
          
          let montoAResponsabilidad = montoOriginal
          if (esBecado50 && aplicaBeca) {
            montoAResponsabilidad = montoOriginal * 0.5
          }
          
          const deudaDelConcepto = montoAResponsabilidad - montoPago
          if (deudaDelConcepto > 0) {
            deudaEst += deudaDelConcepto
          }
        })
        
        if (deudaEst > 0 && !esBecado100) {
          conceptoPorEstudiante.set(est.id, deudaEst)
          estudiantesEnMora++
        }
      })

      totalRecaudado = pagosValidos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)

      const porcentajeCobro = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const pendiente = Math.max(0, totalRecaudable - totalRecaudado)

      // RESUMEN EJECUTIVO - PARTE MES ACTUAL
      // FIX: Sumar TODAS las cuotas/seguros UNA SOLA VEZ, luego multiplicar por meses * estudiantes
      let totalRecaudableMesActual = 0
      let estudiantesEnMoraMesActual = 0
      
      const numeroMesesAcademicos = Math.max(0, mesActual - PRIMER_MES_ACADEMICO + 1)
      console.log('[DEBUG MES ACTUAL] diaActual:', diaActual, 'mesActual:', mesActual, 'numeroMesesAcademicos:', numeroMesesAcademicos, 'recaudable_a�o:', totalRecaudable)

      estudiantesPorCarrera.forEach((cantEstudiantes, carreraId) => {
        // INSCRIPCION: 1 por estudiante
        const inscripcionCarrera = inscripciones.find(c => c.carrera_id === carreraId)
        if (inscripcionCarrera) {
          totalRecaudableMesActual += inscripcionCarrera.monto * cantEstudiantes
        }
        
        // CUOTAS: sumar TODAS y multiplicar UNA SOLA VEZ
        const cuotasCarrera = conceptosVencidos.filter(c => 
          c.carrera_id === carreraId && 
          c.tipo?.toUpperCase() === 'CUOTA'
        )
        const sumaCuotasCarrera = cuotasCarrera.reduce((sum, c) => sum + c.monto, 0)
        totalRecaudableMesActual += sumaCuotasCarrera * cantEstudiantes * numeroMesesAcademicos
        
        // SEGUROS: sumar TODAS y multiplicar UNA SOLA VEZ
        const segurosCarrera = conceptosVencidos.filter(c => 
          c.carrera_id === carreraId && 
          c.tipo?.toUpperCase() === 'SEGURO'
        )
        const sumaSegurosCarrera = segurosCarrera.reduce((sum, c) => sum + c.monto, 0)
        totalRecaudableMesActual += sumaSegurosCarrera * cantEstudiantes * numeroMesesAcademicos
      })

      estudiantesActivos.forEach(est => {
        const esBecado50 = est.estado === 'BECADO_50'
        const esBecado100 = est.estado === 'BECADO_100'
        
        if (esBecado50 || esBecado100) {
          const cuotasEst = conceptosVencidos.filter(c => 
            c.carrera_id === est.carrera_id && 
            c.tipo?.toUpperCase() === 'CUOTA'
          )
          const segurosEst = conceptosVencidos.filter(c => 
            c.carrera_id === est.carrera_id && 
            c.tipo?.toUpperCase() === 'SEGURO'
          )
          
          const montoDescontar = (
            cuotasEst.reduce((sum, c) => sum + c.monto, 0) + 
            segurosEst.reduce((sum, c) => sum + c.monto, 0)
          ) * numeroMesesAcademicos * (esBecado50 ? 0.5 : 1)
          
          totalRecaudableMesActual -= montoDescontar
        }
      })

      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        const esBecado100 = est.estado === 'BECADO_100'
        const esBecado50 = est.estado === 'BECADO_50'
        
        const conceptosMesActual = conceptosFiltrados.filter(c => 
          c.carrera_id === est.carrera_id &&
          (c.tipo?.toUpperCase() === 'INSCRIPCION' || 
           (c.tipo?.toUpperCase() === 'CUOTA' && c.mes && c.mes <= mesActual) ||
           (c.tipo?.toUpperCase() === 'SEGURO' && c.mes && c.mes <= mesActual))
        )
        
        conceptosMesActual.forEach(concepto => {
          const montoPago = pagosValidos.find(p => p.estudiante_id === est.id && p.concepto_id === concepto.id)?.monto_pagado || 0
          const montoOriginal = concepto.monto
          const aplicaBeca = esConceptoBeca(concepto.tipo)
          
          if (esBecado100 && aplicaBeca) {
            return
          }
          
          let montoAResponsabilidad = montoOriginal
          if (esBecado50 && aplicaBeca) {
            montoAResponsabilidad = montoOriginal * 0.5
          }
          
          const deudaDelConcepto = montoAResponsabilidad - montoPago
          if (deudaDelConcepto > 0) {
            deudaEst += deudaDelConcepto
          }
        })
        
        if (deudaEst > 0 && !esBecado100) {
          estudiantesEnMoraMesActual++
        }
      })
      
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
      const totalRecaudadoMesActual = pagosValidosMesActual.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
      const porcentajeCobroMesActual = totalRecaudableMesActual > 0 ? (totalRecaudadoMesActual / totalRecaudableMesActual) * 100 : 0
      const pendienteMesActual = Math.max(0, totalRecaudableMesActual - totalRecaudadoMesActual)
      console.log('[DEBUG CALCULO MES ACTUAL] totalRecaudableMesActual:', totalRecaudableMesActual, 'totalRecaudadoMesActual:', totalRecaudadoMesActual)

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

      const carreras = new Map<number, any>()
      estudiantesActivos.forEach(est => {
        if (!carreras.has(est.carrera_id)) {
          carreras.set(est.carrera_id, {
            carrera_id: est.carrera_id,
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            estudiantes: [],
          })
        }
        carreras.get(est.carrera_id)!.estudiantes.push(est.id)
      })

      const reportePorCar: ReportePorCarrera[] = Array.from(carreras.values()).map(carr => {
        const estCarrera = carr.estudiantes || []
        let recaudadoCarrera = 0
        let enMoraCarrera = 0

        pagosValidos.forEach(pago => {
          if (estCarrera.includes(pago.estudiante_id)) {
            recaudadoCarrera += pago.monto_pagado || 0
          }
        })

        estCarrera.forEach(estId => {
          if (conceptoPorEstudiante.has(estId)) {
            enMoraCarrera++
          }
        })

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

      const reporteMeses: ReporteMesAMes[] = []
      
      if (reportePorCar && reportePorCar.length > 0) {
        for (const carr of reportePorCar) {
          try {
            if (!carr || !carr.carrera_id) continue
            
            const estCarrera = carr.total_estudiantes || 0
            if (estCarrera === 0) continue
            
            const inscripcionesCarrera = inscripciones.filter(c => c && c.carrera_id === carr.carrera_id)
            const conceptosVencidosCarrera = conceptosVencidos.filter(c => c && c.carrera_id === carr.carrera_id)
            
            const inscripcionDeberia = inscripcionesCarrera.reduce((sum, c) => sum + ((c?.monto || 0) * estCarrera), 0)
            const cuotasDeberia = conceptosVencidosCarrera
              .filter(c => c?.tipo?.toUpperCase() === 'CUOTA')
              .reduce((sum, c) => sum + ((c?.monto || 0) * estCarrera), 0)
            const seguroDeberia = conceptosVencidosCarrera
              .filter(c => c?.tipo?.toUpperCase() === 'SEGURO')
              .reduce((sum, c) => sum + ((c?.monto || 0) * estCarrera), 0)
            
            const totalDeberia = inscripcionDeberia + cuotasDeberia + seguroDeberia

            const conceptosFiltradosCarrera = [...inscripcionesCarrera, ...conceptosVencidosCarrera]
            const conceptosIds = conceptosFiltradosCarrera.map(c => c?.id).filter(Boolean)
            const pagosCarrera = pagosValidos.filter(p => conceptosIds.includes(p.concepto_id))
            const cobradoReal = pagosCarrera.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)

            reporteMeses.push({
              carrera: carr.carrera || 'Sin nombre',
              cantidad_estudiantes: estCarrera,
              mes_actual: mesActual,
              mes_nombre: mesActualNombre,
              inscripcion_deberia: inscripcionDeberia,
              cuotas_deberia: cuotasDeberia,
              seguro_deberia: seguroDeberia,
              deberia_cobrar_total: totalDeberia,
              cobre_real_total: cobradoReal,
              diferencia: cobradoReal - totalDeberia,
              estado_diferencia: cobradoReal >= totalDeberia ? 'SUPERADO' : 'FALTA',
              porcentaje_cumplimiento: totalDeberia > 0 ? (cobradoReal / totalDeberia) * 100 : 0,
            })
          } catch (errCarrera) {
            console.error('[REPORTES] Error procesando carrera:', carr?.carrera_id, errCarrera)
            continue
          }
        }
      }

      setReporteMesAMes(reporteMeses)

      const morosos: TopEstudiantesMora[] = []
      estudiantesActivos.forEach(est => {
        let deudaMora = 0
        conceptosVencidosMoraLocal.forEach(c => {
          if (c.carrera_id !== est.carrera_id) return
          const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === c.id && (p.monto_pagado || 0) >= (c.monto || 0))
          if (!tienePago) {
            deudaMora += c.monto || 0
          }
        })
        
        if (deudaMora > 0) {
          const conceptosPorMes = new Map<string, any[]>()
          
          conceptosVencidosMoraLocal.forEach(c => {
            if (c.carrera_id !== est.carrera_id) return
            const mesKey = (c.mes && c.año) ? `${c.año}-${c.mes}` : 'INSCRIPCION'
            if (!conceptosPorMes.has(mesKey)) {
              conceptosPorMes.set(mesKey, [])
            }
            conceptosPorMes.get(mesKey)!.push(c)
          })
          
          let mesesConDeuda = 0
          let conceptosAdeudadosTotal = 0
          
          conceptosPorMes.forEach((conceptosDelMes) => {
            let tieneDeudaEnMes = false
            
            conceptosDelMes.forEach(c => {
              const tienePago = pagosValidos.some(p => p.estudiante_id === est.id && p.concepto_id === c.id && (p.monto_pagado || 0) >= (c.monto || 0))
              if (!tienePago) {
                tieneDeudaEnMes = true
                conceptosAdeudadosTotal++
              }
            })
            
            if (tieneDeudaEnMes) {
              mesesConDeuda++
            }
          })

          morosos.push({
            ranking: 0,
            dni: est.dni || '',
            nombre_completo: `${est.nombre || ''} ${est.apellido || ''}`.trim(),
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

      const conceptosPorVencer = (conceptos || []).filter(c => {
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) return false
        if (c.mes && c.año) {
          if (c.año > anioActual) return true
          if (c.año === anioActual && c.mes > mesActual) return true
        }
        return false
      })
      
      let recaudablePorVencer = 0
      Array.from(estudiantesPorCarrera.entries()).forEach(([carreraId]) => {
        const estudiantesNoBecadosCarrera = estudiantesActivos.filter(e => 
          e.carrera_id === carreraId && e.estado !== 'BECADO_100' && e.estado !== 'BECADO_50'
        ).length
        
        const conceptosPorVencerCarrera = conceptosPorVencer.filter(c => c.carrera_id === carreraId)
        const sumaConceptosPorVencer = conceptosPorVencerCarrera.reduce((sum, c) => sum + (c.monto || 0), 0)
        
        recaudablePorVencer += sumaConceptosPorVencer * estudiantesNoBecadosCarrera
      })
      const recaudableAnualTotal = totalRecaudable + recaudablePorVencer
      
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

      const fechaInicio = new Date(anioActual, 0, 1).toISOString().split('T')[0]
      const fechaFin = new Date().toISOString().split('T')[0]
      
      if (institucionId === 2) {
        const { data: gastosData } = await supabase
          .from('gastos')
          .select('monto, fecha_gasto')
          .eq('institucion_id', 2)
          .gte('fecha_gasto', fechaInicio)
          .lte('fecha_gasto', fechaFin)

        if (gastosData && gastosData.length > 0) {
          const total = gastosData.reduce((sum, g) => sum + (g.monto || 0), 0)
          setTotalGastos(total)
        }

        const totalVentasIns = await obtenerTotalVentasPeriodo(institucionId, fechaInicio, fechaFin)
        setTotalVentasInsumos(totalVentasIns || 0)

        const { data: cajaGrandeData } = await supabase
          .from('caja_grande')
          .select('monto, fecha_gasto')
          .eq('institucion_id', 2)
          .gte('fecha_gasto', fechaInicio)
          .lte('fecha_gasto', fechaFin)

        if (cajaGrandeData && cajaGrandeData.length > 0) {
          const total = cajaGrandeData.reduce((sum, c) => sum + (c.monto || 0), 0)
          setTotalVentasKiosco(total)
        }
      } else if (institucionId === 1) {
        const { data: gastosDataISIP } = await supabase
          .from('gastos')
          .select('monto, fecha_gasto')
          .eq('institucion_id', 1)
          .gte('fecha_gasto', fechaInicio)
          .lte('fecha_gasto', fechaFin)

        if (gastosDataISIP && gastosDataISIP.length > 0) {
          const total = gastosDataISIP.reduce((sum, g) => sum + (g.monto || 0), 0)
          setTotalGastos(total)
        }
        setTotalVentasInsumos(0)
        setTotalVentasKiosco(0)
      }

      const desgloseMap = new Map<string, { esperado: number; cobrado: number; conceptos: Set<number> }>()
      
      desgloseMap.set('INSCRIPCION', { esperado: 0, cobrado: 0, conceptos: new Set<number>() })
      desgloseMap.set('CUOTA', { esperado: 0, cobrado: 0, conceptos: new Set<number>() })
      desgloseMap.set('SEGURO', { esperado: 0, cobrado: 0, conceptos: new Set<number>() })
      
      estudiantesActivos.forEach(est => {
        const inscripcionCarrera = inscripciones.find(c => c.carrera_id === est.carrera_id)
        if (inscripcionCarrera) {
          const inscripcionEst = desgloseMap.get('INSCRIPCION')!
          inscripcionEst.esperado += inscripcionCarrera.monto
          inscripcionEst.conceptos.add(inscripcionCarrera.id)
        }
      })
      
      const cuotas = conceptosVencidos.filter(c => c.tipo?.toUpperCase() === 'CUOTA')
      cuotas.forEach(c => {
        const cuotaEst = desgloseMap.get('CUOTA')!
        const cantEstudiantes = estudiantesActivos.filter(e => e.carrera_id === c.carrera_id).length
        cuotaEst.esperado += c.monto * cantEstudiantes
        cuotaEst.conceptos.add(c.id)
      })
      
      const seguros = conceptosVencidos.filter(c => c.tipo?.toUpperCase() === 'SEGURO')
      seguros.forEach(c => {
        const seguroEst = desgloseMap.get('SEGURO')!
        const cantEstudiantes = estudiantesActivos.filter(e => e.carrera_id === c.carrera_id).length
        seguroEst.esperado += c.monto * cantEstudiantes
        seguroEst.conceptos.add(c.id)
      })
      
      pagosValidos.forEach(p => {
        const concepto = conceptosFiltrados.find(c => c.id === p.concepto_id)
        if (!concepto) return
        const tipo = concepto.tipo?.toUpperCase() || 'OTRO'
        if (!desgloseMap.has(tipo)) {
          desgloseMap.set(tipo, { esperado: 0, cobrado: 0, conceptos: new Set<number>() })
        }
        const est = desgloseMap.get(tipo)!
        est.cobrado += p.monto_pagado || 0
      })
      
      const desgloseConceptosArray: DesgloseConcepto[] = Array.from(desgloseMap.entries())
        .filter(([, data]) => data.esperado > 0)
        .map(([tipo, data]) => ({
          tipo,
          total_esperado: data.esperado,
          total_cobrado: data.cobrado,
          total_pendiente: Math.max(0, data.esperado - data.cobrado),
          porcentaje_cobro: data.esperado > 0 ? (data.cobrado / data.esperado) * 100 : 0,
          cantidad_conceptos: data.conceptos.size
        }))
      
      setDesgloseConceptos(desgloseConceptosArray)
      console.log('[REPORTES] Desglose conceptos (institucion_id=' + institucionId + '):', desgloseConceptosArray)
      
      const estudianteAlDiaArray: EstudianteAlDia[] = []
      
      estudiantesActivos.forEach(est => {
        let totalResponsable = 0
        let totalPagado = 0
        
        conceptosVencidosMoraLocal.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          
          const montoPago = pagosValidos.find(p => p.estudiante_id === est.id && p.concepto_id === concepto.id)?.monto_pagado || 0
          const montoOriginal = concepto.monto
          const aplicaBeca = esConceptoBeca(concepto.tipo)
          const esBecado100 = est.estado === 'BECADO_100'
          const esBecado50 = est.estado === 'BECADO_50'
          
          let montoResponsable = montoOriginal
          
          if (esBecado100 && aplicaBeca) {
            return
          }
          if (esBecado50 && aplicaBeca) {
            montoResponsable = montoOriginal * 0.5
          }
          
          totalResponsable += montoResponsable
          totalPagado += montoPago
        })
        
        if (totalResponsable > 0 && totalPagado >= totalResponsable) {
          estudianteAlDiaArray.push({
            id: est.id,
            dni: est.dni || '',
            nombre_completo: `${est.nombre || ''} ${est.apellido || ''}`.trim(),
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            total_responsable: totalResponsable,
            total_pagado: totalPagado,
            estado_pago: 'AL_DIA',
            porcentaje_pagado: totalResponsable > 0 ? (totalPagado / totalResponsable) * 100 : 0
          })
        }
      })
      
      setEstudiantesAlDia(estudianteAlDiaArray)
      console.log('[REPORTES] Estudiantes al día:', estudianteAlDiaArray.length)

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
    desgloseConceptos,
    estudiantesAlDia,
    loading,
    error,
    refrescar: cargarReportes,
    totalGastos,
    totalVentasInsumos,
    totalVentasKiosco,
  }
}
