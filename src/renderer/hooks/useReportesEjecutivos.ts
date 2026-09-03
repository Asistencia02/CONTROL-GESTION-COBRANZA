import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { useVentasInsumos } from '@renderer/hooks/useVentasInsumos'

// ========== INTERFACES ==========
export interface MetricaInstitucion {
  recaudoAnual: number
  recaudoMesActual: number
  adeudadoAnual: number
  adeudadoMesActual: number
  gastosAnual: number
  gastosMesActual: number
  netoAnual: number
  netoMesActual: number
  eficiencia: number
  mora: number
  margenNeto: number
  costoPorEstudiante: number
  ingresoPorEstudiante: number
  totalEstudiantes: number
  estudiantesMora: number
  ventasInsumos?: number
  ventasKiosco?: number
}

export interface Alerta {
  id: string
  tipo: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BUENA'
  titulo: string
  descripcion: string
  instituo?: string
  accion?: string
}

export interface FlujoCajaMes {
  mes: number
  mesNombre: string
  entra: number
  sale: number
  neto: number
  acumulado: number
}

export interface Rentabilidad {
  margenBruto: number
  margenNeto: number
  costoPorEstudiante: number
  ingresoPorEstudiante: number
  gastoPct: number
  roiEstimado: number
}

export interface DesglosePorCarrera {
  carreraId: number
  carrera: string
  estudiantes: number
  recaudable: number
  recaudado: number
  deuda: number
  eficiencia: number
  mora: number
}

export interface TopMoroso {
  ranking: number
  dni: string
  nombre: string
  carrera: string
  deuda: number
  mesesEnMora: number
  institucion: string
}

export interface Consolidado {
  recaudoTotal: number
  adeudadoTotal: number
  gastosTotal: number
  netoTotal: number
  dineroParaMejoras: number
  saludFinanciera: number
  totalEstudiantes: number
  totalMorosos: number
  porcentajeMora: number
}

export interface ReportesEjecutivosData {
  consolidado: Consolidado
  isipp: MetricaInstitucion & {
    porCarrera: DesglosePorCarrera[]
    topMorosos: TopMoroso[]
    gastosPorCategoria: Record<string, number>
  }
  milagros: MetricaInstitucion & {
    porCarrera: DesglosePorCarrera[]
    topMorosos: TopMoroso[]
    gastosPorCategoria: Record<string, number>
  }
  comparativa: {
    eficienciaDif: number
    moraDif: number
    netoPerStudenteDif: number
    institucionMejor: string
    recomendaciones: string[]
  }
  flujoCaja: FlujoCajaMes[]
  rentabilidad: {
    isipp: Rentabilidad
    milagros: Rentabilidad
    oportunidades: string[]
  }
  alertas: Alerta[]
  loading: boolean
  error: string | null
}

// ========== HOOK PRINCIPAL ==========
export const useReportesEjecutivos = () => {
  const { obtenerTotalVentasPeriodo } = useVentasInsumos()
  const [data, setData] = useState<ReportesEjecutivosData>({
    consolidado: {
      recaudoTotal: 0,
      adeudadoTotal: 0,
      gastosTotal: 0,
      netoTotal: 0,
      dineroParaMejoras: 0,
      saludFinanciera: 0,
      totalEstudiantes: 0,
      totalMorosos: 0,
      porcentajeMora: 0,
    },
    isipp: {
      recaudoAnual: 0,
      recaudoMesActual: 0,
      adeudadoAnual: 0,
      adeudadoMesActual: 0,
      gastosAnual: 0,
      gastosMesActual: 0,
      netoAnual: 0,
      netoMesActual: 0,
      eficiencia: 0,
      mora: 0,
      margenNeto: 0,
      costoPorEstudiante: 0,
      ingresoPorEstudiante: 0,
      totalEstudiantes: 0,
      estudiantesMora: 0,
      porCarrera: [],
      topMorosos: [],
      gastosPorCategoria: {},
    },
    milagros: {
      recaudoAnual: 0,
      recaudoMesActual: 0,
      adeudadoAnual: 0,
      adeudadoMesActual: 0,
      gastosAnual: 0,
      gastosMesActual: 0,
      netoAnual: 0,
      netoMesActual: 0,
      eficiencia: 0,
      mora: 0,
      margenNeto: 0,
      costoPorEstudiante: 0,
      ingresoPorEstudiante: 0,
      totalEstudiantes: 0,
      estudiantesMora: 0,
      ventasInsumos: 0,
      ventasKiosco: 0,
      porCarrera: [],
      topMorosos: [],
      gastosPorCategoria: {},
    },
    comparativa: {
      eficienciaDif: 0,
      moraDif: 0,
      netoPerStudenteDif: 0,
      institucionMejor: '',
      recomendaciones: [],
    },
    flujoCaja: [],
    rentabilidad: {
      isipp: {
        margenBruto: 0,
        margenNeto: 0,
        costoPorEstudiante: 0,
        ingresoPorEstudiante: 0,
        gastoPct: 0,
        roiEstimado: 0,
      },
      milagros: {
        margenBruto: 0,
        margenNeto: 0,
        costoPorEstudiante: 0,
        ingresoPorEstudiante: 0,
        gastoPct: 0,
        roiEstimado: 0,
      },
      oportunidades: [],
    },
    alertas: [],
    loading: true,
    error: null,
  })

  const calcularMetricasInstitucion = async (institucionId: number): Promise<MetricaInstitucion & { porCarrera: DesglosePorCarrera[], topMorosos: TopMoroso[], gastosPorCategoria: Record<string, number> }> => {
    try {
      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()
      const diaActual = today.getDate()

      // ========== ESTUDIANTES ==========
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, carreras(nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst
      const estudiantesActivos = estudiantes || []
      const totalEstudiantes = estudiantesActivos.length

      // ========== CONCEPTOS ==========
      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      const inscripciones = (conceptos || []).filter(c =>
        c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)
      )

      const conceptosVencidos = (conceptos || []).filter(c => {
        if (c.mes && c.año) {
          if (c.año < anioActual) return true
          if (c.año === anioActual) {
            if (c.mes < mesActual) return true
            if (c.mes === mesActual && diaActual > 10) return true
          }
          return false
        } else {
          return true
        }
      })

      const conceptosFiltrados = [...inscripciones, ...conceptosVencidos]

      // ========== PAGOS ==========
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('id, estudiante_id, concepto_id, monto_pagado, estado')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (errPagos) throw errPagos

      const { data: pagosMultiples, error: errPagosMultiples } = await supabase
        .from('pagos_multiples_detalle')
        .select('id, concepto_id, monto_pagado, pagos_multiples!inner(estudiante_id, estado, institucion_id)')
        .eq('pagos_multiples.institucion_id', institucionId)
        .neq('pagos_multiples.estado', 'ANULADO')

      if (errPagosMultiples) throw errPagosMultiples

      const pagosMultiplesFormato = (pagosMultiples || []).map((p: any) => ({
        id: p.id,
        estudiante_id: p.pagos_multiples?.estudiante_id,
        concepto_id: p.concepto_id,
        monto_pagado: p.monto_pagado,
        estado: p.pagos_multiples?.estado || 'PAGADO'
      }))

      const pagosValidos = [...(pagos || []), ...pagosMultiplesFormato]

      // ========== GASTOS ==========
      const { data: gastosData, error: errGastos } = await supabase
        .from('gastos')
        .select('*')
        .eq('institucion_id', institucionId)

      if (errGastos) throw errGastos

      const gastosArray = gastosData || []
      const gastosAnual = gastosArray.reduce((sum, g) => sum + (g.monto || 0), 0)
      const gastosMesActual = gastosArray
        .filter(g => {
          const fecha = new Date(g.fecha_gasto)
          return fecha.getMonth() + 1 === mesActual && fecha.getFullYear() === anioActual
        })
        .reduce((sum, g) => sum + (g.monto || 0), 0)

      const gastosPorCategoria: Record<string, number> = {}
      gastosArray.forEach(g => {
        gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.monto
      })

      // ========== CALCULAR METRICAS ANUAL ==========
      let totalRecaudable = 0
      let totalRecaudado = 0
      let estudiantesEnMora = 0

      // Calcular deuda: AL DIA = pago TODOS los conceptos vencidos
      const deudaPorEstudiante = new Map<number, number>()
      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        let tieneDeuda = false
        conceptosVencidos.forEach(concepto => {
          if (concepto.carrera_id !== est.carrera_id) return
          const totalPagado = pagosValidos.filter(p => p.estudiante_id === est.id && p.concepto_id === concepto.id).reduce((sum, p) => sum + p.monto_pagado, 0)
          const deudaConcepto = Math.max(0, concepto.monto - totalPagado)
          deudaEst += deudaConcepto
          if (deudaConcepto > 0) tieneDeuda = true
        })
        deudaPorEstudiante.set(est.id, deudaEst)
        if (tieneDeuda) {
          estudiantesEnMora++
        }
      })

      // Calcular totalRecaudable: cada estudiante tiene conceptos por su carrera
      estudiantesActivos.forEach(est => {
        conceptosFiltrados.forEach(c => {
          if (c.carrera_id === est.carrera_id) {
            totalRecaudable += c.monto
          }
        })
      })

      // Calcular totalRecaudado: suma de todos los pagos registrados
      totalRecaudado = pagosValidos.reduce((sum, p) => sum + p.monto_pagado, 0)

      const adeudadoAnual = Math.max(0, totalRecaudable - totalRecaudado)
      const netoAnual = totalRecaudado - gastosAnual
      const eficiencia = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const mora = totalEstudiantes > 0 ? (estudiantesEnMora / totalEstudiantes) * 100 : 0
      const margenNeto = totalRecaudado > 0 ? (netoAnual / totalRecaudado) * 100 : 0
      const costoPorEstudiante = totalEstudiantes > 0 ? gastosAnual / totalEstudiantes : 0
      const ingresoPorEstudiante = totalEstudiantes > 0 ? totalRecaudado / totalEstudiantes : 0

      // ========== CALCULAR MES ACTUAL ==========
      const conceptosAntesdeMesActual = conceptosFiltrados.filter(c => {
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) return false
        if (c.mes && c.año) {
          if (c.año < anioActual) return true
          if (c.año === anioActual && c.mes < mesActual) return true
        }
        return false
      })

      let totalRecaudableMesActual = 0
      estudiantesActivos.forEach(est => {
        const conceptosDelEstudiante = conceptosAntesdeMesActual.filter(c => c.carrera_id === est.carrera_id)
        conceptosDelEstudiante.forEach(c => {
          totalRecaudableMesActual += c.monto
        })
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
      const recaudoMesActual = pagosValidosMesActual.reduce((sum, p) => sum + p.monto_pagado, 0)
      const adeudadoMesActual = Math.max(0, totalRecaudableMesActual - recaudoMesActual)
      const netoMesActual = recaudoMesActual - gastosMesActual

      // ========== POR CARRERA ==========
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

      const porCarrera: DesglosePorCarrera[] = Array.from(carreras.values()).map(carr => {
        const estCarrera = carr.estudiantes
        let recaudadoCarrera = 0
        let enMoraCarrera = 0
        let deudaCarrera = 0

        pagosValidos.forEach(pago => {
          if (estCarrera.includes(pago.estudiante_id)) {
            recaudadoCarrera += pago.monto_pagado
          }
        })

        estCarrera.forEach(estId => {
          let deudaEst = 0
          let tieneDeuda = false
          conceptosVencidos.forEach(c => {
            if (c.carrera_id !== carr.carrera_id) return
            const est = estudiantesActivos.find(e => e.id === estId)
            if (!est || est.carrera_id !== carr.carrera_id) return
            const totalPagado = pagosValidos.filter(p => p.estudiante_id === estId && p.concepto_id === c.id).reduce((sum, p) => sum + p.monto_pagado, 0)
            const deudaConcepto = Math.max(0, c.monto - totalPagado)
            deudaEst += deudaConcepto
            if (deudaConcepto > 0) tieneDeuda = true
          })
          if (tieneDeuda) {
            enMoraCarrera++
            deudaCarrera += deudaEst
          }
        })

        const recaudableCarrera = conceptosFiltrados
          .filter(c => c.carrera_id === carr.carrera_id)
          .reduce((sum, c) => sum + (c.monto * estCarrera.length), 0)

        const eficienciaCarrera = recaudableCarrera > 0 ? (recaudadoCarrera / recaudableCarrera) * 100 : 0
        const moraCarrera = estCarrera.length > 0 ? (enMoraCarrera / estCarrera.length) * 100 : 0

        return {
          carreraId: carr.carrera_id,
          carrera: carr.carrera,
          estudiantes: estCarrera.length,
          recaudable: recaudableCarrera,
          recaudado: recaudadoCarrera,
          deuda: deudaCarrera,
          eficiencia: parseFloat(eficienciaCarrera.toFixed(1)),
          mora: parseFloat(moraCarrera.toFixed(1)),
        }
      })

      // ========== TOP MOROSOS ==========
      const morosos: TopMoroso[] = []
      estudiantesActivos.forEach(est => {
        const deudaEst = deudaPorEstudiante.get(est.id) || 0
        if (deudaEst > 0) {
          // Calcular meses en mora
          let mesesEnMora = 1
          conceptosVencidos.forEach(c => {
            if (c.carrera_id === est.carrera_id) {
              const totalPagado = pagosValidos.filter(p => p.estudiante_id === est.id && p.concepto_id === c.id).reduce((sum, p) => sum + p.monto_pagado, 0)
              const deudaConcepto = Math.max(0, c.monto - totalPagado)
              if (deudaConcepto > 0 && c.mes && c.año) {
                mesesEnMora = Math.max(mesesEnMora, mesActual - c.mes + (anioActual - c.año) * 12)
              }
            }
          })

          morosos.push({
            ranking: 0,
            dni: est.dni || '',
            nombre: `${est.nombre} ${est.apellido}`,
            carrera: (est as any).carreras?.nombre || '',
            deuda: deudaEst,
            mesesEnMora,
            institucion: institucionId === 1 ? 'ISIPP' : 'Milagros',
          })
        }
      })

      morosos.sort((a, b) => b.deuda - a.deuda)
      morosos.forEach((m, idx) => m.ranking = idx + 1)

      return {
        recaudoAnual: totalRecaudado,
        recaudoMesActual,
        adeudadoAnual,
        adeudadoMesActual,
        gastosAnual,
        gastosMesActual,
        netoAnual,
        netoMesActual,
        eficiencia: parseFloat(eficiencia.toFixed(1)),
        mora: parseFloat(mora.toFixed(1)),
        margenNeto: parseFloat(margenNeto.toFixed(1)),
        costoPorEstudiante: parseFloat(costoPorEstudiante.toFixed(2)),
        ingresoPorEstudiante: parseFloat(ingresoPorEstudiante.toFixed(2)),
        totalEstudiantes,
        estudiantesMora: estudiantesEnMora,
        porCarrera,
        topMorosos: morosos.slice(0, 20),
        gastosPorCategoria,
      }
    } catch (err) {
      console.error(`[REPORTES] Error calculando metricas:`, err)
      throw err
    }
  }

  const generarAlertas = (isipp: any, milagros: any, consolidado: any): Alerta[] => {
    const alertas: Alerta[] = []

    // Alertas CRITICAS
    if (isipp.mora > 65) {
      alertas.push({
        id: 'mora-isipp',
        tipo: 'CRITICA',
        titulo: 'Mora Alta en ISIPP',
        descripcion: `Mora detectada en ${isipp.mora.toFixed(1)}% de estudiantes`,
        instituo: 'ISIPP',
        accion: 'Contactar top 10 morosos inmediatamente',
      })
    }

    if (milagros.mora > 65) {
      alertas.push({
        id: 'mora-milagros',
        tipo: 'CRITICA',
        titulo: 'Mora Alta en Milagros',
        descripcion: `Mora detectada en ${milagros.mora.toFixed(1)}% de estudiantes`,
        instituo: 'Milagros',
        accion: 'Contactar top 10 morosos inmediatamente',
      })
    }

    if (isipp.eficiencia < 50) {
      alertas.push({
        id: 'eficiencia-isipp',
        tipo: 'CRITICA',
        titulo: 'Eficiencia Baja ISIPP',
        descripcion: `Eficiencia de cobranza: ${isipp.eficiencia.toFixed(1)}%`,
        instituo: 'ISIPP',
        accion: 'Revisar estrategia de cobranza',
      })
    }

    if (milagros.eficiencia < 50) {
      alertas.push({
        id: 'eficiencia-milagros',
        tipo: 'CRITICA',
        titulo: 'Eficiencia Baja Milagros',
        descripcion: `Eficiencia de cobranza: ${milagros.eficiencia.toFixed(1)}%`,
        instituo: 'Milagros',
        accion: 'Revisar estrategia de cobranza',
      })
    }

    // Alertas ALTAS
    if ((isipp.gastosAnual / isipp.recaudoAnual) * 100 > 30) {
      alertas.push({
        id: 'gastos-isipp',
        tipo: 'ALTA',
        titulo: 'Gastos Altos en ISIPP',
        descripcion: `Gastos representan ${((isipp.gastosAnual / isipp.recaudoAnual) * 100).toFixed(1)}% de recaudos`,
        instituo: 'ISIPP',
        accion: 'Revisar gastos - posible reduccion',
      })
    }

    if ((milagros.gastosAnual / milagros.recaudoAnual) * 100 > 30) {
      alertas.push({
        id: 'gastos-milagros',
        tipo: 'ALTA',
        titulo: 'Gastos Altos en Milagros',
        descripcion: `Gastos representan ${((milagros.gastosAnual / milagros.recaudoAnual) * 100).toFixed(1)}% de recaudos`,
        instituo: 'Milagros',
        accion: 'Revisar gastos - posible reduccion',
      })
    }

    // Alertas BUENAS
    if (consolidado.netoTotal > 500000) {
      alertas.push({
        id: 'neto-excelente',
        tipo: 'BUENA',
        titulo: 'Excelente Neto',
        descripcion: `Neto disponible: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(consolidado.netoTotal)}`,
        accion: 'Dinero disponible para reinversiones y mejoras',
      })
    }

    if (isipp.eficiencia > 75 && milagros.eficiencia > 75) {
      alertas.push({
        id: 'eficiencia-buena',
        tipo: 'BUENA',
        titulo: 'Cobranza Excelente',
        descripcion: 'Ambas instituciones con eficiencia > 75%',
        accion: 'Mantener ritmo de cobranza',
      })
    }

    return alertas.sort((a, b) => {
      const orden = { CRITICA: 0, ALTA: 1, MEDIA: 2, BUENA: 3 }
      return orden[a.tipo] - orden[b.tipo]
    })
  }

  const calcularFlujoCaja = (isipp: any, milagros: any): FlujoCajaMes[] => {
    const hoy = new Date()
    const anioActual = hoy.getFullYear()
    const mesesNombre = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    const flujoCaja: FlujoCajaMes[] = []
    let acumulado = 0

    // Proyectar marzo a diciembre
    for (let mes = 3; mes <= 12; mes++) {
      // Promedio mensual
      const recaudoPromedio = ((isipp.recaudoAnual + milagros.recaudoAnual) / 10) * 1.1 // 10% de margen de error
      const gastosPromedio = ((isipp.gastosAnual + milagros.gastosAnual) / 10)

      const neto = recaudoPromedio - gastosPromedio
      acumulado += neto

      flujoCaja.push({
        mes,
        mesNombre: mesesNombre[mes],
        entra: Math.round(recaudoPromedio),
        sale: Math.round(gastosPromedio),
        neto: Math.round(neto),
        acumulado: Math.round(acumulado),
      })
    }

    return flujoCaja
  }

  const cargarReportes = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      // Calcular ISIPP
      const isippData = await calcularMetricasInstitucion(1)

      // Calcular Milagros
      const milagrosData = await calcularMetricasInstitucion(2)

      // EXTRAS Milagros: Ventas
      const fechaInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
      const fechaFin = new Date().toISOString().split('T')[0]
      const ventasInsumosTotal = await obtenerTotalVentasPeriodo(2, fechaInicio, fechaFin)

      const { data: cajaGrandeData } = await supabase
        .from('caja_grande')
        .select('monto')
        .eq('institucion_id', 2)
        .gte('fecha_transferencia', fechaInicio)
        .lte('fecha_transferencia', fechaFin)

      const ventasKioscoTotal = (cajaGrandeData || []).reduce((sum: number, c: any) => sum + c.monto, 0)

      // Ajustar recaudos Milagros con ventas
      const milagrosAjustado = {
        ...milagrosData,
        recaudoAnual: milagrosData.recaudoAnual + ventasInsumosTotal + ventasKioscoTotal,
        netoAnual: (milagrosData.recaudoAnual + ventasInsumosTotal + ventasKioscoTotal) - milagrosData.gastosAnual,
        ventasInsumos: ventasInsumosTotal,
        ventasKiosco: ventasKioscoTotal,
      }

      // CONSOLIDADO
      const consolidado: Consolidado = {
        recaudoTotal: isippData.recaudoAnual + milagrosAjustado.recaudoAnual,
        adeudadoTotal: isippData.adeudadoAnual + milagrosData.adeudadoAnual,
        gastosTotal: isippData.gastosAnual + milagrosData.gastosAnual,
        netoTotal: isippData.netoAnual + milagrosAjustado.netoAnual,
        dineroParaMejoras: (isippData.netoAnual + milagrosAjustado.netoAnual) * 0.8,
        saludFinanciera: calculateHealthScore(isippData, milagrosAjustado),
        totalEstudiantes: isippData.totalEstudiantes + milagrosData.totalEstudiantes,
        totalMorosos: isippData.estudiantesMora + milagrosData.estudiantesMora,
        porcentajeMora: ((isippData.estudiantesMora + milagrosData.estudiantesMora) / (isippData.totalEstudiantes + milagrosData.totalEstudiantes)) * 100,
      }

      // COMPARATIVA
      const comparativa = {
        eficienciaDif: milagrosAjustado.eficiencia - isippData.eficiencia,
        moraDif: isippData.mora - milagrosAjustado.mora,
        netoPerStudenteDif: ((milagrosAjustado.netoAnual / milagrosData.totalEstudiantes) - (isippData.netoAnual / isippData.totalEstudiantes)) / (isippData.netoAnual / isippData.totalEstudiantes) * 100,
        institucionMejor: milagrosAjustado.eficiencia > isippData.eficiencia ? 'Milagros' : 'ISIPP',
        recomendaciones: generateRecommendations(isippData, milagrosAjustado),
      }

      // FLUJO CAJA
      const flujoCaja = calcularFlujoCaja(isippData, milagrosAjustado)

      // RENTABILIDAD
      const rentabilidad = {
        isipp: {
          margenBruto: (isippData.recaudoAnual / (isippData.recaudoAnual + isippData.adeudadoAnual)) * 100,
          margenNeto: isippData.margenNeto,
          costoPorEstudiante: isippData.costoPorEstudiante,
          ingresoPorEstudiante: isippData.ingresoPorEstudiante,
          gastoPct: (isippData.gastosAnual / isippData.recaudoAnual) * 100,
          roiEstimado: (isippData.netoAnual / isippData.gastosAnual) * 100,
        },
        milagros: {
          margenBruto: (milagrosAjustado.recaudoAnual / (milagrosAjustado.recaudoAnual + milagrosData.adeudadoAnual)) * 100,
          margenNeto: (milagrosAjustado.netoAnual / milagrosAjustado.recaudoAnual) * 100,
          costoPorEstudiante: milagrosData.costoPorEstudiante,
          ingresoPorEstudiante: milagrosData.ingresoPorEstudiante,
          gastoPct: (milagrosData.gastosAnual / milagrosAjustado.recaudoAnual) * 100,
          roiEstimado: (milagrosAjustado.netoAnual / milagrosData.gastosAnual) * 100,
        },
        oportunidades: [
          `${comparativa.institucionMejor} es mas eficiente (+${Math.abs(comparativa.eficienciaDif).toFixed(1)}%)`,
          `Dinero disponible para mejoras: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(consolidado.dineroParaMejoras)}`,
          `Top 10 morosos representa: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(isippData.topMorosos.slice(0, 10).reduce((s, m) => s + m.deuda, 0) + milagrosData.topMorosos.slice(0, 10).reduce((s, m) => s + m.deuda, 0))}`,
        ],
      }

      // ALERTAS
      const alertas = generarAlertas(isippData, milagrosAjustado, consolidado)

      setData({
        consolidado,
        isipp: isippData,
        milagros: milagrosAjustado,
        comparativa,
        flujoCaja,
        rentabilidad,
        alertas,
        loading: false,
        error: null,
      })
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setData(prev => ({ ...prev, loading: false, error: mensaje }))
      console.error('[REPORTES EJECUTIVOS] Error:', err)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

  return {
    ...data,
    refrescar: cargarReportes,
  }
}

// ========== HELPERS ==========
const calculateHealthScore = (isipp: any, milagros: any): number => {
  const scoreEficienciaISIPP = Math.min(isipp.eficiencia, 100) / 100 * 20
  const scoreEficienciaMilagros = Math.min(milagros.eficiencia, 100) / 100 * 20
  const scoreMoraISIPP = (100 - isipp.mora) / 100 * 15
  const scoreMoraMilagros = (100 - milagros.mora) / 100 * 15
  const scoreGastosISIPP = Math.max(0, (30 - (isipp.gastosAnual / isipp.recaudoAnual) * 100) / 30) * 15
  const scoreGastosMilagros = Math.max(0, (30 - (milagros.gastosAnual / milagros.recaudoAnual) * 100) / 30) * 15
  const scoreNetoISIPP = Math.min((isipp.margenNeto / 30) * 100, 100) / 100 * 15
  const scoreNetoMilagros = Math.min((milagros.margenNeto / 30) * 100, 100) / 100 * 15

  const total = scoreEficienciaISIPP + scoreEficienciaMilagros + scoreMoraISIPP + scoreMoraMilagros + scoreGastosISIPP + scoreGastosMilagros + scoreNetoISIPP + scoreNetoMilagros

  return Math.round(total)
}

const generateRecommendations = (isipp: any, milagros: any): string[] => {
  const recs: string[] = []

  if (milagros.eficiencia > isipp.eficiencia) {
    recs.push(`Milagros supera en eficiencia: aplicar modelo de cobranza`)
  }

  if ((isipp.gastosAnual / isipp.recaudoAnual) > (milagros.gastosAnual / milagros.recaudoAnual)) {
    recs.push(`ISIPP: reducir gastos 10% = +${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(isipp.gastosAnual * 0.1)} neto`)
  }

  if (isipp.mora > 50) {
    recs.push(`ISIPP: contactar top morosos para recuperar ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(isipp.topMorosos.slice(0, 10).reduce((s, m) => s + m.deuda, 0))}`)
  }

  if (milagros.mora > 50) {
    recs.push(`Milagros: estrategia de cobranza intensiva para recuperar ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(milagros.topMorosos.slice(0, 10).reduce((s, m) => s + m.deuda, 0))}`)
  }

  recs.push(`Dinero disponible para inversion: reinvertir en TI, infraestructura o publicidad`)

  return recs
}
