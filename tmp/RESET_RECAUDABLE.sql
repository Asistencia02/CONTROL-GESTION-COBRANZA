-- ==================== RESET: Recalcular recaudable_año desde CERO ====================

-- 1. Primero, ver qué hay en estudiantes ahora
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    MIN(e.recaudable_año) as min_recaudable,
    MAX(e.recaudable_año) as max_recaudable,
    AVG(e.recaudable_año) as avg_recaudable,
    SUM(e.recaudable_año) as total_recaudable
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;

-- 2. PONER EN CERO todos los recaudable_año
UPDATE estudiantes
SET recaudable_año = 0
WHERE institucion_id = 2;

-- 3. Recalcular MANUALMENTE sin usar la función
UPDATE estudiantes e
SET recaudable_año = (
    SELECT COALESCE(SUM(cp.monto), 0)
    FROM conceptos_pago cp
    WHERE cp.institucion_id = e.institucion_id
      AND cp.carrera_id = e.carrera_id
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- 4. VERIFICAR después de recalcular
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    MIN(e.recaudable_año) as min_recaudable,
    MAX(e.recaudable_año) as max_recaudable,
    AVG(e.recaudable_año) as avg_recaudable,
    SUM(e.recaudable_año) as total_recaudable
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;

-- 5. TOTAL GENERAL
SELECT 
    COUNT(DISTINCT e.id) as total_estudiantes,
    SUM(e.recaudable_año) as total_recaudable_año,
    ROUND(AVG(e.recaudable_año), 2) as promedio_por_estudiante
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- 6. VALIDACIÓN COHERENCIA
WITH datos AS (
    SELECT 
        (SELECT SUM(recaudable_año) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as rec_año,
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as deuda_actual,
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO') as cobrado
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
