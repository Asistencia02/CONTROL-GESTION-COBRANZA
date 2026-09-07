-- VERIFICAR SI HAY PAGOS DE OTROS AÑOS O DUPLICADOS

-- 1. VER DISTRIBUCIÓN DE PAGOS POR AÑO DE CONCEPTO
SELECT 
  c.nombre as carrera,
  cp.año,
  COUNT(DISTINCT pmd.id) as cantidad_detalles,
  SUM(pmd.monto_pagado) as total_pagado
FROM pagos_multiples_detalle pmd
JOIN pagos_multiples pm ON pm.id = pmd.pago_id
JOIN conceptos_pago cp ON cp.id = pmd.concepto_id
JOIN estudiantes e ON e.id = pm.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE e.institucion_id = 2
  AND pm.institucion_id = 2
  AND pm.estado != 'ANULADO'
  AND cp.institucion_id = 2
GROUP BY c.id, c.nombre, cp.año
ORDER BY c.nombre, cp.año;

-- 2. VER SI HAY PAGOS CON CONCEPTO_ID NULL O INVÁLIDO
SELECT 
  COUNT(DISTINCT pmd.id) as detalles_sin_concepto
FROM pagos_multiples_detalle pmd
WHERE pmd.concepto_id IS NULL;

-- 3. DETALLAR PAGOS POR CONCEPTO PARA PRIMARIA
SELECT 
  cp.nombre as concepto,
  cp.tipo,
  cp.mes,
  cp.año,
  cp.monto as monto_concepto,
  COUNT(DISTINCT pmd.id) as cantidad_pagos,
  SUM(pmd.monto_pagado) as total_pagado,
  COUNT(DISTINCT pmd.id) * cp.monto as esperado
FROM pagos_multiples_detalle pmd
JOIN pagos_multiples pm ON pm.id = pmd.pago_id
JOIN conceptos_pago cp ON cp.id = pmd.concepto_id
JOIN estudiantes e ON e.id = pm.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE c.id = 3 -- Primaria
  AND e.institucion_id = 2
  AND pm.institucion_id = 2
  AND pm.estado != 'ANULADO'
  AND cp.institucion_id = 2
GROUP BY cp.id, cp.nombre, cp.tipo, cp.mes, cp.año, cp.monto
ORDER BY cp.tipo, cp.mes;
