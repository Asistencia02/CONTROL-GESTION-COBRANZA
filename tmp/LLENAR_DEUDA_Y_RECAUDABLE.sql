-- ==================== LLENAR deuda_actual Y recaudable_año ====================

-- PASO 1: Crear función para calcular deuda actual (MARZO a MES_ACTUAL)
CREATE OR REPLACE FUNCTION calcular_deuda_estudiante(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_mes_actual integer;
    v_deuda numeric := 0;
BEGIN
    v_mes_actual := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
    
    -- Si es antes de marzo, no hay deuda (aún no empezó)
    IF v_mes_actual < 3 THEN
        RETURN 0;
    END IF;
    
    -- Sumar TODOS los conceptos de MARZO a MES_ACTUAL que NO estén pagados
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_deuda
    FROM conceptos_pago cp
    LEFT JOIN pagos p ON cp.id = p.concepto_id 
        AND p.estudiante_id = p_estudiante_id 
        AND p.estado = 'PAGADO'
        AND EXTRACT(YEAR FROM p.fecha_pago)::integer = p_año
    WHERE cp.institucion_id = p_institucion_id
      AND cp.año = p_año
      AND cp.mes >= 3 AND cp.mes <= v_mes_actual
      AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id)
      AND p.id IS NULL; -- Solo conceptos SIN pago
    
    RETURN v_deuda;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Crear función para calcular recaudable del año (MARZO a DICIEMBRE)
CREATE OR REPLACE FUNCTION calcular_recaudable_estudiante(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_recaudable numeric := 0;
BEGIN
    -- Sumar TODOS los conceptos de MARZO a DICIEMBRE
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_recaudable
    FROM conceptos_pago cp
    WHERE cp.institucion_id = p_institucion_id
      AND cp.año = p_año
      AND cp.mes >= 3 AND cp.mes <= 12
      AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id);
    
    RETURN v_recaudable;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: ACTUALIZAR campos deuda_actual y recaudable_año
UPDATE estudiantes
SET 
    deuda_actual = calcular_deuda_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    recaudable_año = calcular_recaudable_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- VERIFICAR QUE SE ACTUALIZARON
SELECT 
    COUNT(*) as total_estudiantes,
    COUNT(CASE WHEN deuda_actual > 0 THEN 1 END) as con_deuda,
    SUM(deuda_actual) as total_deuda,
    SUM(recaudable_año) as total_recaudable,
    ROUND(AVG(recaudable_año), 2) as promedio_recaudable_por_estudiante
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- Ver algunos estudiantes con deuda
SELECT 
    dni,
    nombre,
    apellido,
    deuda_actual,
    recaudable_año
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS'
  AND deuda_actual > 0
ORDER BY deuda_actual DESC
LIMIT 20;

-- Ver por carrera
SELECT 
    c.nombre as carrera,
    COUNT(e.id) as total_estudiantes,
    COUNT(CASE WHEN e.deuda_actual > 0 THEN 1 END) as en_mora,
    SUM(e.deuda_actual) as total_deuda,
    SUM(e.recaudable_año) as total_recaudable,
    ROUND(AVG(e.recaudable_año), 2) as promedio_recaudable
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;
