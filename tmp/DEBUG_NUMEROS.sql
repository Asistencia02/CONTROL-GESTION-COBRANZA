-- ==================== DEBUG: Ver qué está pasando ====================

-- 1. Ver total de PAGOS pagados en el año
SELECT 
    SUM(monto_pagado) as total_pagado,
    COUNT(*) as cantidad_pagos
FROM pagos
WHERE institucion_id = 2
  AND EXTRACT(YEAR FROM fecha_pago)::integer = 2026
  AND estado = 'PAGADO';

-- 2. Ver total por carrera (REAL)
SELECT 
    e.carrera_id,
    c.nombre as carrera,
    SUM(p.monto_pagado) as total_pagado,
    COUNT(p.id) as cantidad_pagos,
    COUNT(DISTINCT e.id) as estudiantes_con_pago
FROM pagos p
JOIN estudiantes e ON p.estudiante_id = e.id
JOIN carreras c ON e.carrera_id = c.id
WHERE p.institucion_id = 2
  AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026
  AND p.estado = 'PAGADO'
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY e.carrera_id, c.nombre;

-- 3. Ver CONCEPTOS total (qué debería recaudarse)
SELECT 
    cp.carrera_id,
    c.nombre as carrera,
    SUM(cp.monto) as total_conceptos,
    COUNT(DISTINCT cp.id) as cantidad_conceptos
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
GROUP BY cp.carrera_id, c.nombre;

-- 4. Ver si hay deuda_actual rellenado
SELECT 
    COUNT(*) as total_estudiantes,
    COUNT(CASE WHEN deuda_actual > 0 THEN 1 END) as con_deuda,
    SUM(deuda_actual) as total_deuda,
    SUM(recaudable_año) as total_recaudable
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';
