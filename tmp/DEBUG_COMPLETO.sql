-- ==================== DEBUG COMPLETO ====================

-- 1. Total recaudable año (debería ser $62.400.000)
SELECT 
    'TOTAL_RECAUDABLE_AÑO' as metrica,
    SUM(e.recaudable_año) as total,
    COUNT(DISTINCT e.id) as estudiantes
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- 2. Total cobrado en el año (debería ser $56.892.136)
SELECT 
    'TOTAL_COBRADO_AÑO' as metrica,
    SUM(p.monto_pagado) as total,
    COUNT(DISTINCT p.estudiante_id) as estudiantes
FROM pagos p
JOIN estudiantes e ON p.estudiante_id = e.id
WHERE p.institucion_id = 2
  AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026
  AND p.estado = 'PAGADO'
  AND e.estado <> 'NO_VIENE_MAS';

-- 3. Total deuda actual (MARZO a MES_ACTUAL sin pagar)
SELECT 
    'TOTAL_DEUDA_ACTUAL' as metrica,
    SUM(e.deuda_actual) as total,
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id END) as estudiantes_con_deuda
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- 4. Por carrera - DETALLADO
SELECT 
    c.nombre as carrera,
    SUM(e.recaudable_año)::numeric as recaudable_año,
    COALESCE(SUM(p.monto_pagado), 0)::numeric as cobrado,
    SUM(e.deuda_actual)::numeric as deuda_actual,
    COUNT(DISTINCT e.id) as total_est,
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id END) as en_mora,
    ROUND(COALESCE(SUM(p.monto_pagado), 0) / NULLIF(SUM(e.recaudable_año), 0) * 100, 2) as pct_cobro
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO'
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre;

-- 5. VALIDACIÓN: ¿Es coherente?
WITH totales AS (
    SELECT 
        SUM(e.recaudable_año) as rec_año,
        SUM(COALESCE(e.deuda_actual, 0)) as deuda_actual,
        SUM(p.monto_pagado) as cobrado
    FROM estudiantes e
    LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO'
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    rec_año,
    cobrado,
    deuda_actual,
    (rec_año - cobrado) as pendiente_teorico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '❌ INCOHERENTE - Diferencia: ' || ABS((rec_año - cobrado) - deuda_actual)::text
    END as validacion
FROM totales;
