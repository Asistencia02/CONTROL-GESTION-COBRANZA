import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ujylncayqpbvowuftocl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeWxuY2F5cXBidm93dWZ0b2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYyNDIxODAsImV4cCI6MjA0MTgxODE4MH0.lj7HjKznKn85vn3N8RmBh4wBi4qYPcNMGCl1oPCVOGc'
);

const PRIMER_MES_ACADEMICO = 3;
const ULTIMO_MES_ACADEMICO = 8;
const PRIMER_DIA_VENCIMIENTO = 10;

async function debug() {
  const today = new Date();
  const diaActual = today.getDate();
  const mesActual = today.getMonth() + 1;
  const anioActual = today.getFullYear();

  console.log(`📅 Hoy: ${diaActual}/${mesActual}/${anioActual}`);

  // Obtener estudiante 871 (el nuevo)
  const { data: est871 } = await supabase
    .from('estudiantes')
    .select('id, nombre, apellido, carrera_id, carreras(nombre)')
    .eq('id', 871)
    .single();

  console.log(`\n👤 Estudiante 871:`, est871);

  // Obtener conceptos vencidos
  const { data: conceptos } = await supabase
    .from('conceptos_pago')
    .select('id, nombre, monto, mes, año, carrera_id, tipo')
    .eq('institucion_id', 1)
    .eq('activo', true);

  const conceptosVencidos = (conceptos || []).filter(c => {
    if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
      return true;
    }
    if (c.mes && c.año) {
      if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false;
      if (c.año < anioActual) return true;
      if (c.año === anioActual) {
        if (c.mes === mesActual && diaActual < PRIMER_DIA_VENCIMIENTO) return false;
        if (c.mes < mesActual) return true;
        if (c.mes === mesActual && diaActual >= PRIMER_DIA_VENCIMIENTO) return true;
      }
    }
    return false;
  });

  const conceptosDelEst871 = conceptosVencidos.filter(c => c.carrera_id === est871.carrera_id);
  console.log(`\n📚 Conceptos vencidos para carrera ${est871.carrera_id}: ${conceptosDelEst871.length}`);
  conceptosDelEst871.slice(0, 5).forEach(c => {
    console.log(`  - ${c.id}: ${c.nombre} ($${c.monto})`);
  });

  // Obtener pagos del estudiante 871
  const { data: pagos } = await supabase
    .from('pagos')
    .select('id, concepto_id, monto_pagado')
    .eq('estudiante_id', 871)
    .neq('estado', 'ANULADO');

  const { data: pagosMultiples } = await supabase
    .from('pagos_multiples_detalle')
    .select('concepto_id, monto_pagado, pagos_multiples!inner(estudiante_id)')
    .eq('pagos_multiples.estudiante_id', 871)
    .neq('pagos_multiples.estado', 'ANULADO');

  const todosPagos871 = [
    ...(pagos || []).map(p => ({ concepto_id: p.concepto_id, monto_pagado: p.monto_pagado })),
    ...(pagosMultiples || []).map(p => ({ concepto_id: p.concepto_id, monto_pagado: p.monto_pagado }))
  ];

  console.log(`\n💳 Pagos totales del estudiante 871: ${todosPagos871.length}`);

  // Analizar cada concepto
  let conceptosPagados = 0;
  let deudaTotal = 0;

  conceptosDelEst871.forEach(c => {
    const montoPago = todosPagos871
      .filter(p => p.concepto_id === c.id)
      .reduce((sum, p) => sum + p.monto_pagado, 0);

    const pagado = montoPago >= c.monto;
    if (conceptosPagados < 3) {
      console.log(`  Concepto ${c.id}: $${c.monto} → Pagado: $${montoPago} [${pagado ? '✅' : '❌'}]`);
    }

    if (pagado) {
      conceptosPagados++;
    } else {
      deudaTotal += (c.monto - montoPago);
    }
  });

  console.log(`\n✅ RESULTADO ESTUDIANTE 871:`);
  console.log(`   ${conceptosPagados}/${conceptosDelEst871.length} conceptos pagados`);
  console.log(`   Al Día: ${conceptosPagados === conceptosDelEst871.length ? 'SÍ ✅' : 'NO ❌'}`);
  console.log(`   Deuda total: $${deudaTotal}`);
}

debug().catch(console.error);
