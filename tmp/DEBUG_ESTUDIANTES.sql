-- ==================== DEBUG FINAL: Ver tabla estudiantes ====================

-- 1. Ver algunos estudiantes y su recaudable_año
SELECT 
    e.id,
    e.dni,
    e.nombre,
    e.carrera_id,
    e.recaudable_año,
    e.deuda_actual
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
LIMIT 20;

-- 2. Distribución de recaudable_año
SELECT 
    ROUND(recaudable_año, -3) as rango,
    COUNT(*) as cantidad
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS'
GROUP BY ROUND(recaudable_año, -3)
ORDER BY rango;

-- 3. Ver cuántos estudiantes tienen cada valor de recaudable
SELECT 
    recaudable_año,
    COUNT(*) as cantidad
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS'
GROUP BY recaudable_año
ORDER BY recaudable_año;

-- 4. Ver si todos tienen el mismo recaudable_año
SELECT 
    COUNT(DISTINCT recaudable_año) as valores_diferentes,
    MIN(recaudable_año) as minimo,
    MAX(recaudable_año) as maximo,
    AVG(recaudable_año) as promedio,
    COUNT(*) as total_estudiantes
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';
