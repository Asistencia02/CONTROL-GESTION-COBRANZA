import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useDeudas } from '@renderer/hooks/useDeudas'
import { useEffect } from 'react'

/**
 * Hook para sincronizar cambios de institución con reset de datos
 * Limpia todos los datos al cambiar de institución para evitar cruzamiento
 */
export const useSincronizarInstitucion = () => {
  const { institucionActiva } = useInstitucion()
  const { pagos, cargarPagos } = usePagos()
  const { estudiantes, cargarEstudiantes } = useEstudiantes()
  const { insumos, cargarInsumos } = useInsumos()
  const { gastos, cargarGastos } = useGastos()
  const { deudas, cargarDeudas } = useDeudas()

  useEffect(() => {
    // Detectar cambio de institución comparando el ID
    const institucionId = institucionActiva.id

    // Verificar que los datos actuales correspondan a la institución activa
    // Si no, resetear todo
    const validarYActualizar = async () => {
      try {
        // Cargar datos de la nueva institución
        await Promise.all([
          cargarEstudiantes(institucionId),
          cargarPagos(institucionId),
          cargarInsumos(institucionId),
          cargarGastos(institucionId),
          cargarDeudas(institucionId)
        ])
      } catch (error) {
        console.error('Error sincronizando institución:', error)
      }
    }

    validarYActualizar()
  }, [institucionActiva.id])

  return {
    institucionActiva,
    pagos,
    estudiantes,
    insumos,
    gastos,
    deudas
  }
}
