import { useState, useCallback } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { calcularMora, CalculoMoraResult } from '@renderer/lib/moraCalculator'
import { obtenerFechaLocalIso } from '@renderer/lib/dateUtils'

export interface ConceptoSeleccionable {
  id: number
  nombre: string
  tipo: string
  monto: number
  mes?: number
  mora?: CalculoMoraResult
  seleccionado: boolean
  montoFinal: number
  montoPagado?: number
}

export interface ResultadoRegistroCobro {
  success: boolean
  pago_multiple_id?: number
  numero_talonario?: string
  mensaje: string
}

interface PagoDividido {
  id: string
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'
  monto: number
  tipoTarjeta?: 'CREDITO' | 'DEBITO'
}

export const useCobranzasMultiples = () => {
  const [registrando, setRegistrando] = useState(false)
  const [error, setError] = useState<string>('')

  const obtenerConceptosPendientes = useCallback(
    async (
      institucionId: number,
      estudianteId: number,
      conceptosTotales: any[],
      carreraEstudianteId?: number
    ): Promise<ConceptoSeleccionable[]> => {
      try {
        // Obtener estado del estudiante
        const { data: estudianteData } = await supabase
          .from('estudiantes')
          .select('estado')
          .eq('id', estudianteId)
          .single()

        const estadoEstudiante = estudianteData?.estado || 'ACTIVO'
        const esBecado100 = estadoEstudiante === 'BECADO_100'
        const esBecado50 = estadoEstudiante === 'BECADO_50'

        // Función helper para determinar si aplica beca
        const esConceptoBeca = (tipo: string): boolean => {
          if (!tipo) return true
          const tipoLower = tipo.toLowerCase()
          return !tipoLower.includes('inscripcion') && !tipoLower.includes('seguro')
        }

        // Cargar pagos individuales (SIN filtrar por estado en Supabase)
        const { data: pagosRegistrados, error: errorPagos } = await supabase
          .from('pagos')
          .select('concepto_id, monto_pagado, estado')
          .eq('institucion_id', institucionId)
          .eq('estudiante_id', estudianteId)

        if (errorPagos) throw errorPagos

        // Cargar pagos múltiples (SIN filtrar por estado en Supabase)
        const { data: pagosMultiplesData, error: errorMultiples } = await supabase
          .from('pagos_multiples')
          .select(
            `
            estado,
            pagos_multiples_detalle (
              concepto_id,
              monto_pagado
            )
          `
          )
          .eq('institucion_id', institucionId)
          .eq('estudiante_id', estudianteId)

        if (errorMultiples) throw errorMultiples

        const montosPagados = new Map<number, number>()

        // Procesar pagos individuales (FILTRAR en código: solo los que NO estén ANULADOS)
        pagosRegistrados?.forEach((p) => {
          // Solo contar si estado !== 'ANULADO'
          if (p.estado !== 'ANULADO') {
            const actual = montosPagados.get(p.concepto_id) || 0
            montosPagados.set(p.concepto_id, actual + (p.monto_pagado || 0))
          }
        })

        // Procesar pagos múltiples (FILTRAR en código: solo los que NO estén ANULADOS)
        pagosMultiplesData?.forEach((pm: any) => {
          // Solo contar si estado !== 'ANULADO'
          if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              const actual = montosPagados.get(detalle.concepto_id) || 0
              montosPagados.set(detalle.concepto_id, actual + (detalle.monto_pagado || 0))
            })
          }
        })

        // Calcular pendientes
        // FILTRAR POR CARRERA SI SE PROPORCIONA
        const conceptosFiltrados = carreraEstudianteId
          ? conceptosTotales.filter((concepto) => concepto.carrera_id === carreraEstudianteId)
          : conceptosTotales
        
        const pendientes = conceptosFiltrados
          .map((concepto) => {
            const aplicaBeca = esConceptoBeca(concepto.tipo)
            
            // BECADO_100: conceptos con beca no aparecen (considerados pagados)
            if (esBecado100 && aplicaBeca) {
              return null
            }

            const montoPagado = montosPagados.get(concepto.id) || 0
            
            // BECADO_50: solo paga 50% de conceptos con beca
            let montoAResponsabilidad = concepto.monto
            if (esBecado50 && aplicaBeca) {
              montoAResponsabilidad = concepto.monto * 0.5
            }

            const saldoPendiente = montoAResponsabilidad - montoPagado

            if (saldoPendiente <= 0) {
              return null
            }

            let mora: CalculoMoraResult | undefined
            if (concepto.mes) {
              mora = calcularMora(concepto.mes, montoAResponsabilidad, 20)
            }

            let montoFinal = saldoPendiente
            if (mora && mora.estaVencida) {
              montoFinal = saldoPendiente + mora.montoRecargo
            }

            return {
              id: concepto.id,
              nombre: concepto.nombre,
              tipo: concepto.tipo,
              monto: saldoPendiente,
              mes: concepto.mes,
              mora,
              seleccionado: false,
              montoFinal,
              montoPagado,
            } as ConceptoSeleccionable
          })
          .filter((c): c is ConceptoSeleccionable => c !== null)

        return pendientes.sort((a, b) => {
          const tiposOrden = { INSCRIPCION: 0, SEGURO: 1, CUOTA: 2 }
          const tipoA = tiposOrden[a.tipo as keyof typeof tiposOrden] ?? 3
          const tipoB = tiposOrden[b.tipo as keyof typeof tiposOrden] ?? 3

          if (tipoA !== tipoB) return tipoA - tipoB

          if (a.mes && b.mes) return a.mes - b.mes

          return 0
        })
      } catch (err) {
        console.error('Error obteniendo conceptos pendientes:', err)
        throw err
      }
    },
    []
  )

  const actualizarSeleccion = useCallback(
    (
      conceptos: ConceptoSeleccionable[],
      conceptoId: number,
      seleccionado: boolean
    ): ConceptoSeleccionable[] => {
      return conceptos.map((c) => {
        if (c.id === conceptoId) {
          return { ...c, seleccionado }
        }
        return c
      })
    },
    []
  )

  const calcularTotales = useCallback((conceptos: ConceptoSeleccionable[]) => {
    const seleccionados = conceptos.filter((c) => c.seleccionado)

    const totalSinMora = seleccionados.reduce((sum, c) => sum + c.monto, 0)
    const totalConMora = seleccionados.reduce((sum, c) => sum + c.montoFinal, 0)
    const totalMora = totalConMora - totalSinMora

    const desglose = seleccionados
      .map((c) => {
        let desc = c.nombre
        if (c.montoPagado && c.montoPagado > 0) {
          desc += ` (Pagó: $${c.montoPagado.toFixed(0)}, Pendiente: $${c.monto.toFixed(0)})`
        }
        if (c.mora && c.mora.estaVencida && c.mora.montoRecargo > 0) {
          desc += ` + Mora $${c.mora.montoRecargo.toFixed(0)}`
        }
        return desc
      })
      .join(', ')

    return {
      cantidad: seleccionados.length,
      totalSinMora,
      totalMora,
      totalConMora,
      desglose,
      seleccionados,
    }
  }, [])

  const obtenerProximoTalonario = useCallback(async (institucionId: number): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('obtener_proximo_talonario', {
        p_institucion_id: institucionId,
        p_tipo_talonario: 'COBRANZA',
      })

      if (error) {
        console.warn('RPC no disponible, generando talonario manual:', error)
        // Si no existe RPC, generar uno manual
        const timestamp = Date.now().toString()
        return timestamp.slice(-6).padStart(4, '0')
      }

      return data || '0001'
    } catch (err) {
      console.error('Error obteniendo talonario:', err)
      return '0001'
    }
  }, [])

  const registrarCobranzaMultiple = useCallback(
    async (
      institucionId: number,
      estudianteId: number,
      conceptosSeleccionados: ConceptoSeleccionable[],
      pagosMultiples: PagoDividido[] | undefined,
      metodoPago: string,
      tipoTarjeta?: string,
      opciones?: {
        perdonarMora?: boolean
        montoParcial?: number
      }
    ): Promise<ResultadoRegistroCobro> => {
      setRegistrando(true)
      setError('')

      try {
        const totales = calcularTotales(conceptosSeleccionados)

        if (totales.cantidad === 0) {
          return {
            success: false,
            mensaje: 'Debes seleccionar al menos un concepto',
          }
        }

        // Validación de datos de entrada
        if (!institucionId || institucionId <= 0) {
          throw new Error(`institucionId inválido: ${institucionId}`)
        }
        if (!estudianteId || estudianteId <= 0) {
          throw new Error(`estudianteId inválido: ${estudianteId}`)
        }

        const numeroTalonarioBase = await obtenerProximoTalonario(institucionId)

        // Preparar array de pagos a registrar
        const pagosARegistrar = pagosMultiples && pagosMultiples.length > 0
          ? pagosMultiples.map((p, index) => ({
              metodo: p.metodo,
              monto: p.monto,
              tipoTarjeta: p.tipoTarjeta || null,
              numeroTalonario: `${numeroTalonarioBase}-${index + 1}`,
            }))
          : [{
              metodo: metodoPago,
              monto: totales.totalConMora,
              tipoTarjeta: tipoTarjeta || null,
              numeroTalonario: numeroTalonarioBase,
            }]

        const pagosCreados: number[] = []

        for (const pago of pagosARegistrar) {
          // Validar datos antes de insertar
          if (!pago.numeroTalonario || pago.monto <= 0) {
            throw new Error(`Datos de pago inválidos: numeroTalonario=${pago.numeroTalonario}, monto=${pago.monto}`)
          }

          // Construir objeto de pago con validación de tipos
          const pagoData = {
            institucion_id: Number(institucionId),
            estudiante_id: Number(estudianteId),
            numero_talonario: String(pago.numeroTalonario),
            monto_total: Number(pago.monto),
            cantidad_conceptos: Number(totales.cantidad),
            metodo_pago: String(pago.metodo),
            tipo_tarjeta: pago.tipoTarjeta ? String(pago.tipoTarjeta) : null,
            fecha_cobro: obtenerFechaLocalIso(),
            descripcion: `${pago.metodo}${pago.tipoTarjeta ? ` (${pago.tipoTarjeta})` : ''} - $${pago.monto.toFixed(2)}`,
            estado: 'REGISTRADO',
          }

          console.log('📝 Insertando pago_multiple:', pagoData)

          // Insertar pago múltiple usando Supabase client (no fetch)
          const { data: pagoMultipleData, error: errorPagoMultiple } = await supabase
            .from('pagos_multiples')
            .insert([pagoData])
            .select()

          if (errorPagoMultiple) {
            console.error('❌ Error al insertar pago_multiple:', errorPagoMultiple)
            throw new Error(`Error al insertar pago: ${errorPagoMultiple.message}`)
          }
          if (!pagoMultipleData || pagoMultipleData.length === 0) {
            throw new Error('Error al insertar pago múltiple: sin datos retornados')
          }

          const pagoMultipleId = pagoMultipleData[0].id
          pagosCreados.push(pagoMultipleId)
          console.log('✅ Pago_multiple creado con ID:', pagoMultipleId)

          // Insertar detalles del pago múltiple
          const detalles = totales.seleccionados
            .map((concepto) => {
              const montoMora = concepto.mora && concepto.mora.estaVencida ? concepto.mora.montoRecargo : 0
              const proporcion = pago.monto / totales.totalConMora
              const montoConceptoProporcional = concepto.montoFinal * proporcion

              // Validar cálculos
              if (isNaN(montoConceptoProporcional) || montoConceptoProporcional < 0) {
                console.error(`Monto inválido para concepto ${concepto.id}:`, montoConceptoProporcional)
                throw new Error(`Cálculo de monto inválido para concepto ${concepto.nombre}`)
              }

              return {
                pago_multiple_id: Number(pagoMultipleId),
                concepto_id: Number(concepto.id),
                monto_original: Number(concepto.monto * proporcion),
                monto_mora: Number(montoMora * proporcion),
                monto_pagado: Number(montoConceptoProporcional),
                include_mora: concepto.mora ? concepto.mora.estaVencida : false,
                dias_vencimiento: concepto.mora?.diasMora || null,
              }
            })
            .filter(d => d.monto_pagado > 0) // No registrar montos 0

          console.log('📝 Insertando detalles:', detalles.length, 'registros')

          const { error: errorDetalle } = await supabase
            .from('pagos_multiples_detalle')
            .insert(detalles)

          if (errorDetalle) {
            console.error('❌ Error al insertar detalles:', errorDetalle)
            throw new Error(`Error al insertar detalles de pago: ${errorDetalle.message}`)
          }
          console.log('✅ Detalles insertados correctamente')
        }

        const detalleMetodos = pagosARegistrar
          .map(p => `${p.metodo}${p.tipoTarjeta ? ` (${p.tipoTarjeta})` : ''}: $${p.monto.toFixed(2)}`)
          .join(' + ')

        return {
          success: true,
          pago_multiple_id: pagosCreados[0],
          numero_talonario: numeroTalonarioBase,
          mensaje: `Cobro registrado. Talonarios: ${pagosARegistrar.map(p => p.numeroTalonario).join(', ')} | Total: $${totales.totalConMora.toFixed(2)}\nMétodos: ${detalleMetodos}`,
        }
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido'
        setError(mensaje)
        console.error('Error registrando cobranza:', err)
        return {
          success: false,
          mensaje: `${mensaje}`,
        }
      } finally {
        setRegistrando(false)
      }
    },
    [calcularTotales, obtenerProximoTalonario]
  )

  return {
    registrando,
    error,
    obtenerConceptosPendientes,
    actualizarSeleccion,
    calcularTotales,
    registrarCobranzaMultiple,
  }
}
