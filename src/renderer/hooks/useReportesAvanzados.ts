import { useIngresoPorMetodo, MetodoPago } from './useIngresoPorMetodo'
import { useRealVsTeoricoCarrera, RealVsTeoricoCarrera } from './useRealVsTeoricoCarrera'

export interface ReportesAvanzados {
  ingresosPorMetodo: MetodoPago[]
  realVsTeoricoCarrera: RealVsTeoricoCarrera[]
  loadingMetodo: boolean
  loadingRealVsTeorico: boolean
}

export const useReportesAvanzados = (institucionId: number): ReportesAvanzados => {
  const { ingresosPorMetodo, loading: loadingMetodo } = useIngresoPorMetodo(institucionId)
  const { datos: realVsTeoricoCarrera, loading: loadingRealVsTeorico } = useRealVsTeoricoCarrera(institucionId)

  return {
    ingresosPorMetodo,
    realVsTeoricoCarrera,
    loadingMetodo,
    loadingRealVsTeorico
  }
}
