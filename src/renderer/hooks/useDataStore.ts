import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface CobanzaRecord {
  id: string
  dniAlumno: string
  nombre: string
  concepto: 'Matrícula' | 'Cuota'
  monto: number
  metodoPago: 'Efectivo' | 'Transferencia' | 'Tarjeta'
  fecha: Date
  institucion: string
}

export interface VentaRecord {
  id: string
  producto: string
  cantidad: number
  precioUnitario: number
  total: number
  fecha: Date
  institucion: string
}

export interface GastoRecord {
  id: string
  categoria: 'Limpieza' | 'Librería' | 'Servicios' | 'Otros'
  descripcion: string
  monto: number
  fecha: Date
  institucion: string
}

interface DataStore {
  cobranzas: CobanzaRecord[]
  ventas: VentaRecord[]
  gastos: GastoRecord[]

  agregarCobranza: (cobranza: Omit<CobanzaRecord, 'id'>) => void
  agregarVenta: (venta: Omit<VentaRecord, 'id'>) => void
  agregarGasto: (gasto: Omit<GastoRecord, 'id'>) => void

  obtenerCobranzasPorInstitucion: (institucion: string) => CobanzaRecord[]
  obtenerVentasPorInstitucion: (institucion: string) => VentaRecord[]
  obtenerGastosPorInstitucion: (institucion: string) => GastoRecord[]
}

export const useDataStore = create<DataStore>((set, get) => ({
  cobranzas: [],
  ventas: [],
  gastos: [],

  agregarCobranza: (cobranza) => {
    set((state) => ({
      cobranzas: [
        ...state.cobranzas,
        {
          ...cobranza,
          id: uuidv4(),
        },
      ],
    }))
  },

  agregarVenta: (venta) => {
    set((state) => ({
      ventas: [
        ...state.ventas,
        {
          ...venta,
          id: uuidv4(),
        },
      ],
    }))
  },

  agregarGasto: (gasto) => {
    set((state) => ({
      gastos: [
        ...state.gastos,
        {
          ...gasto,
          id: uuidv4(),
        },
      ],
    }))
  },

  obtenerCobranzasPorInstitucion: (institucion) => {
    return get().cobranzas.filter((c) => c.institucion === institucion)
  },

  obtenerVentasPorInstitucion: (institucion) => {
    return get().ventas.filter((v) => v.institucion === institucion)
  },

  obtenerGastosPorInstitucion: (institucion) => {
    return get().gastos.filter((g) => g.institucion === institucion)
  },
}))
