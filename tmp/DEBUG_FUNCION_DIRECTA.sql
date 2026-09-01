-- ==================== DEBUG: Función calcular_recaudable_estudiante ====================

-- 1. Ver un estudiante específico de cada carrera
SELECT 
    'Estudiante de Primaria' as tipo,
    e.id,
    e.carrera_id,
    e.dni,
    calcular_recaudable_estudiante(e.id, 2, 2026) as recaudable_calculado
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.carrera_id = 5
  AND e.estado <> 'NO_VIENE_MAS'
LIMIT 1;

SELECT 
    'Estudiante de Secundaria' as tipo,
    e.id,
    e.carrera_id,
    e.dni,
    calcular_recaudable_estudiante(e.id, 2, 2026) as recaudable_calculado
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.carrera_id = 6
  AND e.estado <> 'NO_VIENE_MAS'
LIMIT 1;

SELECT 
    'Estudiante de Inicial' as tipo,
    e.id,
    e.carrera_id,
    e.dni,
    calcular_recaudable_estudiante(e.id, 2, 2026) as recaudable_calculado
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.carrera_id = 4
  AND e.estado <> 'NO_VIENE_MAS'
LIMIT 1;

-- 2. Ver qué conceptos trae la función para un estudiante
-- Esto es lo que debería ver la función:
WITH estudiante_test AS (
    SELECT 
        e.id,
        e.carrera_id
    FROM estudiantes e
    WHERE e.institucion_id = 2
      AND e.carrera_id = 5
      AND e.estado <> 'NO_VIENE_MAS'
    LIMIT 1
)
SELECT 
    cp.id,
    cp.carrera_id,
    cp.tipo,
    cp.mes,
    cp.monto
FROM conceptos_pago cp, estudiante_test
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
  AND cp.carrera_id = estudiante_test.carrera_id;

-- 3. Ver todos los conceptos que hay en la tabla (sin filtro de carrera)
SELECT 
    COUNT(*) as total_conceptos,
    SUM(monto) as monto_total
FROM conceptos_pago
WHERE institucion_id = 2
  AND año = 2026
  AND mes >= 3 AND mes <= 12;
