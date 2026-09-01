-- ==================== LIMPIAR PAGOS DUPLICADOS ====================

-- 1. Identificar cuál es el pago a mantener (el más reciente por estudiante-concepto)
CREATE TEMP TABLE pagos_validos AS
SELECT DISTINCT ON (estudiante_id, concepto_id) 
    id
FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO'
ORDER BY estudiante_id, concepto_id, fecha_pago DESC;

-- 2. Contar cuántos pagos se van a eliminar
SELECT 
    'Pagos a eliminar' as accion,
    COUNT(*) as cantidad
FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO'
  AND id NOT IN (SELECT id FROM pagos_validos);

-- 3. ELIMINAR DUPLICADOS (mantener el más reciente)
DELETE FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO'
  AND id NOT IN (SELECT id FROM pagos_validos);

-- 4. Verificar que se eliminaron
SELECT 
    'Después de limpiar' as paso,
    COUNT(*) as total_pagos,
    COUNT(DISTINCT estudiante_id) as estudiantes_con_pago,
    COUNT(DISTINCT concepto_id) as conceptos_pagados,
    SUM(monto_pagado) as total_pagado
FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO';

-- 5. Verificar que NO hay más duplicados
SELECT 
    COUNT(*) as pagos_duplicados
FROM (
    SELECT estudiante_id, concepto_id
    FROM pagos
    WHERE institucion_id = 2 AND estado = 'PAGADO'
    GROUP BY estudiante_id, concepto_id
    HAVING COUNT(*) > 1
) duplicados;

-- ==================== RECALCULAR deuda_actual ====================

UPDATE estudiantes
SET 
    deuda_actual = calcular_deuda_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- ==================== VALIDACIÓN FINAL ====================

WITH datos AS (
    SELECT 
        (SELECT SUM(recaudable_año) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as rec_año,
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as deuda_actual,
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO') as cobrado
)
SELECT 
    'VALIDACIÓN FINAL' as paso,
    ROUND(rec_año, 2) as recaudable_año,
    ROUND(cobrado, 2) as cobrado,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND(rec_año - cobrado, 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_año - cobrado) - deuda_actual), 2)::text
    END as validacion
FROM datos;

-- ==================== VER POR CARRERA ====================

SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    SUM(e.recaudable_año) as recaudable,
    SUM(COALESCE(p.monto_pagado, 0)) as cobrado,
    SUM(e.deuda_actual) as deuda,
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id END) as en_mora,
    ROUND(SUM(COALESCE(p.monto_pagado, 0)) / SUM(e.recaudable_año) * 100, 2) as pct_cobro
FROM estudiantes e
LEFT JOIN pagos p ON p.estudiante_id = e.id AND p.estado = 'PAGADO'
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
  AND c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY recaudable DESC;
