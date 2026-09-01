-- ==================== DEBUG: Desglose de deuda_actual ====================

-- 1. Ver deuda por tipo de concepto
SELECT 
    cp.tipo,
    COUNT(DISTINCT e.id) as estudiantes_con_deuda,
    SUM(cp.monto) as monto_total_adeudado
FROM conceptos_pago cp
LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estado = 'PAGADO'
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND e.estado <> 'NO_VIENE_MAS'
  AND (
    (cp.tipo = 'INSCRIPCION') OR
    (cp.tipo = 'SEGURO') OR
    (cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer)
  )
  AND p.id IS NULL
GROUP BY cp.tipo
ORDER BY cp.tipo;

-- 2. Ver si INSCRIPCIÓN está pagada o no
SELECT 
    'INSCRIPCIÓN' as concepto,
    COUNT(DISTINCT e.id) as total_estudiantes,
    (SELECT COUNT(DISTINCT e2.id) FROM estudiantes e2 WHERE e2.institucion_id = 2 AND e2.estado <> 'NO_VIENE_MAS') as estudiantes_activos,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN e.id END) as con_inscripcion_pagada,
    COUNT(DISTINCT CASE WHEN p.id IS NULL THEN e.id END) as sin_inscripcion_pagada
FROM conceptos_pago cp
LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estado = 'PAGADO'
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'INSCRIPCION'
  AND e.estado <> 'NO_VIENE_MAS';

-- 3. Ver si SEGURO está pagado o no
SELECT 
    'SEGURO' as concepto,
    COUNT(DISTINCT e.id) as total_estudiantes,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN e.id END) as con_seguro_pagado,
    COUNT(DISTINCT CASE WHEN p.id IS NULL THEN e.id END) as sin_seguro_pagado
FROM conceptos_pago cp
LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estado = 'PAGADO'
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'SEGURO'
  AND e.estado <> 'NO_VIENE_MAS';

-- 4. Desglose EXACTO de deuda_actual actual en la tabla
SELECT 
    COUNT(*) as estudiantes,
    SUM(deuda_actual) as total_deuda,
    MIN(deuda_actual) as min_deuda,
    MAX(deuda_actual) as max_deuda,
    AVG(deuda_actual) as avg_deuda
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- 5. Distribución de deuda_actual
SELECT 
    deuda_actual,
    COUNT(*) as estudiantes
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS'
  AND deuda_actual > 0
GROUP BY deuda_actual
ORDER BY deuda_actual DESC
LIMIT 20;
