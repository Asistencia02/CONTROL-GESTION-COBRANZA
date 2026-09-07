-- ========== VERIFICACIÓN DE PAGOS POR CARRERA ==========
-- Institución 2 (MILAGROS)

-- 1. SUMA TOTAL DE PAGOS INDIVIDUALES POR CARRERA
SELECT 
  c.nombre as carrera,
  COUNT(DISTINCT p.id) as total_pagos,
  SUM(p.monto_pagado) as suma_pagos
FROM pagos p
JOIN estudiantes e ON e.id = p.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE e.institucion_id = 2 
  AND p.institucion_id = 2
  AND p.estado != 'ANULADO'
GROUP BY c.id, c.nombre
ORDER BY suma_pagos DESC;

-- 2. SUMA TOTAL DE PAGOS MÚLTIPLES (DETALLES) POR CARRERA
SELECT 
  c.nombre as carrera,
  COUNT(DISTINCT pm.id) as total_pagos_multiples,
  SUM(pmd.monto_pagado) as suma_detalles_multiples
FROM pagos_multiples pm
JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
JOIN estudiantes e ON e.id = pm.estudiante_id
JOIN carreras c ON c.id = e.carrera_id
WHERE e.institucion_id = 2 
  AND pm.institucion_id = 2
  AND pm.estado != 'ANULADO'
GROUP BY c.id, c.nombre
ORDER BY suma_detalles_multiples DESC;

-- 3. SUMA COMBINADA (PAGOS + PAGOS_MULTIPLES) POR CARRERA
SELECT 
  c.nombre as carrera,
  COALESCE(p_sum.suma_pagos, 0) as pagos_individuales,
  COALESCE(pm_sum.suma_detalles_multiples, 0) as pagos_multiples,
  COALESCE(p_sum.suma_pagos, 0) + COALESCE(pm_sum.suma_detalles_multiples, 0) as total_pagado
FROM carreras c
LEFT JOIN (
  SELECT 
    c2.id,
    SUM(p.monto_pagado) as suma_pagos
  FROM pagos p
  JOIN estudiantes e ON e.id = p.estudiante_id
  JOIN carreras c2 ON c2.id = e.carrera_id
  WHERE e.institucion_id = 2 
    AND p.institucion_id = 2
    AND p.estado != 'ANULADO'
  GROUP BY c2.id
) p_sum ON p_sum.id = c.id
LEFT JOIN (
  SELECT 
    c2.id,
    SUM(pmd.monto_pagado) as suma_detalles_multiples
  FROM pagos_multiples pm
  JOIN pagos_multiples_detalle pmd ON pmd.pago_id = pm.id
  JOIN estudiantes e ON e.id = pm.estudiante_id
  JOIN carreras c2 ON c2.id = e.carrera_id
  WHERE e.institucion_id = 2 
    AND pm.institucion_id = 2
    AND pm.estado != 'ANULADO'
  GROUP BY c2.id
) pm_sum ON pm_sum.id = c.id
WHERE c.institucion_id = 2
ORDER BY total_pagado DESC;

-- 4. COMPARAR CON TUS NÚMEROS DE EXCEL
-- Primaria: 5.016.317
-- Secundaria: 4.262.500
-- Inicial: 1.298.000
-- Higiene: 8.962.474
-- Analista: 6.600.350
