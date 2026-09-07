import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ujylncayqpbvowuftocl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeWxuY2F5cXBidm93dWZ0b2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI4MTEzNDcsImV4cCI6MjA0ODM4NzM0N30.HKL2E3ViqxPXddvz6lxIWGpR-OJ7BqYQqVyq6f0Sxzs'
);

async function analizar() {
  console.log('🔍 Verificando estudiantes AL DÍA en BD:\n');

  // Consulta SQL que calcula Al Día correctamente
  const { data } = await supabase.rpc('sql', {
    query: `
      SELECT 
        e.id,
        e.nombre,
        e.apellido,
        e.carrera_id,
        c.nombre as carrera,
        COUNT(DISTINCT cp.id) as total_conceptos,
        COUNT(DISTINCT CASE 
          WHEN COALESCE(pmap.monto_total, 0) >= cp.monto THEN cp.id 
        END) as conceptos_pagados,
        CASE 
          WHEN COUNT(DISTINCT cp.id) > 0 
            AND COUNT(DISTINCT CASE WHEN COALESCE(pmap.monto_total, 0) >= cp.monto THEN cp.id END) = COUNT(DISTINCT cp.id)
          THEN '✅ AL DÍA'
          ELSE '❌ EN MORA'
        END as estado
      FROM estudiantes e
      LEFT JOIN carreras c ON e.carrera_id = c.id
      LEFT JOIN conceptos_pago cp ON cp.carrera_id = e.carrera_id AND cp.institucion_id = 1 AND cp.activo = true
      LEFT JOIN (
        SELECT estudiante_id, concepto_id, SUM(monto_pagado) as monto_total
        FROM pagos
        WHERE estado != 'ANULADO'
        GROUP BY estudiante_id, concepto_id
        UNION ALL
        SELECT pmd.pagos_multiples->>'estudiante_id' as estudiante_id, pmd.concepto_id, SUM(pmd.monto_pagado) as monto_total
        FROM pagos_multiples_detalle pmd
        WHERE pmd.pagos_multiples->>'estado' != 'ANULADO'
        GROUP BY pmd.pagos_multiples->>'estudiante_id', pmd.concepto_id
      ) pmap ON pmap.estudiante_id = e.id AND pmap.concepto_id = cp.id
      WHERE e.institucion_id = 1 
        AND e.estado != 'NO_VIENE_MAS'
      GROUP BY e.id, e.nombre, e.apellido, e.carrera_id, c.nombre
      HAVING COUNT(DISTINCT cp.id) > 0
      ORDER BY estado DESC, e.id DESC
      LIMIT 20
    `
  });

  if (data) {
    console.log(data);
  } else {
    console.log('Intentando con consulta alternativa...');
    
    // Query más simple
    const { data: estudiantes } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido, carrera_id')
      .eq('institucion_id', 1)
      .neq('estado', 'NO_VIENE_MAS')
      .limit(5);

    console.log('\nÚltimos 5 estudiantes:', estudiantes);
  }
}

analizar().catch(console.error);
