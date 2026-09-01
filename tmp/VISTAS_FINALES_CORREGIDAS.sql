-- ==================== VISTAS CORREGIDAS FINAL ====================
-- Ahora usan los campos deuda_actual y recaudable_año que ya están llenos

DROP VIEW IF EXISTS v_reporte_resumen_general CASCADE;
DROP VIEW IF EXISTS v_reporte_por_carrera CASCADE;
DROP VIEW IF EXISTS v_reporte_mes_a_mes CASCADE;
DROP VIEW IF EXISTS v_reporte_top_mora CASCADE;
DROP VIEW IF EXISTS v_reporte_ejecutivo CASCADE;
DROP VIEW IF EXISTS v_reporte_proyeccion_año CASCADE;

-- ==================== 1. RESUMEN GENERAL ====================

CREATE OR REPLACE VIEW v_reporte_resumen_general AS
SELECT 
    'TOTAL_RECAUDABLE_AÑO' as periodo,
    SUM(e.recaudable_año) as total_recaudable,
    COUNT(DISTINCT e.id) as total_estudiantes,
    ROUND(SUM(e.recaudable_año) / COUNT(DISTINCT e.id), 2) as promedio_por_estudiante,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as año
FROM estudiantes e
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'

UNION ALL

SELECT 
    'COBRADO_HASTA_HOY' as periodo,
    COALESCE(SUM(p.monto_pagado), 0) as total_recaudable,
    COUNT(DISTINCT p.estudiante_id) as total_estudiantes,
    ROUND(COALESCE(SUM(p.monto_pagado), 0) / COUNT(DISTINCT p.estudiante_id), 2) as promedio_por_estudiante,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as año
FROM pagos p
JOIN estudiantes e ON p.estudiante_id = e.id
WHERE p.institucion_id = 2
  AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  AND p.estado = 'PAGADO'
  AND e.estado <> 'NO_VIENE_MAS';

-- ==================== 2. POR CARRERA ====================

CREATE OR REPLACE VIEW v_reporte_por_carrera AS
SELECT 
    c.id as carrera_id,
    c.nombre as carrera,
    
    -- TOTAL RECAUDABLE DEL AÑO
    SUM(e.recaudable_año)::numeric as recaudable_año,
    
    -- LO REALMENTE COBRADO (TODOS LOS PAGOS DEL AÑO)
    COALESCE(SUM(p.monto_pagado), 0)::numeric as realmente_recaudado_hasta_hoy,
    
    -- LO PENDIENTE (Recaudable - Cobrado)
    (SUM(e.recaudable_año) - COALESCE(SUM(p.monto_pagado), 0))::numeric as pendiente_hasta_hoy,
    
    -- PORCENTAJE DE COBRO
    CASE 
        WHEN SUM(e.recaudable_año) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(p.monto_pagado), 0) / SUM(e.recaudable_año)) * 100, 2
        )
    END as porcentaje_cobro_hasta_hoy,
    
    -- ESTUDIANTES
    COUNT(DISTINCT e.id)::integer as total_estudiantes,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END)::integer as estudiantes_pagadores,
    (COUNT(DISTINCT e.id) - COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END))::integer as estudiantes_en_mora
    
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer AND p.estado = 'PAGADO'
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== 3. MES A MES ====================

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
WITH mes_actual_data AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
)
SELECT 
    c.nombre as carrera,
    (SELECT mes FROM mes_actual_data) as mes_actual,
    
    -- ESTE MES DEBERÍA RECAUDARSE
    SUM(CASE WHEN cp.mes = (SELECT mes FROM mes_actual_data) THEN cp.monto ELSE 0 END)::numeric as deberia_recaudarse_este_mes,
    
    -- ESTE MES SE RECAUDÓ
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual_data) THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_este_mes,
    
    -- DIFERENCIA
    (SUM(CASE WHEN cp.mes = (SELECT mes FROM mes_actual_data) THEN cp.monto ELSE 0 END) - 
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual_data) THEN p.monto_pagado ELSE 0 END), 0))::numeric as falta_recaudar_este_mes,
    
    -- PORCENTAJE
    CASE 
        WHEN SUM(CASE WHEN cp.mes = (SELECT mes FROM mes_actual_data) THEN cp.monto ELSE 0 END) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = (SELECT mes FROM mes_actual_data) THEN p.monto_pagado ELSE 0 END), 0) / 
            NULLIF(SUM(CASE WHEN cp.mes = (SELECT mes FROM mes_actual_data) THEN cp.monto ELSE 0 END), 0)) * 100, 2
        )
    END as porcentaje_este_mes
    
FROM carreras c
LEFT JOIN conceptos_pago cp ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
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
    COALESCE(e.deuda_actual, 0)::numeric as deuda_monto,
    
    -- Meses adeudados (conceptos sin pagar)
    STRING_AGG(DISTINCT 
        CASE cp.mes 
            WHEN 3 THEN 'MAR' WHEN 4 THEN 'ABR' WHEN 5 THEN 'MAY' WHEN 6 THEN 'JUN'
            WHEN 7 THEN 'JUL' WHEN 8 THEN 'AGO' WHEN 9 THEN 'SEP' WHEN 10 THEN 'OCT'
            WHEN 11 THEN 'NOV' WHEN 12 THEN 'DIC'
        END, ', ' ORDER BY 
        CASE cp.mes 
            WHEN 3 THEN 'MAR' WHEN 4 THEN 'ABR' WHEN 5 THEN 'MAY' WHEN 6 THEN 'JUN'
            WHEN 7 THEN 'JUL' WHEN 8 THEN 'AGO' WHEN 9 THEN 'SEP' WHEN 10 THEN 'OCT'
            WHEN 11 THEN 'NOV' WHEN 12 THEN 'DIC'
        END
    ) as meses_adeudados,
    
    COUNT(DISTINCT CASE WHEN p.id IS NULL OR p.estado <> 'PAGADO' THEN cp.id ELSE NULL END)::integer as cantidad_conceptos_adeudados
    
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
LEFT JOIN conceptos_pago cp ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND p.estado = 'PAGADO'
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
  AND COALESCE(e.deuda_actual, 0) > 0
GROUP BY e.id, e.dni, e.nombre, e.apellido, c.nombre, e.deuda_actual
ORDER BY e.deuda_actual DESC
LIMIT 20;

-- ==================== 5. RESUMEN EJECUTIVO ====================

CREATE OR REPLACE VIEW v_reporte_ejecutivo AS
WITH totales AS (
    SELECT 
        SUM(e.recaudable_año)::numeric as total_recaudable_año,
        COUNT(DISTINCT e.id)::integer as total_estudiantes,
        SUM(COALESCE(e.deuda_actual, 0))::numeric as total_deuda_actual,
        COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id ELSE NULL END)::integer as estudiantes_en_mora
    FROM estudiantes e
    WHERE e.institucion_id = 2
      AND e.estado <> 'NO_VIENE_MAS'
),
pagos_año AS (
    SELECT 
        SUM(p.monto_pagado)::numeric as total_cobrado,
        COUNT(DISTINCT p.estudiante_id)::integer as estudiantes_pagadores
    FROM pagos p
    JOIN estudiantes e ON p.estudiante_id = e.id
    WHERE p.institucion_id = 2
      AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND p.estado = 'PAGADO'
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    (SELECT total_recaudable_año FROM totales)::numeric as total_recaudable_año,
    CASE 
        WHEN (SELECT total_estudiantes FROM totales) = 0 THEN 0
        ELSE ROUND((SELECT total_recaudable_año FROM totales) / (SELECT total_estudiantes FROM totales), 2)
    END::numeric as promedio_recaudable_por_estudiante,
    
    (SELECT total_cobrado FROM pagos_año)::numeric as recaudado_hasta_hoy,
    (SELECT total_deuda_actual FROM totales)::numeric as pendiente_hasta_hoy,
    
    CASE 
        WHEN (SELECT total_recaudable_año FROM totales) = 0 THEN 0
        ELSE ROUND(((SELECT total_cobrado FROM pagos_año) / (SELECT total_recaudable_año FROM totales)) * 100, 2)
    END as porcentaje_cobro_hasta_hoy,
    
    CASE 
        WHEN (SELECT total_recaudable_año FROM totales) = 0 THEN 0
        ELSE ROUND((((SELECT total_recaudable_año FROM totales) - (SELECT total_cobrado FROM pagos_año)) / (SELECT total_recaudable_año FROM totales)) * 100, 2)
    END as porcentaje_pendiente_hasta_hoy,
    
    (SELECT total_estudiantes FROM totales)::integer as total_estudiantes,
    (SELECT estudiantes_pagadores FROM pagos_año)::integer as estudiantes_pagadores,
    (SELECT estudiantes_en_mora FROM totales)::integer as estudiantes_en_mora,
    
    ROUND(
        ((SELECT estudiantes_en_mora FROM totales)::numeric / NULLIF((SELECT total_estudiantes FROM totales), 0)) * 100, 
        2
    ) as porcentaje_estudiantes_en_mora,
    
    CURRENT_DATE as fecha_reporte;

-- ==================== 6. PROYECCIÓN ====================

CREATE OR REPLACE VIEW v_reporte_proyeccion_año AS
WITH datos_hoy AS (
    SELECT 
        EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
        SUM(p.monto_pagado)::numeric as recaudado_hasta_hoy,
        SUM(e.recaudable_año)::numeric as recaudable_año,
        COUNT(DISTINCT e.id)::integer as total_estudiantes
    FROM pagos p
    JOIN estudiantes e ON p.estudiante_id = e.id
    WHERE p.institucion_id = 2
      AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND p.estado = 'PAGADO'
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    (SELECT mes_actual FROM datos_hoy)::integer as mes_actual,
    (SELECT recaudado_hasta_hoy FROM datos_hoy)::numeric as recaudado_hasta_hoy,
    (SELECT recaudable_año FROM datos_hoy)::numeric as recaudable_año,
    
    CASE 
        WHEN (SELECT mes_actual FROM datos_hoy) = 0 THEN 0
        ELSE ROUND((SELECT recaudado_hasta_hoy FROM datos_hoy) / (SELECT mes_actual FROM datos_hoy) * 10, 2)
    END::numeric as proyeccion_recaudado_año,
    
    CASE 
        WHEN (SELECT recaudable_año FROM datos_hoy) = 0 THEN 0
        ELSE ROUND((CASE 
            WHEN (SELECT mes_actual FROM datos_hoy) = 0 THEN 0
            ELSE (SELECT recaudado_hasta_hoy FROM datos_hoy) / (SELECT mes_actual FROM datos_hoy) * 10
        END / (SELECT recaudable_año FROM datos_hoy)) * 100, 2)
    END as porcentaje_proyeccion,
    
    CURRENT_DATE as fecha_calculo;

-- ==================== VERIFICAR ====================

SELECT '✅ Vistas corregidas' as status;

SELECT * FROM v_reporte_ejecutivo;
SELECT * FROM v_reporte_por_carrera;
