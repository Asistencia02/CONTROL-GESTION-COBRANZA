-- ==================== MODIFICACIONES - DEUDA SOLO MES ACTUAL ====================
-- Implementación de:
-- DEUDA = INSCRIPCIÓN + CUOTAS(MARZO a MES_ACTUAL) + SEGURO (vencido)
-- RECAUDABLE = INSCRIPCIÓN + CUOTAS(MARZO a DICIEMBRE) + SEGURO

-- ==================== PASO 1: AGREGAR CAMPOS A ESTUDIANTES ====================

ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS deuda_actual numeric DEFAULT 0;
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS recaudable_año numeric DEFAULT 0;

-- ==================== PASO 2: CREAR FUNCIONES SQL ====================

-- ✅ FUNCIÓN 1: Calcular DEUDA ACTUAL (solo conceptos vencidos)
CREATE OR REPLACE FUNCTION calcular_deuda_actual(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_mes_actual integer;
    v_deuda numeric := 0;
BEGIN
    v_mes_actual := EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- Solo calcular si estamos entre MARZO (3) y DICIEMBRE (12)
    IF v_mes_actual < 3 THEN
        v_mes_actual := 3; -- Si es antes de marzo, contar desde marzo
    END IF;
    
    -- INSCRIPCIÓN
    SELECT COALESCE(SUM(cp.monto - COALESCE(p.monto_pagado, 0)), 0) INTO v_deuda
    FROM conceptos_pago cp
    LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estudiante_id = p_estudiante_id AND p.estado = 'PAGADO'
    WHERE cp.institucion_id = p_institucion_id 
      AND cp.tipo = 'INSCRIPCION' 
      AND cp.año = p_año
      AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id);
    
    -- CUOTAS (MARZO a MES_ACTUAL)
    v_deuda := v_deuda + (
        SELECT COALESCE(SUM(cp.monto - COALESCE(p.monto_pagado, 0)), 0)
        FROM conceptos_pago cp
        LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estudiante_id = p_estudiante_id AND p.estado = 'PAGADO'
        WHERE cp.institucion_id = p_institucion_id 
          AND cp.tipo = 'CUOTA' 
          AND cp.año = p_año
          AND cp.mes >= 3 AND cp.mes <= v_mes_actual
          AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id)
    );
    
    -- SEGURO (solo si mes vencido es DICIEMBRE o anterior a mes actual)
    v_deuda := v_deuda + (
        SELECT COALESCE(SUM(cp.monto - COALESCE(p.monto_pagado, 0)), 0)
        FROM conceptos_pago cp
        LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estudiante_id = p_estudiante_id AND p.estado = 'PAGADO'
        WHERE cp.institucion_id = p_institucion_id 
          AND cp.tipo = 'SEGURO' 
          AND cp.año = p_año
          AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id)
    );
    
    RETURN GREATEST(v_deuda, 0);
END;
$$ LANGUAGE plpgsql;

-- ✅ FUNCIÓN 2: Calcular RECAUDABLE AÑO (todos los conceptos del año)
CREATE OR REPLACE FUNCTION calcular_recaudable_año(p_estudiante_id bigint, p_institucion_id bigint, p_año integer)
RETURNS numeric AS $$
DECLARE
    v_recaudable numeric := 0;
BEGIN
    -- INSCRIPCIÓN
    SELECT COALESCE(SUM(cp.monto), 0) INTO v_recaudable
    FROM conceptos_pago cp
    WHERE cp.institucion_id = p_institucion_id 
      AND cp.tipo = 'INSCRIPCION' 
      AND cp.año = p_año
      AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id);
    
    -- CUOTAS (MARZO a DICIEMBRE)
    v_recaudable := v_recaudable + (
        SELECT COALESCE(SUM(cp.monto), 0)
        FROM conceptos_pago cp
        WHERE cp.institucion_id = p_institucion_id 
          AND cp.tipo = 'CUOTA' 
          AND cp.año = p_año
          AND cp.mes >= 3 AND cp.mes <= 12
          AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id)
    );
    
    -- SEGURO
    v_recaudable := v_recaudable + (
        SELECT COALESCE(SUM(cp.monto), 0)
        FROM conceptos_pago cp
        WHERE cp.institucion_id = p_institucion_id 
          AND cp.tipo = 'SEGURO' 
          AND cp.año = p_año
          AND cp.carrera_id = (SELECT carrera_id FROM estudiantes WHERE id = p_estudiante_id)
    );
    
    RETURN GREATEST(v_recaudable, 0);
END;
$$ LANGUAGE plpgsql;

-- ==================== PASO 3: CREAR VISTA NUEVA (CORREGIDA) ====================

CREATE OR REPLACE VIEW v_deuda_estudiantes AS
SELECT 
    e.id,
    e.dni,
    (e.nombre || ' ' || e.apellido) AS nombre_completo,
    c.nombre AS carrera,
    i.nombre AS institucion,
    e.estado,
    
    -- Conceptos totales (MARZO a DICIEMBRE)
    (SELECT COUNT(DISTINCT cp.id)
     FROM conceptos_pago cp
     WHERE cp.institucion_id = e.institucion_id
       AND cp.carrera_id = e.carrera_id
       AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)
       AND cp.mes >= 3 AND cp.mes <= 12) AS conceptos_totales,
    
    -- Conceptos pagados (MARZO a MES_ACTUAL)
    (SELECT COUNT(DISTINCT cp.id)
     FROM conceptos_pago cp
     JOIN pagos p ON cp.id = p.concepto_id AND p.estudiante_id = e.id
     WHERE cp.institucion_id = e.institucion_id
       AND cp.carrera_id = e.carrera_id
       AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)
       AND p.estado = 'PAGADO'
       AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)) AS conceptos_pagados,
    
    -- Conceptos adeudados (MARZO a MES_ACTUAL)
    (SELECT COUNT(DISTINCT cp.id)
     FROM conceptos_pago cp
     LEFT JOIN pagos p ON cp.id = p.concepto_id AND p.estudiante_id = e.id AND p.estado = 'PAGADO'
     WHERE cp.institucion_id = e.institucion_id
       AND cp.carrera_id = e.carrera_id
       AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)
       AND (p.id IS NULL OR p.estado <> 'PAGADO')
       AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)) AS conceptos_adeudados,
    
    -- DEUDA ACTUAL (MARZO a MES_ACTUAL)
    COALESCE(e.deuda_actual, 0) AS total_adeudado,
    
    -- RECAUDABLE AÑO (MARZO a DICIEMBRE)
    COALESCE(e.recaudable_año, 0) AS total_recaudable,
    
    -- Timestamp última actualización
    e.última_actualización_deuda
    
FROM estudiantes e
JOIN instituciones i ON e.institucion_id = i.id
JOIN carreras c ON e.carrera_id = c.id
WHERE e.estado <> 'NO_VIENE_MAS';

-- ==================== PASO 4: CREAR FUNCIÓN PARA ACTUALIZAR DEUDAS ====================

CREATE OR REPLACE FUNCTION actualizar_deudas_estudiantes()
RETURNS void AS $$
DECLARE
    v_año integer := EXTRACT(YEAR FROM CURRENT_DATE);
    v_fila RECORD;
BEGIN
    -- Actualizar deuda_actual y recaudable_año para todos los estudiantes
    FOR v_fila IN SELECT id, institucion_id FROM estudiantes WHERE estado <> 'NO_VIENE_MAS' LOOP
        UPDATE estudiantes
        SET 
            deuda_actual = calcular_deuda_actual(v_fila.id, v_fila.institucion_id, v_año),
            recaudable_año = calcular_recaudable_año(v_fila.id, v_fila.institucion_id, v_año),
            última_actualización_deuda = CURRENT_TIMESTAMP
        WHERE id = v_fila.id;
    END LOOP;
    
    RAISE NOTICE 'Deudas actualizadas correctamente. Cantidad: %', (SELECT COUNT(*) FROM estudiantes WHERE estado <> 'NO_VIENE_MAS');
END;
$$ LANGUAGE plpgsql;

-- ==================== PASO 5: EJECUTAR PRIMERA VEZ ====================

-- Ejecutar manualmente para llenar los campos la primera vez
SELECT actualizar_deudas_estudiantes();

-- ==================== PASO 6: CREAR TRIGGER PARA 1° DEL MES ====================

-- Nota: En Supabase, usa pg_cron extension
-- Ejecutar este comando SOLO UNA VEZ:

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear job que se ejecuta el 1° de cada mes a las 00:00
SELECT cron.schedule('actualizar_deudas_primer_mes', '0 0 1 * *', 'SELECT actualizar_deudas_estudiantes()');

-- ==================== PASO 7: VERIFICAR ====================

-- Ver deudas actualizadas
SELECT 
    dni,
    nombre,
    apellido,
    deuda_actual,
    recaudable_año,
    última_actualización_deuda
FROM estudiantes
WHERE estado <> 'NO_VIENE_MAS'
ORDER BY deuda_actual DESC
LIMIT 20;

-- ==================== FIN ====================
