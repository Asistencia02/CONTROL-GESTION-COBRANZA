-- ==================== REESCRIBIR FUNCIÓN calcular_recaudable_estudiante ====================

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
    
    -- DEBUG
    RAISE NOTICE 'Estudiante ID: %, Carrera: %, Institución: %', p_estudiante_id, v_carrera_id, p_institucion_id;
    
    -- Sumar conceptos: INSCRIPCIÓN + CUOTAS (MARZO-DIC) + SEGURO
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_recaudable
    FROM conceptos_pago cp
    WHERE cp.institucion_id = p_institucion_id
      AND cp.carrera_id = v_carrera_id
      AND cp.año = p_año
      AND (
        (cp.tipo = 'INSCRIPCION') OR
        (cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= 12) OR
        (cp.tipo = 'SEGURO')
      );
    
    RAISE NOTICE 'Recaudable calculado: %', v_recaudable;
    
    RETURN v_recaudable;
END;
$$ LANGUAGE plpgsql;

-- ==================== RECALCULAR CON LA FUNCIÓN ARREGLADA ====================

UPDATE estudiantes
SET 
    recaudable_año = calcular_recaudable_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- ==================== VERIFICAR ====================

SELECT 
    'Después de arreglar función' as paso,
    SUM(recaudable_año) as total_recaudable_año,
    COUNT(*) as total_estudiantes,
    ROUND(AVG(recaudable_año), 2) as promedio
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- Por carrera
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    SUM(e.recaudable_año) as total_recaudable,
    ROUND(AVG(e.recaudable_año), 2) as promedio
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;

-- ==================== VALIDACIÓN FINAL ====================

WITH totales AS (
    SELECT 
        SUM(e.recaudable_año) as rec_año,
        SUM(COALESCE(e.deuda_actual, 0)) as deuda_actual,
        SUM(COALESCE(p.monto_pagado, 0)) as cobrado
    FROM estudiantes e
    LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = 2026 AND p.estado = 'PAGADO'
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    ROUND(rec_año::numeric, 2) as recaudable_año,
    ROUND(cobrado::numeric, 2) as cobrado,
    ROUND(deuda_actual::numeric, 2) as deuda_actual,
    ROUND((rec_año - cobrado)::numeric, 2) as pendiente_teorico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '❌ INCOHERENTE - Diferencia: ' || ABS((rec_año - cobrado) - deuda_actual)::text
    END as validacion
FROM totales;
