-- ==================== RECALCULAR TODO CORRECTAMENTE ====================

-- PASO 1: Recalcular deuda_actual (solo MARZO a MES_ACTUAL, excluir adelantados)
DROP FUNCTION IF EXISTS calcular_deuda_estudiante(bigint, bigint, integer) CASCADE;

CREATE OR REPLACE FUNCTION calcular_deuda_estudiante(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_mes_actual integer;
    v_carrera_id integer;
    v_deuda numeric := 0;
BEGIN
    v_mes_actual := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
    
    -- Si es antes de marzo, no hay deuda
    IF v_mes_actual < 3 THEN
        RETURN 0;
    END IF;
    
    -- Obtener carrera
    SELECT carrera_id INTO v_carrera_id
    FROM estudiantes
    WHERE id = p_estudiante_id;
    
    IF v_carrera_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Sumar conceptos de MARZO a MES_ACTUAL que NO estén pagados
    -- Importante: No contar pagos adelantados
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_deuda
    FROM conceptos_pago cp
    LEFT JOIN pagos p ON cp.id = p.concepto_id 
        AND p.estudiante_id = p_estudiante_id 
        AND p.estado = 'PAGADO'
        AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= v_mes_actual  -- Solo pagos del mes actual o anterior
    WHERE cp.institucion_id = p_institucion_id
      AND cp.carrera_id = v_carrera_id
      AND cp.año = p_año
      AND (
        (cp.tipo = 'INSCRIPCION' AND cp.mes IS NULL) OR
        (cp.tipo = 'SEGURO' AND cp.mes IS NULL) OR
        (cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= v_mes_actual)
      )
      AND p.id IS NULL; -- Solo conceptos SIN pago
    
    RETURN v_deuda;
END;
$$ LANGUAGE plpgsql;

-- PASO 2: Recalcular deuda_actual para todos
UPDATE estudiantes
SET 
    deuda_actual = calcular_deuda_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- PASO 3: Calcular recaudable_hasta_hoy (solo MARZO a MES_ACTUAL)
WITH recaudable_hoy AS (
    SELECT 
        SUM(
            CASE 
                WHEN cp.tipo IN ('INSCRIPCION', 'SEGURO') THEN cp.monto
                WHEN cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto
                ELSE 0
            END
        ) as total
    FROM conceptos_pago cp
    WHERE cp.institucion_id = 2
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
SELECT 'Recaudable hasta hoy (MARZO a MES_ACTUAL)' as metrica,
       ROUND(total, 2) as valor
FROM recaudable_hoy;

-- PASO 4: Cobrado hasta hoy (solo pagos de MARZO a MES_ACTUAL)
SELECT 
    'Cobrado hasta hoy (solo pagos MARZO a MES_ACTUAL)' as metrica,
    ROUND(SUM(monto_pagado), 2) as valor
FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO'
  AND EXTRACT(MONTH FROM fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer;

-- PASO 5: VALIDACIÓN FINAL
WITH datos AS (
    SELECT 
        -- Recaudable año completo
        (SELECT SUM(recaudable_año) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as rec_año_completo,
        
        -- Recaudable hasta mes actual
        (
            SELECT SUM(
                CASE 
                    WHEN cp.tipo IN ('INSCRIPCION', 'SEGURO') THEN cp.monto
                    WHEN cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto
                    ELSE 0
                END
            )
            FROM conceptos_pago cp
            WHERE cp.institucion_id = 2 AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
        ) as rec_hasta_hoy,
        
        -- Cobrado solo hasta mes actual
        (
            SELECT SUM(monto_pagado)
            FROM pagos
            WHERE institucion_id = 2 AND estado = 'PAGADO'
              AND EXTRACT(MONTH FROM fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
        ) as cobrado_hasta_hoy,
        
        -- Deuda actual (marzo a mes actual sin pagar)
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS') as deuda_actual
)
SELECT 
    ROUND(rec_año_completo, 2) as recaudable_año_completo,
    ROUND(rec_hasta_hoy, 2) as recaudable_hasta_hoy,
    ROUND(cobrado_hasta_hoy, 2) as cobrado_hasta_hoy,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND(rec_hasta_hoy - cobrado_hasta_hoy, 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual), 2)::text
    END as validacion
FROM datos;
