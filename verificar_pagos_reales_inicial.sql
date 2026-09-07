-- VERIFICAR PAGOS REALES POR CARRERA Y ESTUDIANTE
-- NIVEL INICIAL

SELECT 
  e.id as estudiante_id,
  e.nombre || ' ' || e.apellido as estudiante,
  COUNT(DISTINCT pmd.concepto_id) as conceptos_pagados,
  SUM(pmd.monto_pagado) as total_pagado_por_estudiante
FROM pagos_multiples pm
JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
JOIN estudiantes e ON e.id = pm.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE c.id = 2 -- Nivel Inicial
  AND e.institucion_id = 2
  AND pm.institucion_id = 2
  AND pm.estado != 'ANULADO'
GROUP BY e.id, e.nombre, e.apellido
ORDER BY total_pagado_por_estudiante DESC;

-- TOTAL POR CARRERA
SELECT 
  c.nombre as carrera,
  COUNT(DISTINCT e.id) as estudiantes_con_pago,
  SUM(pmd.monto_pagado) as total_recaudado
FROM pagos_multiples pm
JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
JOIN estudiantes e ON e.id = pm.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE c.id = 2 -- Nivel Inicial
  AND e.institucion_id = 2
  AND pm.institucion_id = 2
  AND pm.estado != 'ANULADO'
GROUP BY c.id, c.nombre;

-- COMPARAR CON TU NÚMERO DE EXCEL: 1.298.000
