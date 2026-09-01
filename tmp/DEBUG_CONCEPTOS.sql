-- ==================== DEBUG: Tabla conceptos_pago ====================

-- 1. Cuántos conceptos hay por carrera
SELECT 
    c.nombre as carrera,
    COUNT(cp.id) as total_conceptos,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
RIGHT JOIN carreras c ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026 AND cp.mes >= 3 AND cp.mes <= 12
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre;

-- 2. Desglose por tipo de concepto
SELECT 
    c.nombre as carrera,
    cp.tipo,
    COUNT(cp.id) as cantidad,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
  AND c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre, cp.tipo
ORDER BY c.id, cp.tipo;

-- 3. Cuántos conceptos debería haber POR ESTUDIANTE
-- INSCRIPCIÓN (1) + CUOTAS (10: marzo-dic) + SEGURO (1) = 12 conceptos por estudiante
SELECT 
    'ESPERADO_POR_ESTUDIANTE' as tipo,
    1 as inscripcion,
    10 as cuotas,
    1 as seguro,
    12 as total;

-- 4. Si hay 624 estudiantes × 12 conceptos = 7.488 conceptos esperados TOTAL
-- Pero están repartidos entre 3 carreras
-- Primaria: 363 × 12 = 4.356
-- Secundaria: 228 × 12 = 2.736
-- Inicial: 33 × 12 = 396
SELECT 
    'TOTAL_ESPERADO' as metrica,
    COUNT(cp.id) as conceptos_reales,
    (SELECT COUNT(DISTINCT e.id) FROM estudiantes e WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS') * 12 as conceptos_esperados
FROM conceptos_pago cp
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12;

-- 5. Ver si hay duplicados (mismo concepto_id para mismo estudiante/carrera)
SELECT 
    cp.carrera_id,
    cp.tipo,
    cp.mes,
    COUNT(*) as cantidad
FROM conceptos_pago cp
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
GROUP BY cp.carrera_id, cp.tipo, cp.mes
HAVING COUNT(*) > 1;
