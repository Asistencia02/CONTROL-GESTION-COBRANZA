import { create } from 'zustand'

type Institucion = 'ISIPP' | 'Milagros'

interface InstitucionData {
  id: number  // ID de la BD: 1 para ISIPP, 2 para Milagros
  institucion: Institucion
  nombre: string
  cuit: string
  puntosVenta: string[]
  ptoVentaActivo: string
  color: string
  nombreCorto: string
}

interface InstitucionStore {
  institucionActiva: InstitucionData
  instituciones: InstitucionData[]
  cambiarInstitucion: (institucion: Institucion) => void
  actualizarPtoVenta: (pto: string) => void
}

const INSTITUCIONES_DATA: Record<Institucion, Omit<InstitucionData, 'institucion'>> = {
  ISIPP: {
    id: 1,
    nombre: 'Instituto Superior de Informática',
    cuit: '20-12345678-1',
    puntosVenta: ['0001', '0002', '0003'],
    ptoVentaActivo: '0001',
    color: '#0066CC',
    nombreCorto: 'ISIPP',
  },
  Milagros: {
    id: 2,
    nombre: 'Instituto Nuestra Señora de los Milagros',
    cuit: '20-87654321-9',
    puntosVenta: ['0001', '0002'],
    ptoVentaActivo: '0001',
    color: '#B71C1C',
    nombreCorto: 'Milagros',
  },
}

export const useInstitucion = create<InstitucionStore>((set) => {
  const institucionesList: InstitucionData[] = [
    { institucion: 'ISIPP', ...INSTITUCIONES_DATA['ISIPP'] },
    { institucion: 'Milagros', ...INSTITUCIONES_DATA['Milagros'] },
  ]

  return {
    institucionActiva: institucionesList[0],
    instituciones: institucionesList,

    cambiarInstitucion: (institucion: Institucion) => {
      set({
        institucionActiva: {
          institucion,
          ...INSTITUCIONES_DATA[institucion],
        },
      })
    },

    actualizarPtoVenta: (pto: string) => {
      set((state) => ({
        institucionActiva: {
          ...state.institucionActiva,
          ptoVentaActivo: pto,
        },
      }))
    },
  }
})
