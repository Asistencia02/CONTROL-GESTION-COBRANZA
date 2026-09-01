import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface CierreDiario {
  fecha: string
  total_pagos: number
  cantidad_pagos: number
  total_deudas_vencidas: number
  total_estudiantes: number
  estudiantes_en_mora: number
  porcentaje_cobro: number
  resumen_por_metodo: Record<string, number>
  creado_en: string
}

export interface CierreAnual {
  año: number
  institucion_id: number
  total_pagos_anuales: number
  total_estudiantes_procesados: number
  total_deudas_anuales: number
  cantidad_cierres_diarios: number
  fecha_cierre: string
  archivo_backup: string
}

interface UseCierreStore {
  cierreDiario: CierreDiario | null
  cierreAnual: CierreAnual | null
  loading: boolean
  error: string | null

  crearCierreDiario: (institucion_id: number) => Promise<CierreDiario | null>
  crearCierreAnual: (institucion_id: number) => Promise<boolean>
  obtenerUltimoCierreDiario: (institucion_id: number) => Promise<CierreDiario | null>
  obtenerCierreDiarios: (institucion_id: number, fechaInicio: Date, fechaFin: Date) => Promise<CierreDiario[]>
}

export const useCierre = create<UseCierreStore>((set) => ({
  cierreDiario: null,
  cierreAnual: null,
  loading: false,
  error: null,

  obtenerUltimoCierreDiario: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('cierres_diarios')
        .select('*')
        .eq('institucion_id', institucion_id)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (!data) {
        console.log(`ℹ️ No hay cierres diarios para institución ${institucion_id}`)
        set({ cierreDiario: null })
        return null
      }

      const cierre: CierreDiario = {
        fecha: data.fecha,
        total_pagos: data.total_pagos,
        cantidad_pagos: data.cantidad_pagos,
        total_deudas_vencidas: data.total_deudas_vencidas,
        total_estudiantes: data.total_estudiantes,
        estudiantes_en_mora: data.estudiantes_en_mora,
        porcentaje_cobro: data.porcentaje_cobro,
        resumen_por_metodo: data.resumen_por_metodo || {},
        creado_en: data.created_at,
      }
      set({ cierreDiario: cierre })
      console.log(`✓ Cierre diario cargado: ${data.fecha}`)
      return cierre
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error obteniendo cierre'
      set({ error: message })
      console.error('Error obteniendo cierre:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  obtenerCierreDiarios: async (institucion_id: number, fechaInicio: Date, fechaFin: Date) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('cierres_diarios')
        .select('*')
        .eq('institucion_id', institucion_id)
        .gte('fecha', fechaInicio.toISOString().split('T')[0])
        .lte('fecha', fechaFin.toISOString().split('T')[0])
        .order('fecha', { ascending: false })

      if (error) throw error

      if (!data || data.length === 0) {
        console.log(`ℹ️ No hay cierres diarios en el rango especificado`)
        return []
      }

      const cierres: CierreDiario[] = data.map(c => ({
        fecha: c.fecha,
        total_pagos: c.total_pagos,
        cantidad_pagos: c.cantidad_pagos,
        total_deudas_vencidas: c.total_deudas_vencidas,
        total_estudiantes: c.total_estudiantes,
        estudiantes_en_mora: c.estudiantes_en_mora,
        porcentaje_cobro: c.porcentaje_cobro,
        resumen_por_metodo: c.resumen_por_metodo || {},
        creado_en: c.created_at,
      }))

      console.log(`✓ ${cierres.length} cierres diarios cargados`)
      return cierres
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error obteniendo cierres'
      set({ error: message })
      console.error('Error obteniendo cierres:', err)
      return []
    } finally {
      set({ loading: false })
    }
  },

  crearCierreDiario: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()
      const diaActual = today.getDate()

      const { data: cierreDiaHoy, error: errorCheck } = await supabase
        .from('cierres_diarios')
        .select('id')
        .eq('institucion_id', institucion_id)
        .eq('fecha', todayStr)
        .maybeSingle()

      if (errorCheck) throw errorCheck

      if (cierreDiaHoy) {
        console.log(`ℹ️ [CIERRE DIARIO] Ya existe un cierre para ${todayStr}. Se actualizará con los datos más recientes.`)
      }

      const { data: estudiantesData } = await supabase
        .from('estudiantes')
        .select('id')
        .eq('institucion_id', institucion_id)
        .neq('estado', 'NO_VIENE_MAS')

      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('id, monto, mes, año')
        .eq('institucion_id', institucion_id)
        .eq('activo', true)

      const conceptosVencidos = (conceptosData || []).filter(c => {
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

      console.log(`[CIERRE DIARIO] Conceptos totales: ${conceptosData?.length}, Vencidos hasta hoy: ${conceptosVencidos.length}`)

      const { data: pagosHoy } = await supabase
        .from('pagos')
        .select('monto_pagado, metodo_pago')
        .eq('institucion_id', institucion_id)
        .eq('fecha_pago', todayStr)

      const { data: pagosMultiplesHoy } = await supabase
        .from('pagos_multiples')
        .select(`
          metodo_pago,
          fecha_cobro,
          pagos_multiples_detalle(
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)
        .eq('fecha_cobro', todayStr)

      const resumenPorMetodo: Record<string, number> = {}
      
      pagosHoy?.forEach(pago => {
        const metodo = pago.metodo_pago || 'SIN ESPECIFICAR'
        resumenPorMetodo[metodo] = (resumenPorMetodo[metodo] || 0) + pago.monto_pagado
      })

      pagosMultiplesHoy?.forEach(pm => {
        const metodo = pm.metodo_pago || 'SIN ESPECIFICAR'
        if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
          pm.pagos_multiples_detalle.forEach((detalle: any) => {
            resumenPorMetodo[metodo] = (resumenPorMetodo[metodo] || 0) + detalle.monto_pagado
          })
        }
      })

      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques } = await supabase
          .from('pagos')
          .select('estudiante_id, concepto_id, monto_pagado')
          .eq('institucion_id', institucion_id)
          .range(desde, hasta)

        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          todosPagos = [...todosPagos, ...pagosBloques]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      const { data: pagosMultiplesData } = await supabase
        .from('pagos_multiples')
        .select(`
          id,
          estudiante_id,
          pagos_multiples_detalle(
            concepto_id,
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)

      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                estudiante_id: pm.estudiante_id,
                concepto_id: detalle.concepto_id,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      const pagosMap = new Map<string, number>()
      todosPagos.forEach(p => {
        pagosMap.set(`${p.estudiante_id}-${p.concepto_id}`, p.monto_pagado)
      })

      const totalPagosHoy = (pagosHoy?.reduce((sum, p) => sum + p.monto_pagado, 0) || 0) +
                            (pagosMultiplesHoy?.reduce((sum, pm) => {
                              let total = 0
                              if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
                                pm.pagos_multiples_detalle.forEach((d: any) => {
                                  total += d.monto_pagado
                                })
                              }
                              return sum + total
                            }, 0) || 0)
      
      const cantidadPagosHoy = (pagosHoy?.length || 0) + 
                               (pagosMultiplesHoy?.reduce((sum, pm) => {
                                 return sum + (pm.pagos_multiples_detalle?.length || 0)
                               }, 0) || 0)

      let totalDeudas = 0
      let estudiantesEnMora = 0

      estudiantesData?.forEach(est => {
        let deudaEstudiante = 0
        conceptosVencidos.forEach(concepto => {
          const tienePago = pagosMap.has(`${est.id}-${concepto.id}`)
          if (!tienePago) {
            deudaEstudiante += concepto.monto
          }
        })
        if (deudaEstudiante > 0) {
          totalDeudas += deudaEstudiante
          estudiantesEnMora += 1
        }
      })

      const totalEstudiantes = estudiantesData?.length || 0
      const porcentajeCobro = totalDeudas + totalPagosHoy > 0
        ? (totalPagosHoy / (totalDeudas + totalPagosHoy)) * 100
        : 0

      const cierreDiario: CierreDiario = {
        fecha: todayStr,
        total_pagos: totalPagosHoy,
        cantidad_pagos: cantidadPagosHoy,
        total_deudas_vencidas: totalDeudas,
        total_estudiantes: totalEstudiantes,
        estudiantes_en_mora: estudiantesEnMora,
        porcentaje_cobro: parseFloat(porcentajeCobro.toFixed(1)),
        resumen_por_metodo: resumenPorMetodo,
        creado_en: new Date().toISOString(),
      }

      const cierreData = {
        institucion_id,
        fecha: todayStr,
        total_pagos: cierreDiario.total_pagos,
        cantidad_pagos: cierreDiario.cantidad_pagos,
        total_deudas_vencidas: cierreDiario.total_deudas_vencidas,
        total_estudiantes: cierreDiario.total_estudiantes,
        estudiantes_en_mora: cierreDiario.estudiantes_en_mora,
        porcentaje_cobro: cierreDiario.porcentaje_cobro,
        resumen_por_metodo: resumenPorMetodo,
      }

      let errorGuardar: any
      if (cierreDiaHoy) {
        const { error: errorUpdate } = await supabase
          .from('cierres_diarios')
          .update(cierreData)
          .eq('id', cierreDiaHoy.id)
        errorGuardar = errorUpdate
        console.log(`✓ [CIERRE DIARIO] ${todayStr} ACTUALIZADO - Pagos: $${cierreDiario.total_pagos}, Deudas vencidas: $${cierreDiario.total_deudas_vencidas}`)
      } else {
        const { error: errorInsert } = await supabase
          .from('cierres_diarios')
          .insert([cierreData])
        errorGuardar = errorInsert
        console.log(`✓ [CIERRE DIARIO] ${todayStr} CREADO - Pagos: $${cierreDiario.total_pagos}, Deudas vencidas: $${cierreDiario.total_deudas_vencidas}`)
      }

      if (errorGuardar) throw errorGuardar

      set({ cierreDiario })
      return cierreDiario
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cierre diario'
      set({ error: message })
      console.error('Error creando cierre diario:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  crearCierreAnual: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const anioActual = new Date().getFullYear()
      const anioAnterior = anioActual - 1

      const { data: estudiantesAnio } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido')
        .eq('institucion_id', institucion_id)
        .neq('estado', 'NO_VIENE_MAS')

      const { data: conceptosAnio } = await supabase
        .from('conceptos_pago')
        .select('id, monto, mes, año')
        .eq('institucion_id', institucion_id)
        .eq('año', anioAnterior)
        .eq('activo', true)

      let todosPagosAnio: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques } = await supabase
          .from('pagos')
          .select('estudiante_id, concepto_id, monto_pagado')
          .eq('institucion_id', institucion_id)
          .neq('estado', 'ANULADO')
          .range(desde, hasta)

        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          todosPagosAnio = [...todosPagosAnio, ...pagosBloques]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      const { data: pagosMultiplesData } = await supabase
        .from('pagos_multiples')
        .select(`
          estudiante_id,
          estado,
          pagos_multiples_detalle(
            concepto_id,
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)
        .neq('estado', 'ANULADO')

      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagosAnio.push({
                estudiante_id: pm.estudiante_id,
                concepto_id: detalle.concepto_id,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      const pagosMap = new Map<string, number>()
      todosPagosAnio.forEach(p => {
        const key = `${p.estudiante_id}-${p.concepto_id}`
        pagosMap.set(key, (pagosMap.get(key) || 0) + p.monto_pagado)
      })

      const deudaEstudiantes: { [key: number]: number } = {}
      let totalDeudas = 0
      let estudiantesConDeuda = 0

      estudiantesAnio?.forEach(est => {
        let deudaEstudiante = 0
        conceptosAnio?.forEach(concepto => {
          const tienePago = pagosMap.has(`${est.id}-${concepto.id}`)
          if (!tienePago) {
            deudaEstudiante += concepto.monto
          }
        })
        
        if (deudaEstudiante > 0) {
          deudaEstudiantes[est.id] = deudaEstudiante
          totalDeudas += deudaEstudiante
          estudiantesConDeuda += 1
        }
      })

      console.log(`📊 [CIERRE ANUAL] Estudiantes con deuda: ${estudiantesConDeuda}, Total deuda: $${totalDeudas}`)

      const deudasAInsertar = Object.entries(deudaEstudiantes).map(([estId, monto]) => ({
        institucion_id,
        estudiante_id: parseInt(estId),
        año_deuda: anioAnterior,
        total_adeudado: monto,
        estado: 'PENDIENTE'
      }))

      if (deudasAInsertar.length > 0) {
        const { error: errorDeudas } = await supabase
          .from('deudas_historicas')
          .insert(deudasAInsertar)

        if (errorDeudas) throw errorDeudas
        console.log(`✓ ${deudasAInsertar.length} deudas históricas guardadas`)
      }

      for (const [estId, monto] of Object.entries(deudaEstudiantes)) {
        const { error: errorUpdate } = await supabase
          .from('estudiantes')
          .update({
            deuda_años_anteriores: monto,
            última_deuda_año: anioAnterior,
            última_actualización_deuda: new Date().toISOString()
          })
          .eq('id', parseInt(estId))

        if (errorUpdate) throw errorUpdate
      }

      let todosPagosTotal: any[] = []
      pagina = 0
      tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques } = await supabase
          .from('pagos')
          .select('monto_pagado')
          .eq('institucion_id', institucion_id)
          .neq('estado', 'ANULADO')
          .range(desde, hasta)

        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          todosPagosTotal = [...todosPagosTotal, ...pagosBloques]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      const { data: cierresDiarios } = await supabase
        .from('cierres_diarios')
        .select('*')
        .eq('institucion_id', institucion_id)

      const totalPagos = todosPagosTotal.reduce((sum, p) => sum + p.monto_pagado, 0)

      const cierreAnnual: CierreAnual = {
        año: anioAnterior,
        institucion_id,
        total_pagos_anuales: totalPagos,
        total_estudiantes_procesados: estudiantesAnio?.length || 0,
        total_deudas_anuales: totalDeudas,
        cantidad_cierres_diarios: cierresDiarios?.length || 0,
        fecha_cierre: new Date().toISOString(),
        archivo_backup: `Backup_${anioAnterior}_${institucion_id}_${Date.now()}.json`,
      }

      const { error: errorCierre } = await supabase
        .from('cierres_anuales')
        .insert([cierreAnnual])

      if (errorCierre) throw errorCierre

      const { error: errorHistorial } = await supabase
        .from('historial_cierres_anuales')
        .insert([{
          institucion_id,
          año: anioAnterior,
          total_recaudado: totalPagos,
          total_deudas_año: totalDeudas,
          estudiantes_procesados: estudiantesAnio?.length || 0,
          estudiantes_con_deuda: estudiantesConDeuda,
          fecha_cierre: new Date().toISOString()
        }])

      if (errorHistorial) throw errorHistorial

      console.log(`✓ [CIERRE ANUAL] ${anioAnterior} - Total pagos: $${totalPagos}, Estudiantes: ${estudiantesAnio?.length}, Con deuda: ${estudiantesConDeuda}`)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cierre anual'
      set({ error: message })
      console.error('Error creando cierre anual:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },
}))

