/**
 * Utilidades centralizadas para manejo de fechas
 * Asegura que todas las fechas se usen en timezone local del usuario
 * Previene problemas de timezone en Supabase vs cliente
 */

/**
 * Obtiene la fecha actual en timezone local (sin cambios UTC)
 * Usa la fecha local del sistema del usuario
 */
export const obtenerFechaLocal = (): Date => {
  const ahora = new Date()
  // No hacer conversión de timezone, usar la fecha local directamente
  return ahora
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (local)
 * Útil para enviar a Supabase
 */
export const obtenerFechaLocalIso = (): string => {
  const ahora = obtenerFechaLocal()
  const year = ahora.getFullYear()
  const month = String(ahora.getMonth() + 1).padStart(2, '0')
  const day = String(ahora.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convierte string de fecha ISO a Date sin cambiar timezone
 * Útil para leer fechas de Supabase
 */
export const parsearFechaLocal = (fechaString: string): Date => {
  // Remover la parte de hora si existe
  const fechaParte = fechaString.split('T')[0]
  const [year, month, day] = fechaParte.split('-').map(Number)
  
  // Crear fecha en timezone local
  const fecha = new Date(year, month - 1, day)
  return fecha
}

/**
 * Convierte Date a string ISO local (YYYY-MM-DD)
 */
export const formatearFechaIsoLocal = (fecha: Date | string): string => {
  const d = typeof fecha === 'string' ? parsearFechaLocal(fecha) : fecha
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formatea fecha a DD/MM/YYYY (formato local)
 */
export const formatearFechaLocal = (fecha: Date | string): string => {
  const d = typeof fecha === 'string' ? parsearFechaLocal(fecha) : fecha
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Formatea fecha con hora: DD/MM/YYYY HH:mm:ss
 */
export const formatearFechaConHora = (fecha: Date | string): string => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Obtiene nombre del mes en español
 */
export const obtenerNombreMes = (mes: number): string => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[Math.max(0, Math.min(11, mes - 1))]
}

/**
 * Obtiene nombre del día en español
 */
export const obtenerNombreDia = (fecha: Date | string): string => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[d.getDay()]
}

/**
 * Compara dos fechas (solo la parte de fecha, sin hora)
 * Retorna: -1 si fecha1 < fecha2, 0 si son iguales, 1 si fecha1 > fecha2
 */
export const compararFechas = (fecha1: Date | string, fecha2: Date | string): number => {
  const d1 = typeof fecha1 === 'string' ? 
    (fecha1.includes('T') ? new Date(fecha1) : parsearFechaLocal(fecha1)) 
    : fecha1
  const d2 = typeof fecha2 === 'string' ? 
    (fecha2.includes('T') ? new Date(fecha2) : parsearFechaLocal(fecha2)) 
    : fecha2

  const f1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const f2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate())

  if (f1 < f2) return -1
  if (f1 > f2) return 1
  return 0
}

/**
 * Calcula diferencia en días entre dos fechas
 */
export const calcularDiasEntre = (fecha1: Date | string, fecha2: Date | string): number => {
  const d1 = typeof fecha1 === 'string' ? 
    (fecha1.includes('T') ? new Date(fecha1) : parsearFechaLocal(fecha1)) 
    : fecha1
  const d2 = typeof fecha2 === 'string' ? 
    (fecha2.includes('T') ? new Date(fecha2) : parsearFechaLocal(fecha2)) 
    : fecha2

  const f1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime()
  const f2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime()
  
  const diferencia = Math.abs(f2 - f1)
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24))
}

/**
 * Suma días a una fecha y retorna nueva fecha
 */
export const sumarDias = (fecha: Date | string, dias: number): Date => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const resultado = new Date(d)
  resultado.setDate(resultado.getDate() + dias)
  return resultado
}

/**
 * Resta días a una fecha y retorna nueva fecha
 */
export const restarDias = (fecha: Date | string, dias: number): Date => {
  return sumarDias(fecha, -dias)
}

/**
 * Obtiene el primer día del mes
 */
export const obtenerPrimerDiaDelMes = (fecha: Date | string): Date => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Obtiene el último día del mes
 */
export const obtenerUltimoDiaDelMes = (fecha: Date | string): Date => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * Verifica si una fecha es hoy
 */
export const esHoy = (fecha: Date | string): boolean => {
  return compararFechas(fecha, obtenerFechaLocal()) === 0
}

/**
 * Verifica si una fecha es en el pasado
 */
export const esEnElPasado = (fecha: Date | string): boolean => {
  return compararFechas(fecha, obtenerFechaLocal()) < 0
}

/**
 * Verifica si una fecha es en el futuro
 */
export const esEnElFuturo = (fecha: Date | string): boolean => {
  return compararFechas(fecha, obtenerFechaLocal()) > 0
}

/**
 * Verifica si una fecha es este año
 */
export const esEsteAnio = (fecha: Date | string): boolean => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  return d.getFullYear() === obtenerFechaLocal().getFullYear()
}

/**
 * Verifica si una fecha es este mes
 */
export const esEsteMes = (fecha: Date | string): boolean => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const ahora = obtenerFechaLocal()
  return d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
}

/**
 * Obtiene el mes y año en formato "Enero 2025"
 */
export const obtenerMesAnio = (fecha: Date | string): string => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  return `${obtenerNombreMes(d.getMonth() + 1)} ${d.getFullYear()}`
}

/**
 * Obtiene semana del año
 */
export const obtenerSemanaDelAnio = (fecha: Date | string): number => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const primerDia = new Date(d.getFullYear(), 0, 1)
  const diasTranscurridos = calcularDiasEntre(primerDia, d)
  return Math.ceil((diasTranscurridos + 1) / 7)
}

/**
 * Convierte una fecha a timezone específico (para display solamente)
 * Nota: No modifica la fecha almacenada, solo cambia cómo se muestra
 */
export const formatearFechaEnTimezone = (
  fecha: Date | string,
  timezone: string = 'es-AR'
): string => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  })
}

/**
 * Obtiene todas las fechas del mes (útil para calendarios)
 */
export const obtenerFechasDelMes = (fecha: Date | string): Date[] => {
  const d = typeof fecha === 'string' ? 
    (fecha.includes('T') ? new Date(fecha) : parsearFechaLocal(fecha)) 
    : fecha
  
  const año = d.getFullYear()
  const mes = d.getMonth()
  
  const primerDia = new Date(año, mes, 1)
  const ultimoDia = new Date(año, mes + 1, 0)
  
  const fechas: Date[] = []
  for (let i = 1; i <= ultimoDia.getDate(); i++) {
    fechas.push(new Date(año, mes, i))
  }
  
  return fechas
}

/**
 * Obtiene rango de fechas entre dos fechas
 */
export const obtenerRangoDeFechas = (
  fechaInicio: Date | string,
  fechaFin: Date | string
): Date[] => {
  const inicio = typeof fechaInicio === 'string' ? 
    (fechaInicio.includes('T') ? new Date(fechaInicio) : parsearFechaLocal(fechaInicio)) 
    : fechaInicio
  
  const fin = typeof fechaFin === 'string' ? 
    (fechaFin.includes('T') ? new Date(fechaFin) : parsearFechaLocal(fechaFin)) 
    : fechaFin
  
  const fechas: Date[] = []
  const actual = new Date(inicio)
  
  while (actual <= fin) {
    fechas.push(new Date(actual))
    actual.setDate(actual.getDate() + 1)
  }
  
  return fechas
}
