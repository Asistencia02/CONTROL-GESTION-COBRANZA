// Script para debuguear los cálculos de reportes
// Ejecutar en la consola del navegador en ReportesFinancieros

async function debugReportes() {
  const supabase = (window as any).supabase
  const institucionId = 1
  
  console.log('=== DEBUG REPORTES ===')
  
  // 1. Estudiantes activos
  const { data: estudiantes } = await supabase
    .from('estudiantes')
    .select('id, carrera_id, estado')
    .eq('institucion_id', institucionId)
    .neq('estado', 'NO_VIENE_MAS')
  
  console.log('Total estudiantes activos:', estudiantes?.length)
  
  const estudiantesPorCarrera = new Map()
  estudiantes?.forEach(est => {
    estudiantesPorCarrera.set(est.carrera_id, (estudiantesPorCarrera.get(est.carrera_id) || 0) + 1)
  })
  
  console.log('Estudiantes por carrera:', Object.fromEntries(estudiantesPorCarrera))
  
  // 2. TODOS los conceptos (sin filtros)
  const { data: conceptosTodos } = await supabase
    .from('conceptos_pago')
    .select('id, carrera_id, tipo, monto, mes, año, activo')
    .eq('institucion_id', institucionId)
  
  console.log('Total conceptos en BD:', conceptosTodos?.length)
  
  // Desglose por tipo
  const desglose = {}
  conceptosTodos?.forEach(c => {
    const key = `${c.carrera_id}-${c.tipo}-activo=${c.activo}`
    if (!desglose[key]) desglose[key] = []
    desglose[key].push(c)
  })
  
  console.log('Desglose completo:')
  Object.entries(desglose).forEach(([key, conceptos]) => {
    const total = conceptos.reduce((sum, c) => sum + c.monto, 0)
    console.log(`${key}: ${conceptos.length} conceptos, total = ${total}`)
  })
  
  // 3. Cálculo manual correcto
  console.log('\n=== CÁLCULO CORRECTO ===')
  let totalCalculado = 0
  
  estudiantes?.forEach(est => {
    const carreraId = est.carrera_id
    const conceptosCarrera = conceptosTodos?.filter(c => c.carrera_id === carreraId && c.activo === true)
    
    conceptosCarrera?.forEach(c => {
      totalCalculado += c.monto
      console.log(`Est ${est.id} - ${c.tipo} ${c.id}: +${c.monto}`)
    })
  })
  
  console.log('\n✅ TOTAL QUE DEBERÍA MOSTRAR:', totalCalculado)
}

// Copiar y pegar en consola:
// debugReportes()
