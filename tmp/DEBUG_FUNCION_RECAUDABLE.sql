-- ==================== DEBUG: Ver qué está pasando con recaudable_año ====================

-- 1. Ver un estudiante específico de Primaria
SELECT 
    e.id,
    e.dni,
    e.nombre,
    e.apellido,
    e.carrera_id,
    e.recaudable_año,
    calcular_recaudable_estudiante(e.id, e.institucion_id, 2026) as recaudable_calculado
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.carrera_id = 5  -- Primaria
  AND e.estado <> 'NO_VIENE_MAS'
LIMIT 5;

-- 2. Ver conceptos por carrera
SELECT 
    c.nombre as carrera,
    c.id as carrera_id,
    COUNT(cp.id) as total_conceptos,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
RIGHT JOIN carreras c ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026 AND cp.mes >= 3 AND cp.mes <= 12
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre;

-- 3. Ver si la función está filtrando por carrera correctamente
SELECT 
    'Primaria' as carrera,
    COUNT(*) as conceptos,
    SUM(monto) as monto_total
FROM conceptos_pago
WHERE institucion_id = 2
  AND carrera_id = 5
  AND año = 2026
  AND mes >= 3 AND mes <= 12;

SELECT 
    'Secundaria' as carrera,
    COUNT(*) as conceptos,
    SUM(monto) as monto_total
FROM conceptos_pago
WHERE institucion_id = 2
  AND carrera_id = 6
  AND año = 2026
  AND mes >= 3 AND mes <= 12;

SELECT 
    'Inicial' as carrera,
    COUNT(*) as conceptos,
    SUM(monto) as monto_total
FROM conceptos_pago
WHERE institucion_id = 2
  AND carrera_id = 4
  AND año = 2026
  AND mes >= 3 AND mes <= 12;

-- 4. Validación: suma de conceptos por carrera × estudiantes
SELECT 
    c.nombre as carrera,
    c.id as carrera_id,
    COUNT(DISTINCT e.id) as estudiantes,
    (SELECT SUM(monto) FROM conceptos_pago cp WHERE cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026 AND cp.mes >= 3 AND cp.mes <= 12) as monto_concepto,
    COUNT(DISTINCT e.id) * (SELECT SUM(monto) FROM conceptos_pago cp WHERE cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = 2026 AND cp.mes >= 3 AND cp.mes <= 12) as recaudable_esperado
FROM estudiantes e
RIGHT JOIN carreras c ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre;
