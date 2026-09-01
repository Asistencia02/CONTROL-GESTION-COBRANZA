/**
 * Tipos de la Base de Datos - Gestión de Cobranzas
 * Generado manualmente. Para auto-generar, usa:
 * supabase gen types typescript --project-id xxxxx > src/renderer/lib/database.types.ts
 */

export type Database = {
  public: {
    Tables: {
      instituciones: {
        Row: {
          id: number
          codigo: string
          nombre: string
          cuit: string
          punto_venta: string
          email: string | null
          telefono: string | null
          direccion: string | null
          color_hex: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          codigo: string
          nombre: string
          cuit: string
          punto_venta: string
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          color_hex?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          codigo?: string
          nombre?: string
          cuit?: string
          punto_venta?: string
          email?: string | null
          telefono?: string | null
          direccion?: string | null
          color_hex?: string
          created_at?: string
          updated_at?: string
        }
      }
      carreras: {
        Row: {
          id: number
          institucion_id: number
          nombre: string
          nivel: string | null
          duracion_años: number
          created_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          nombre: string
          nivel?: string | null
          duracion_años?: number
          created_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          nombre?: string
          nivel?: string | null
          duracion_años?: number
          created_at?: string
        }
      }
      estudiantes: {
        Row: {
          id: number
          institucion_id: number
          carrera_id: number
          dni: string
          nombre: string
          apellido: string
          email: string | null
          telefono: string | null
          estado: string
          fecha_ingreso: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          carrera_id: number
          dni: string
          nombre: string
          apellido: string
          email?: string | null
          telefono?: string | null
          estado?: string
          fecha_ingreso: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          carrera_id?: number
          dni?: string
          nombre?: string
          apellido?: string
          email?: string | null
          telefono?: string | null
          estado?: string
          fecha_ingreso?: string
          created_at?: string
          updated_at?: string
        }
      }
      conceptos_pago: {
        Row: {
          id: number
          institucion_id: number
          nombre: string
          tipo: string
          monto: number
          mes: number | null
          año: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          nombre: string
          tipo: string
          monto: number
          mes?: number | null
          año?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          nombre?: string
          tipo?: string
          monto?: number
          mes?: number | null
          año?: number
          activo?: boolean
          created_at?: string
        }
      }
      pagos: {
        Row: {
          id: number
          institucion_id: number
          estudiante_id: number
          concepto_id: number
          monto_pagado: number
          monto_original: number
          metodo_pago: string
          numero_transaccion: string | null
          numero_talonario: string | null
          fecha_pago: string
          comprobante_numero: string | null
          cae: string | null
          notas: string | null
          estado: string
          anulado: boolean
          fecha_anulacion: string | null
          motivo_anulacion: string | null
          anulado_por: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          estudiante_id: number
          concepto_id: number
          monto_pagado: number
          monto_original: number
          metodo_pago: string
          numero_transaccion?: string | null
          numero_talonario?: string | null
          fecha_pago?: string
          comprobante_numero?: string | null
          cae?: string | null
          notas?: string | null
          estado?: string
          anulado?: boolean
          fecha_anulacion?: string | null
          motivo_anulacion?: string | null
          anulado_por?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          estudiante_id?: number
          concepto_id?: number
          monto_pagado?: number
          monto_original?: number
          metodo_pago?: string
          numero_transaccion?: string | null
          numero_talonario?: string | null
          fecha_pago?: string
          comprobante_numero?: string | null
          cae?: string | null
          notas?: string | null
          estado?: string
          anulado?: boolean
          fecha_anulacion?: string | null
          motivo_anulacion?: string | null
          anulado_por?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pagos_multiples: {
        Row: {
          id: number
          institucion_id: number
          estudiante_id: number
          numero_talonario: string
          monto_total: number
          cantidad_conceptos: number
          metodo_pago: string
          tipo_tarjeta: string | null
          fecha_cobro: string
          descripcion: string | null
          estado: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          estudiante_id: number
          numero_talonario: string
          monto_total: number
          cantidad_conceptos: number
          metodo_pago: string
          tipo_tarjeta?: string | null
          fecha_cobro?: string
          descripcion?: string | null
          estado?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          estudiante_id?: number
          numero_talonario?: string
          monto_total?: number
          cantidad_conceptos?: number
          metodo_pago?: string
          tipo_tarjeta?: string | null
          fecha_cobro?: string
          descripcion?: string | null
          estado?: string
          created_at?: string
          updated_at?: string
        }
      }
      pagos_multiples_detalle: {
        Row: {
          id: number
          pago_multiple_id: number
          concepto_id: number
          monto_original: number
          monto_mora: number
          monto_pagado: number
          include_mora: boolean
          dias_vencimiento: number | null
          created_at: string
        }
        Insert: {
          id?: number
          pago_multiple_id: number
          concepto_id: number
          monto_original: number
          monto_mora?: number
          monto_pagado: number
          include_mora?: boolean
          dias_vencimiento?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          pago_multiple_id?: number
          concepto_id?: number
          monto_original?: number
          monto_mora?: number
          monto_pagado?: number
          include_mora?: boolean
          dias_vencimiento?: number | null
          created_at?: string
        }
      }
      excepciones_cobro: {
        Row: {
          id: number
          institucion_id: number
          estudiante_id: number
          concepto_id: number
          tipo_excepcion: string
          monto_original: number
          monto_perdonado: number | null
          monto_pagado: number
          motivo: string
          fecha_excepcion: string
          usuario_id: string | null
          aprobado: boolean
          created_at: string
        }
        Insert: {
          id?: number
          institucion_id?: number
          estudiante_id: number
          concepto_id: number
          tipo_excepcion: string
          monto_original: number
          monto_perdonado?: number | null
          monto_pagado: number
          motivo: string
          fecha_excepcion?: string
          usuario_id?: string | null
          aprobado?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          estudiante_id?: number
          concepto_id?: number
          tipo_excepcion?: string
          monto_original?: number
          monto_perdonado?: number | null
          monto_pagado?: number
          motivo?: string
          fecha_excepcion?: string
          usuario_id?: string | null
          aprobado?: boolean
          created_at?: string
        }
      }
      talonarios: {
        Row: {
          id: number
          institucion_id: number
          tipo_talonario: string
          proximo_numero: number
          formato: string | null
          prefijo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          tipo_talonario: string
          proximo_numero?: number
          formato?: string | null
          prefijo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          tipo_talonario?: string
          proximo_numero?: number
          formato?: string | null
          prefijo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      insumos: {
        Row: {
          id: number
          institucion_id: number
          codigo_sku: string
          nombre: string
          descripcion: string | null
          precio_unitario: number
          cantidad_stock: number
          cantidad_minima: number
          categoria: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          codigo_sku: string
          nombre: string
          descripcion?: string | null
          precio_unitario: number
          cantidad_stock?: number
          cantidad_minima?: number
          categoria?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          codigo_sku?: string
          nombre?: string
          descripcion?: string | null
          precio_unitario?: number
          cantidad_stock?: number
          cantidad_minima?: number
          categoria?: string | null
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ventas_insumos: {
        Row: {
          id: number
          institucion_id: number
          estudiante_id: number | null
          insumo_id: number
          cantidad: number
          precio_unitario: number
          subtotal: number
          metodo_pago: string | null
          numero_talonario: string | null
          estado: string
          fecha_venta: string
          created_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          estudiante_id?: number | null
          insumo_id: number
          cantidad: number
          precio_unitario: number
          subtotal: number
          metodo_pago?: string | null
          numero_talonario?: string | null
          estado?: string
          fecha_venta?: string
          created_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          estudiante_id?: number | null
          insumo_id?: number
          cantidad?: number
          precio_unitario?: number
          subtotal?: number
          metodo_pago?: string | null
          numero_talonario?: string | null
          estado?: string
          fecha_venta?: string
          created_at?: string
        }
      }
      gastos: {
        Row: {
          id: number
          institucion_id: number
          categoria: string
          descripcion: string
          monto: number
          metodo_pago: string | null
          comprobante_numero: string | null
          fecha_gasto: string
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          institucion_id: number
          categoria: string
          descripcion: string
          monto: number
          metodo_pago?: string | null
          comprobante_numero?: string | null
          fecha_gasto?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          institucion_id?: number
          categoria?: string
          descripcion?: string
          monto?: number
          metodo_pago?: string | null
          comprobante_numero?: string | null
          fecha_gasto?: string
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      usuarios: {
        Row: {
          id: number
          email: string
          nombre: string
          institucion_id: number
          rol: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          email: string
          nombre: string
          institucion_id: number
          rol?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          email?: string
          nombre?: string
          institucion_id?: number
          rol?: string
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      v_deuda_estudiantes: {
        Row: {
          id: number | null
          dni: string | null
          nombre_completo: string | null
          carrera: string | null
          institucion: string | null
          estado: string | null
          conceptos_totales: number | null
          conceptos_pagados: number | null
          conceptos_adeudados: number | null
          total_adeudado: number | null
        }
      }
      v_ingresos_por_metodo: {
        Row: {
          id: number | null
          institucion: string | null
          metodo_pago: string | null
          cantidad_pagos: number | null
          total_recaudado: number | null
          fecha: string | null
        }
      }
      v_resumen_conceptos: {
        Row: {
          institucion: string | null
          tipo: string | null
          concepto: string | null
          cantidad_pagados: number | null
          total_recaudado: number | null
          estudiantes_que_pagaron: number | null
        }
      }
    }
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

// Tipos simplificados para uso común
export type Institucion = Database['public']['Tables']['instituciones']['Row']
export type Estudiante = Database['public']['Tables']['estudiantes']['Row']
export type ConceptoPago = Database['public']['Tables']['conceptos_pago']['Row']
export type Pago = {
  id: number | string
  institucion_id: number
  estudiante_id: number
  concepto_id: number
  monto_pagado: number
  monto_original: number
  metodo_pago: string
  numero_transaccion?: string | null
  numero_talonario?: string | null
  fecha_pago: string
  comprobante_numero?: string | null
  cae?: string | null
  notas?: string | null
  estado?: string
  anulado?: boolean
  fecha_anulacion?: string | null
  motivo_anulacion?: string | null
  anulado_por?: string | null
  created_at: string
  updated_at: string
  tipo_tarjeta?: string | null
  razon_anulacion?: string | null
  estudiantes?: { nombre: string; apellido: string; dni: string }
  conceptos_pago?: { nombre: string; tipo: string; monto: number; mes?: number }
}
export type Insumo = Database['public']['Tables']['insumos']['Row']
export type VentaInsumo = Database['public']['Tables']['ventas_insumos']['Row']
export type Gasto = Database['public']['Tables']['gastos']['Row']
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type PagoMultiple = Database['public']['Tables']['pagos_multiples']['Row']
export type PagoMultipleDetalle = Database['public']['Tables']['pagos_multiples_detalle']['Row']
export type ExcepcionCobro = Database['public']['Tables']['excepciones_cobro']['Row']
export type Talonario = Database['public']['Tables']['talonarios']['Row']

// Enums personalizados
export enum EstadoEstudiante {
  ACTIVO = 'ACTIVO',
  BECADO_100 = 'BECADO_100',
  BECADO_50 = 'BECADO_50',
  NO_VIENE_MAS = 'NO_VIENE_MAS',
}

export enum TipoPago {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  PAGO_PARCIAL = 'PAGO_PARCIAL',
}

export enum TipoConcepto {
  INSCRIPCION = 'INSCRIPCION',
  CUOTA = 'CUOTA',
  SEGURO = 'SEGURO',
}

export enum RolUsuario {
  ADMIN = 'ADMIN',
  CONTADOR = 'CONTADOR',
  VENDEDOR = 'VENDEDOR',
}
