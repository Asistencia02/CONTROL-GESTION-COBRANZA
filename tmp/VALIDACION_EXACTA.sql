-- ==================== VALIDACIÓN CON NÚMEROS EXACTOS ====================

-- 1. Calcular recaudable esperado POR CARRERA
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    (SELECT SUM(monto) FROM conceptos_pago cp WHERE cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026) as monto_por_estudiante,
    COUNT(DISTINCT e.id) * (SELECT SUM(monto) FROM conceptos_pago cp WHERE cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026) as recaudable_esperado_año,
    ROUND(
        COUNT(DISTINCT e.id) * (
            SELECT SUM(monto) 
            FROM conceptos_pago cp 
            WHERE cp.carrera_id = c.id 
              AND cp.institucion_id = 2 
              AND cp.año = 2026
              AND (cp.tipo IN ('CUOTA', 'SEGURO'))
        ) / 10.0,
        2
    ) as recaudable_mes
FROM estudiantes e
RIGHT JOIN carreras c ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre;

-- 2. Total general
SELECT 
    'TOTAL' as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    SUM(e.recaudable_año) as recaudable_actual,
    SUM(COALESCE(e.deuda_actual, 0)) as deuda_actual,
    ROUND(SUM(COALESCE(e.deuda_actual, 0)) / COUNT(DISTINCT e.id), 2) as deuda_promedio_por_estudiante
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- 3. Validación de coherencia
WITH datos AS (
    SELECT 
        SUM(e.recaudable_año)::numeric as rec_año,
        SUM(COALESCE(e.deuda_actual, 0))::numeric as deuda_actual,
        SUM(COALESCE(p.monto_pagado, 0))::numeric as cobrado
    FROM estudiantes e
    LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO'
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    'Recaudable Año' as metrica,
    ROUND(rec_año, 2) as valor
FROM datos
UNION ALL
SELECT 'Cobrado hasta hoy', ROUND(cobrado, 2) FROM datos
UNION ALL
SELECT 'Deuda actual', ROUND(deuda_actual, 2) FROM datos
UNION ALL
SELECT 'Pendiente teórico', ROUND(rec_año - cobrado, 2) FROM datos
UNION ALL
SELECT 'Diferencia con deuda', ROUND(ABS((rec_año - cobrado) - deuda_actual), 2) FROM datos;
