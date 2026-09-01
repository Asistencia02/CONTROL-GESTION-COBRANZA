-- ==================== VALIDACIÓN CORRECTA SIN MULTIPLICACIÓN ====================

-- 1. Recaudable año (directo de estudiantes)
SELECT 
    'Recaudable Año' as metrica,
    ROUND(SUM(recaudable_año), 2) as valor
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- 2. Cobrado (con GROUP BY para evitar multiplicación)
SELECT 
    'Cobrado hasta hoy' as metrica,
    ROUND(SUM(monto_pagado), 2) as valor
FROM pagos p
JOIN estudiantes e ON p.estudiante_id = e.id
WHERE p.institucion_id = 2
  AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026
  AND p.estado = 'PAGADO'
  AND e.estado <> 'NO_VIENE_MAS';

-- 3. Deuda actual (directo de estudiantes)
SELECT 
    'Deuda Actual' as metrica,
    ROUND(SUM(deuda_actual), 2) as valor
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- 4. Pendiente teórico
WITH datos AS (
    SELECT 
        (SELECT SUM(recaudable_año) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as rec_año,
        (SELECT SUM(monto_pagado) FROM pagos p JOIN estudiantes e ON p.estudiante_id = e.id WHERE p.institucion_id = 2 AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO' AND e.estado <> 'NO_VIENE_MAS') as cobrado
)
SELECT 
    'Pendiente Teórico' as metrica,
    ROUND(rec_año - cobrado, 2) as valor
FROM datos;

-- 5. Validación
WITH datos AS (
    SELECT 
        (SELECT SUM(recaudable_año) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as rec_año,
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as deuda_actual,
        (SELECT SUM(monto_pagado) FROM pagos p JOIN estudiantes e ON p.estudiante_id = e.id WHERE p.institucion_id = 2 AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO' AND e.estado <> 'NO_VIENE_MAS') as cobrado
)
SELECT 
    ROUND(rec_año, 2) as recaudable_año,
    ROUND(cobrado, 2) as cobrado,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND(rec_año - cobrado, 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_año - cobrado) - deuda_actual), 2)::text
    END as validacion
FROM datos;
