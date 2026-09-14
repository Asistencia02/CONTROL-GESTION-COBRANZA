import { useIngresoPorMetodo, IngresosPorMetodo } from './useIngresoPorMetodo'
import { useRealVsTeoricoCarrera, RealVsTeoricoCarrera } from './useRealVsTeoricoCarrera'

export interface ReportesAvanzados {
  ingresosPorMetodo: IngresosPorMetodo
  realVsTeoricoCarrera: RealVsTeoricoCarrera[]
  loadingMetodo: boolean
  loadingRealVsTeor ico: boolean
}

export const useReportesAvanzados = (institucionId: number): ReportesAvanzados => {
  const { ingresos: ingresosPorMetodo, loading: loadingMetodo } = useIngresoPorMetodo(institucionId)
  const { datos: realVsTeoricoCarrera, loading: loadingRealVsTeorico } = useRealVsTeoricoCarrera(institucionId)

  return {
    ingresosPorMetodo,
    realVsTeoricoCarrera,
    loadingMetodo,
    loadingRealVsTeorico
  }
}
