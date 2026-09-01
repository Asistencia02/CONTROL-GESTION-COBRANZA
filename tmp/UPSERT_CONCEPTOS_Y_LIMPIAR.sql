-- ==================== CREAR FUNCIÓN UPSERT PARA CONCEPTOS ====================

CREATE OR REPLACE FUNCTION upsert_conceptos_pago(
    p_institucion_id bigint,
    p_carrera_id integer,
    p_nombre varchar,
    p_tipo varchar,
    p_monto numeric,
    p_mes integer,
    p_año integer
)
RETURNS TABLE (
    action varchar,
    concepto_id bigint,
    mensaje varchar
) AS $$
DECLARE
    v_concepto_id bigint;
BEGIN
    -- Buscar si existe un concepto idéntico
    SELECT id INTO v_concepto_id
    FROM conceptos_pago
    WHERE institucion_id = p_institucion_id
      AND carrera_id = p_carrera_id
      AND tipo = p_tipo
      AND mes IS NOT DISTINCT FROM p_mes
      AND año = p_año
      AND activo = true
    LIMIT 1;
    
    IF v_concepto_id IS NOT NULL THEN
        -- UPDATE: El concepto ya existe, actualizar monto y nombre
        UPDATE conceptos_pago
        SET 
            nombre = p_nombre,
            monto = p_monto
        WHERE id = v_concepto_id;
        
        RETURN QUERY SELECT 'UPDATE'::varchar, v_concepto_id, 'Concepto actualizado'::varchar;
    ELSE
        -- INSERT: El concepto no existe, crear uno nuevo
        INSERT INTO conceptos_pago (
            institucion_id,
            carrera_id,
            nombre,
            tipo,
            monto,
            mes,
            año,
            activo,
            dias_vencimiento
        ) VALUES (
            p_institucion_id,
            p_carrera_id,
            p_nombre,
            p_tipo,
            p_monto,
            p_mes,
            p_año,
            true,
            0
        )
        RETURNING id INTO v_concepto_id;
        
        RETURN QUERY SELECT 'INSERT'::varchar, v_concepto_id, 'Concepto creado'::varchar;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================== LIMPIAR DUPLICADOS ====================

-- PASO 1: Identificar duplicados
SELECT 
    institucion_id,
    carrera_id,
    tipo,
    mes,
    año,
    COUNT(*) as cantidad,
    ARRAY_AGG(id) as ids
FROM conceptos_pago
WHERE institucion_id = 2
  AND año = 2026
GROUP BY institucion_id, carrera_id, tipo, mes, año
HAVING COUNT(*) > 1;

-- PASO 2: MANTENER EL PRIMERO, ELIMINAR DUPLICADOS
DELETE FROM conceptos_pago
WHERE id NOT IN (
    SELECT DISTINCT ON (institucion_id, carrera_id, tipo, mes, año) id
    FROM conceptos_pago
    WHERE institucion_id = 2
      AND año = 2026
    ORDER BY institucion_id, carrera_id, tipo, mes, año, id
);

-- PASO 3: VERIFICAR QUE NO HAY MÁS DUPLICADOS
SELECT 
    'Después de limpiar' as paso,
    COUNT(*) as total_conceptos,
    COUNT(DISTINCT (institucion_id, carrera_id, tipo, mes, año)) as conceptos_unicos
FROM conceptos_pago
WHERE institucion_id = 2
  AND año = 2026;

-- ==================== RECALCULAR recaudable_año CON LOS CONCEPTOS LIMPIOS ====================

UPDATE estudiantes
SET 
    recaudable_año = calcular_recaudable_estudiante(id, institucion_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    última_actualización_deuda = CURRENT_TIMESTAMP
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- VERIFICAR
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
    rec_año,
    cobrado,
    deuda_actual,
    (rec_año - cobrado) as pendiente_teorico,
    CASE 
        WHEN ABS((rec_año - cobrado) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '❌ INCOHERENTE'
    END as validacion
FROM totales;
