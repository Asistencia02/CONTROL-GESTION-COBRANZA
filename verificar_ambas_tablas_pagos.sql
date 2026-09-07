-- BUSCAR PAGOS INDIVIDUALES EN TABLA 'pagos' PARA NIVEL INICIAL

SELECT 
  e.id as estudiante_id,
  e.nombre || ' ' || e.apellido as estudiante,
  COUNT(DISTINCT p.concepto_id) as conceptos_pagados,
  SUM(p.monto_pagado) as total_pagado
FROM pagos p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE c.id = 2 -- Nivel Inicial
  AND e.institucion_id = 2
  AND p.institucion_id = 2
  AND p.estado != 'ANULADO'
GROUP BY e.id, e.nombre, e.apellido
ORDER BY total_pagado DESC;

-- TOTAL PAGOS INDIVIDUALES POR CARRERA
SELECT 
  c.nombre as carrera,
  COUNT(DISTINCT e.id) as estudiantes_con_pago,
  SUM(p.monto_pagado) as total_recaudado
FROM pagos p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE c.id = 2 -- Nivel Inicial
  AND e.institucion_id = 2
  AND p.institucion_id = 2
  AND p.estado != 'ANULADO'
GROUP BY c.id, c.nombre;

-- COMPARATIVA: PAGOS INDIVIDUALES + PAGOS MULTIPLES
SELECT 
  'Pagos Individuales' as tipo,
  COALESCE(SUM(p.monto_pagado), 0) as total
FROM pagos p
JOIN estudiantes e ON e.id = p.estudiante_id
WHERE e.carrera_id = 2 AND e.institucion_id = 2 AND p.institucion_id = 2 AND p.estado != 'ANULADO'

UNION ALL

SELECT 
  'Pagos Multiples' as tipo,
  COALESCE(SUM(pmd.monto_pagado), 0) as total
FROM pagos_multiples pm
JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
JOIN estudiantes e ON e.id = pm.estudiante_id
WHERE e.carrera_id = 2 AND e.institucion_id = 2 AND pm.institucion_id = 2 AND pm.estado != 'ANULADO'

UNION ALL

SELECT 
  'TOTAL' as tipo,
  COALESCE(SUM(p.monto_pagado), 0) + COALESCE(SUM(pmd.monto_pagado), 0) as total
FROM pagos p
JOIN estudiantes e ON e.id = p.estudiante_id
LEFT JOIN pagos_multiples pm ON pm.estudiante_id = e.id AND pm.institucion_id = 2 AND pm.estado != 'ANULADO'
LEFT JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
WHERE e.carrera_id = 2 AND e.institucion_id = 2 AND p.institucion_id = 2 AND p.estado != 'ANULADO';
