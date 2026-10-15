import { useState, useCallback } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface AlumnoDeuda {
  id: number
  nombre: string
  apellido: string
  dni: string
  carrera: string
  carrera_id: number
  estado: string
  concepto: string
  monto_original: number
  monto_pagado: number
  deuda: number
  mes: number
  año: number
}

export interface DeudasPorMes {
  mes: number
  mes_nombre: string
  total_alumnos: number
  monto_total: number
  alumnos: AlumnoDeuda[]
}

const MESES_NOMBRE = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export const useDeudasPorMes = (institucionId: number) => {
  const [deudasPorMes, setDeudasPorMes] = useState<DeudasPorMes[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarDeudasPorMes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const anoActual = new Date().getFullYear()

      // ✅ 1. Cargar estudiantes válidos (ACTIVO o BECADO_50)
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, estado, carrera_id')
        .eq('institucion_id', institucionId)
        .in('estado', ['ACTIVO', 'BECADO_50'])

      if (errEst) throw errEst

      // ✅ 2. Cargar carreras
      const { data: carreras, error: errCarr } = await supabase
        .from('carreras')
        .select('id, nombre')

      if (errCarr) throw errCarr

      const carrerasMap = new Map((carreras || []).map(c => [c.id, c.nombre]))

      // ✅ 3. Cargar conceptos de pago activos con mes/año
      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, mes, año, monto, carrera_id, tipo')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      // ✅ 4. Cargar pagos (individuales)
      const { data: pagosData, error: errPagos } = await supabase
        .from('pagos')
        .select('estudiante_id, concepto_id, monto_pagado')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (errPagos) throw errPagos

      // ✅ 5. Cargar pagos múltiples (desglosados)
      const { data: pagosMultiples, error: errPagosMulti } = await supabase
        .from('pagos_multiples')
        .select(`
          *,
          pagos_multiples_detalle(*)
        `)
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (errPagosMulti) throw errPagosMulti

      // ✅ 6. Expandir pagos múltiples
      const pagosMultiplesExpandidos: any[] = []
      pagosMultiples?.forEach(pm => {
        if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
          pm.pagos_multiples_detalle.forEach((detalle: any) => {
            pagosMultiplesExpandidos.push({
              estudiante_id: pm.estudiante_id,
              concepto_id: detalle.concepto_id,
              monto_pagado: detalle.monto_pagado,
            })
          })
        }
      })

      const todosPagos = [...(pagosData || []), ...pagosMultiplesExpandidos]

      // ✅ 7. Crear mapa de pagos: `${estudiante_id}-${concepto_id}` => monto_pagado
      const pagosMap = new Map<string, number>()
      todosPagos.forEach(pago => {
        const key = `${pago.estudiante_id}-${pago.concepto_id}`
        pagosMap.set(key, (pagosMap.get(key) || 0) + pago.monto_pagado)
      })

      // ✅ 8. Construir estructura de deudas por mes
      const resultadoPorMes: Map<number, DeudasPorMes> = new Map()

      // Inicializar 12 meses
      for (let mes = 1; mes <= 12; mes++) {
        resultadoPorMes.set(mes, {
          mes,
          mes_nombre: MESES_NOMBRE[mes],
          total_alumnos: 0,
          monto_total: 0,
          alumnos: [],
        })
      }

      // ✅ 9. Procesar cada estudiante y sus deudas
      estudiantes?.forEach(estudiante => {
        const carreraNombre = carrerasMap.get(estudiante.carrera_id) || 'Sin carrera'

        // Filtrar conceptos de su carrera
        const conceptosDelEstudiante = (conceptos || []).filter(
          c => c.carrera_id === estudiante.carrera_id && c.mes && c.mes >= 1 && c.mes <= 12
        )

        conceptosDelEstudiante.forEach(concepto => {
          // Verificar que sea del año actual
          if (concepto.año !== anoActual) return

          // Obtener monto pagado
          const key = `${estudiante.id}-${concepto.id}`
          const montoPagado = pagosMap.get(key) || 0

          // Calcular deuda
          let montoResponsabilidad = concepto.monto
          if (estudiante.estado === 'BECADO_50') {
            // Cuotas aplican beca, inscripción y seguro NO
            const nombre = concepto.nombre.toLowerCase()
            if (!nombre.includes('inscripción') && !nombre.includes('inscripcion') && !nombre.includes('seguro')) {
              montoResponsabilidad = concepto.monto * 0.5
            }
          }

          const deuda = montoResponsabilidad - montoPagado

          // Si hay deuda, agregar a mes
          if (deuda > 0) {
            const mesData = resultadoPorMes.get(concepto.mes)!
            mesData.alumnos.push({
              id: estudiante.id,
              nombre: estudiante.nombre,
              apellido: estudiante.apellido,
              dni: estudiante.dni,
              carrera: carreraNombre,
              carrera_id: estudiante.carrera_id,
              estado: estudiante.estado,
              concepto: concepto.nombre,
              monto_original: concepto.monto,
              monto_pagado: montoPagado,
              deuda,
              mes: concepto.mes,
              año: concepto.año,
            })
            mesData.total_alumnos = new Set(mesData.alumnos.map(a => a.id)).size
            mesData.monto_total += deuda
          }
        })
      })

      // ✅ 10. Convertir a array y ordenar
      const resultado = Array.from(resultadoPorMes.values()).sort((a, b) => a.mes - b.mes)

      setDeudasPorMes(resultado)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      console.error('Error en useDeudasPorMes:', err)
    } finally {
      setLoading(false)
    }
  }, [institucionId])

  return {
    deudasPorMes,
    loading,
    error,
    cargarDeudasPorMes,
  }
}
