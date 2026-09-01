-- ==================== ARREGLAR: Función debe sumar TODOS los conceptos ====================

DROP FUNCTION IF EXISTS calcular_recaudable_estudiante(bigint, bigint, integer) CASCADE;

CREATE OR REPLACE FUNCTION calcular_recaudable_estudiante(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_carrera_id integer;
    v_recaudable numeric := 0;
BEGIN
    -- Obtener carrera_id del estudiante
    SELECT carrera_id INTO v_carrera_id
    FROM estudiantes
    WHERE id = p_estudiante_id AND institucion_id = p_institucion_id;
    
    IF v_carrera_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Sumar TODOS los conceptos del año (INSCRIPCIÓN + CUOTAS + SEGURO)
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_recaudable
    FROM conceptos_pago cp
    WHERE cp.institucion_id = p_institucion_id
      AND cp.carrera_id = v_carrera_id
      AND cp.año = p_año;
    
    RETURN v_recaudable;
END;
$$ LANGUAGE plpgsql;

-- ==================== RECALCULAR ====================

UPDATE estudiantes
SET 
    recaudable_año = calcular_recaudable_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- ==================== VERIFICAR ====================

SELECT 
    'Recaudable por estudiante' as metrica,
    COUNT(DISTINCT recaudable_año) as valores_diferentes,
    MIN(recaudable_año) as minimo,
    MAX(recaudable_año) as maximo,
    AVG(recaudable_año) as promedio
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- Total por carrera
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    ROUND(AVG(e.recaudable_año), 2) as promedio_estudiante,
    SUM(e.recaudable_año) as total_carrera
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;

-- TOTAL GENERAL
SELECT 
    'TOTAL' as metrica,
    COUNT(DISTINCT e.id) as estudiantes,
    ROUND(AVG(e.recaudable_año), 2) as promedio_estudiante,
    SUM(e.recaudable_año) as recaudable_año
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS';

-- ==================== VALIDACIÓN COHERENCIA ====================

WITH totales AS (
    SELECT 
        SUM(e.recaudable_año)::numeric as rec_año,
        SUM(COALESCE(e.deuda_actual, 0))::numeric as deuda_actual,
        SUM(COALESCE(p.monto_pagado, 0))::numeric as cobrado
    FROM estudiantes e
    LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO'
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    ROUND(rec_año, 2) as recaudable_año,
    ROUND(cobrado, 2) as cobrado,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND((rec_año - cobrado), 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_año - cobrado) - deuda_actual), 2)::text
    END as validacion
FROM totales;
