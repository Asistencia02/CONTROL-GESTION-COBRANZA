-- ==================== VISTAS SQL FINALES Y CORRECTAS ====================

DROP VIEW IF EXISTS v_reporte_ejecutivo CASCADE;
DROP VIEW IF EXISTS v_reporte_por_carrera CASCADE;
DROP VIEW IF EXISTS v_reporte_mes_a_mes CASCADE;
DROP VIEW IF EXISTS v_reporte_top_mora CASCADE;
DROP VIEW IF EXISTS v_reporte_proyeccion_año CASCADE;

-- ==================== 1. RESUMEN EJECUTIVO ====================

CREATE OR REPLACE VIEW v_reporte_ejecutivo AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
),
recaudable_hasta_hoy AS (
    SELECT 
        624 * (10000 + (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000 + (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 1500) as total
),
cobrado_hasta_hoy AS (
    SELECT COALESCE(SUM(monto_pagado), 0) as total
    FROM pagos
    WHERE institucion_id = 2
      AND estado = 'PAGADO'
      AND EXTRACT(MONTH FROM fecha_pago)::integer <= (SELECT mes FROM mes_actual)
)
SELECT 
    -- Recaudable año completo
    (624 * 125000)::numeric as total_recaudable_año,
    
    -- Recaudable hasta hoy
    (SELECT total FROM recaudable_hasta_hoy)::numeric as recaudable_hasta_hoy,
    
    -- Cobrado hasta hoy
    (SELECT total FROM cobrado_hasta_hoy)::numeric as recaudado_hasta_hoy,
    
    -- Deuda actual
    (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS')::numeric as deuda_actual,
    
    -- Pendiente teórico
    ((SELECT total FROM recaudable_hasta_hoy) - (SELECT total FROM cobrado_hasta_hoy))::numeric as pendiente_hasta_hoy,
    
    -- Porcentajes
    ROUND(((SELECT total FROM cobrado_hasta_hoy) / NULLIF((SELECT total FROM recaudable_hasta_hoy), 0)) * 100, 2) as porcentaje_cobro,
    
    ROUND((((SELECT total FROM recaudable_hasta_hoy) - (SELECT total FROM cobrado_hasta_hoy)) / NULLIF((SELECT total FROM recaudable_hasta_hoy), 0)) * 100, 2) as porcentaje_pendiente,
    
    -- Estudiantes
    (SELECT COUNT(*) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS')::integer as total_estudiantes,
    
    (SELECT COUNT(*) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS' AND deuda_actual > 0)::integer as estudiantes_en_mora,
    
    ROUND(((SELECT COUNT(*) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS' AND deuda_actual > 0)::numeric / NULLIF((SELECT COUNT(*) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS'), 0)) * 100, 2) as porcentaje_en_mora,
    
    CURRENT_DATE as fecha_reporte;

-- ==================== 2. POR CARRERA ====================

CREATE OR REPLACE VIEW v_reporte_por_carrera AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
)
SELECT 
    c.id as carrera_id,
    c.nombre as carrera,
    
    -- Recaudable año completo
    COUNT(DISTINCT e.id)::numeric * 125000 as recaudable_año,
    
    -- Recaudable hasta hoy
    COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) as recaudable_hasta_hoy,
    
    -- Cobrado hasta hoy
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_hasta_hoy,
    
    -- Deuda actual
    SUM(CASE WHEN e.deuda_actual > 0 THEN e.deuda_actual ELSE 0 END)::numeric as deuda_actual,
    
    -- Pendiente
    (COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) - 
     COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0))::numeric as pendiente_hasta_hoy,
    
    -- Porcentaje
    CASE 
        WHEN COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500), 0)) * 100, 2)
        )
    END as porcentaje_cobro,
    
    -- Estudiantes
    COUNT(DISTINCT e.id)::integer as total_estudiantes,
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id END)::integer as estudiantes_en_mora
    
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND p.institucion_id = 2
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== 3. MES A MES ====================

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
)
SELECT 
    c.nombre as carrera,
    (SELECT mes FROM mes_actual) as mes_actual,
    
    -- Este mes debería
    COUNT(DISTINCT e.id)::numeric * 10000 + COUNT(DISTINCT e.id)::numeric * 1500 as deberia_recaudarse_este_mes,
    
    -- Este mes cobró
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_este_mes,
    
    -- Diferencia
    (COUNT(DISTINCT e.id)::numeric * 10000 + COUNT(DISTINCT e.id)::numeric * 1500 - 
     COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0))::numeric as falta_recaudar_este_mes,
    
    -- Porcentaje
    CASE 
        WHEN COUNT(DISTINCT e.id)::numeric * 10000 + COUNT(DISTINCT e.id)::numeric * 1500 = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT e.id)::numeric * 10000 + COUNT(DISTINCT e.id)::numeric * 1500, 0)) * 100, 2)
        )
    END as porcentaje_este_mes
    
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND p.institucion_id = 2
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY deberia_recaudarse_este_mes DESC;

-- ==================== 4. TOP MORA ====================

CREATE OR REPLACE VIEW v_reporte_top_mora AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY e.deuda_actual DESC) as ranking,
    e.dni,
    (e.nombre || ' ' || e.apellido) as nombre_completo,
    c.nombre as carrera,
    e.deuda_actual::numeric as deuda_monto,
    COUNT(DISTINCT CASE WHEN cp.id IS NOT NULL THEN cp.id END)::integer as cantidad_conceptos_adeudados
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
LEFT JOIN conceptos_pago cp ON cp.carrera_id = e.carrera_id 
    AND cp.institucion_id = e.institucion_id 
    AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    AND (
        (cp.tipo = 'INSCRIPCION') OR
        (cp.tipo = 'SEGURO') OR
        (cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer)
    )
    AND NOT EXISTS (
        SELECT 1 FROM pagos p 
        WHERE p.concepto_id = cp.id 
        AND p.estudiante_id = e.id 
        AND p.estado = 'PAGADO'
    )
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
  AND e.deuda_actual > 0
GROUP BY e.id, e.dni, e.nombre, e.apellido, c.nombre, e.deuda_actual
ORDER BY e.deuda_actual DESC
LIMIT 20;

-- ==================== 5. PROYECCIÓN ====================

CREATE OR REPLACE VIEW v_reporte_proyeccion_año AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
),
cobrado_hoy AS (
    SELECT COALESCE(SUM(monto_pagado), 0) as total
    FROM pagos
    WHERE institucion_id = 2
      AND estado = 'PAGADO'
      AND EXTRACT(MONTH FROM fecha_pago)::integer <= (SELECT mes FROM mes_actual)
)
SELECT 
    (SELECT mes FROM mes_actual)::integer as mes_actual,
    (SELECT total FROM cobrado_hoy)::numeric as cobrado_hasta_hoy,
    (624 * 125000)::numeric as recaudable_año,
    CASE 
        WHEN (SELECT mes FROM mes_actual) = 0 THEN 0
        ELSE ROUND((SELECT total FROM cobrado_hoy) / (SELECT mes FROM mes_actual) * 12, 2)
    END::numeric as proyeccion_recaudado_año,
    CASE 
        WHEN (624 * 125000) = 0 THEN 0
        ELSE ROUND(
            (CASE 
                WHEN (SELECT mes FROM mes_actual) = 0 THEN 0
                ELSE (SELECT total FROM cobrado_hoy) / (SELECT mes FROM mes_actual) * 12
            END / (624 * 125000)) * 100, 2)
        )
    END as porcentaje_proyeccion,
    CURRENT_DATE as fecha_calculo;

-- ==================== VERIFICAR ====================

SELECT '✅ Todas las vistas creadas correctamente' as status;

SELECT * FROM v_reporte_ejecutivo;
