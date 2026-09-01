-- ==================== DEBUG: Conceptos por carrera ====================

-- 1. Ver TODOS los conceptos (sin filtro)
SELECT 
    c.nombre as carrera,
    cp.tipo,
    cp.mes,
    COUNT(*) as cantidad,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
GROUP BY c.id, c.nombre, cp.tipo, cp.mes
ORDER BY c.id, cp.tipo, cp.mes;

-- 2. Total de conceptos por carrera
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT cp.id) as conceptos_unicos,
    SUM(cp.monto) as monto_total_conceptos
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
GROUP BY c.id, c.nombre;

-- 3. Ver si hay conceptos duplicados (mismo tipo, mes, carrera)
SELECT 
    c.nombre as carrera,
    cp.tipo,
    cp.mes,
    COUNT(*) as cantidad
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
GROUP BY c.id, c.nombre, cp.tipo, cp.mes
HAVING COUNT(*) > 1
ORDER BY c.id, cp.tipo, cp.mes;

-- 4. Listar IDs de conceptos para Primaria
SELECT 
    cp.id,
    cp.tipo,
    cp.mes,
    cp.monto
FROM conceptos_pago cp
WHERE cp.institucion_id = 2
  AND cp.carrera_id = 5
  AND cp.año = 2026
ORDER BY cp.tipo, cp.mes;
