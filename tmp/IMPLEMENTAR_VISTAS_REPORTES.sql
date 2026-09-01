-- ==================== IMPLEMENTACIÓN COMPLETA DE REPORTES ====================
-- Crea todas las vistas necesarias para los reportes de gestión de cobro

-- ==================== 1. VISTA: RESUMEN GENERAL ====================

CREATE OR REPLACE VIEW v_reporte_resumen_general AS
SELECT 
    'AÑO_COMPLETO' as periodo,
    SUM(cp.monto) as total_recaudable,
    COUNT(DISTINCT e.id) as total_estudiantes,
    ROUND(SUM(cp.monto) / COUNT(DISTINCT e.id), 2) as promedio_por_estudiante,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as año
FROM conceptos_pago cp
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  AND cp.mes >= 3 AND cp.mes <= 12
  AND e.estado <> 'NO_VIENE_MAS'

UNION ALL

SELECT 
    'HASTA_HOY' as periodo,
    SUM(cp.monto) as total_recaudable,
    COUNT(DISTINCT e.id) as total_estudiantes,
    ROUND(SUM(cp.monto) / COUNT(DISTINCT e.id), 2) as promedio_por_estudiante,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as año
FROM conceptos_pago cp
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
  AND e.estado <> 'NO_VIENE_MAS';

-- ==================== 2. VISTA: RECAUDACIÓN POR CARRERA ====================

CREATE OR REPLACE VIEW v_reporte_por_carrera AS
SELECT 
    c.id as carrera_id,
    c.nombre as carrera,
    
    -- TOTALES DEL AÑO
    SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= 12 THEN cp.monto ELSE 0 END)::numeric as recaudable_año,
    
    -- HASTA HOY DEBERÍA RECAUDARSE
    SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END)::numeric as deberia_recaudarse_hasta_hoy,
    
    -- LO RECAUDADO HASTA HOY
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer >= 3 AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_hasta_hoy,
    
    -- LO PENDIENTE (hasta hoy)
    (SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END) - 
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer >= 3 AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0))::numeric as pendiente_hasta_hoy,
    
    -- PORCENTAJE DE COBRO
    CASE 
        WHEN SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer >= 3 AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0) / 
            SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END)) * 100, 2
        )
    END as porcentaje_cobro_hasta_hoy,
    
    -- ESTUDIANTES
    COUNT(DISTINCT e.id)::integer as total_estudiantes,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END)::integer as estudiantes_pagadores,
    (COUNT(DISTINCT e.id) - COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END))::integer as estudiantes_en_mora
    
FROM carreras c
LEFT JOIN conceptos_pago cp ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
WHERE c.id IN (4, 5, 6) -- Carreras de INSM
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== 3. VISTA: COMPARATIVA MES A MES ====================

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
SELECT 
    c.nombre as carrera,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
    
    -- ESTE MES DEBERÍA RECAUDARSE
    SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END)::numeric as deberia_recaudarse_este_mes,
    
    -- ESTE MES SE RECAUDÓ
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_este_mes,
    
    -- DIFERENCIA
    (SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END) - 
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0))::numeric as falta_recaudar_este_mes,
    
    -- PORCENTAJE
    CASE 
        WHEN SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0) / 
            NULLIF(SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END), 0)) * 100, 2
        )
    END as porcentaje_este_mes
    
FROM carreras c
LEFT JOIN conceptos_pago cp ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY deberia_recaudarse_este_mes DESC;

-- ==================== 4. VISTA: TOP 20 ESTUDIANTES EN MORA ====================

CREATE OR REPLACE VIEW v_reporte_top_mora AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY e.deuda_actual DESC) as ranking,
    e.dni,
    (e.nombre || ' ' || e.apellido) as nombre_completo,
    c.nombre as carrera,
    COALESCE(e.deuda_actual, 0)::numeric as deuda_monto,
    
    -- Meses adeudados
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

-- ==================== 5. VISTA: RESUMEN EJECUTIVO ====================

CREATE OR REPLACE VIEW v_reporte_ejecutivo AS
WITH resumen_año AS (
    SELECT 
        SUM(cp.monto) as recaudable_año,
        COUNT(DISTINCT e.id) as total_estudiantes
    FROM conceptos_pago cp
    JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
    WHERE cp.institucion_id = 2
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND cp.mes >= 3 AND cp.mes <= 12
      AND e.estado <> 'NO_VIENE_MAS'
),
resumen_hoy AS (
    SELECT 
        SUM(cp.monto) as deberia_recaudarse_hasta_hoy,
        COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer >= 3 AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN p.monto_pagado ELSE 0 END), 0) as realmente_recaudado_hasta_hoy,
        COUNT(DISTINCT e.id) as total_estudiantes,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END) as estudiantes_pagadores
    FROM conceptos_pago cp
    JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
    LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
    WHERE cp.institucion_id = 2
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    -- AÑO COMPLETO
    (SELECT recaudable_año FROM resumen_año)::numeric as total_recaudable_año,
    (SELECT ROUND(recaudable_año / total_estudiantes, 2) FROM resumen_año)::numeric as promedio_recaudable_por_estudiante,
    
    -- HASTA HOY
    (SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy)::numeric as deberia_recaudarse_hasta_hoy,
    (SELECT realmente_recaudado_hasta_hoy FROM resumen_hoy)::numeric as recaudado_hasta_hoy,
    ((SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy) - (SELECT realmente_recaudado_hasta_hoy FROM resumen_hoy))::numeric as pendiente_hasta_hoy,
    
    -- PORCENTAJES
    CASE 
        WHEN (SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy) = 0 THEN 0
        ELSE ROUND(((SELECT realmente_recaudado_hasta_hoy FROM resumen_hoy) / (SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy)) * 100, 2)
    END as porcentaje_cobro_hasta_hoy,
    
    CASE 
        WHEN (SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy) = 0 THEN 0
        ELSE ROUND((((SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy) - (SELECT realmente_recaudado_hasta_hoy FROM resumen_hoy)) / (SELECT deberia_recaudarse_hasta_hoy FROM resumen_hoy)) * 100, 2)
    END as porcentaje_pendiente_hasta_hoy,
    
    -- ESTUDIANTES
    (SELECT total_estudiantes FROM resumen_hoy)::integer as total_estudiantes,
    (SELECT estudiantes_pagadores FROM resumen_hoy)::integer as estudiantes_pagadores,
    ((SELECT total_estudiantes FROM resumen_hoy) - (SELECT estudiantes_pagadores FROM resumen_hoy))::integer as estudiantes_en_mora,
    
    ROUND(
        (((SELECT total_estudiantes FROM resumen_hoy) - (SELECT estudiantes_pagadores FROM resumen_hoy))::numeric / NULLIF((SELECT total_estudiantes FROM resumen_hoy), 0)) * 100, 
        2
    ) as porcentaje_estudiantes_en_mora,
    
    CURRENT_DATE as fecha_reporte;

-- ==================== 6. VISTA: PROYECCIÓN AÑO ====================

CREATE OR REPLACE VIEW v_reporte_proyeccion_año AS
WITH datos_hoy AS (
    SELECT 
        EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
        COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' THEN p.monto_pagado ELSE 0 END), 0) as recaudado_hasta_hoy,
        SUM(cp.monto) as deberia_recaudarse_hasta_hoy
    FROM conceptos_pago cp
    JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
    LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND EXTRACT(MONTH FROM p.fecha_pago)::integer >= 3 AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
    WHERE cp.institucion_id = 2
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer
      AND e.estado <> 'NO_VIENE_MAS'
),
total_año AS (
    SELECT 
        SUM(cp.monto) as recaudable_año
    FROM conceptos_pago cp
    JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
    WHERE cp.institucion_id = 2
      AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND cp.mes >= 3 AND cp.mes <= 12
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    (SELECT mes_actual FROM datos_hoy)::integer as mes_actual,
    (SELECT recaudado_hasta_hoy FROM datos_hoy)::numeric as recaudado_hasta_hoy,
    (SELECT deberia_recaudarse_hasta_hoy FROM datos_hoy)::numeric as deberia_hasta_hoy,
    (SELECT recaudable_año FROM total_año)::numeric as recaudable_año,
    
    -- PROYECCIÓN: si sigue al ritmo actual, cuánto recaudará el año?
    CASE 
        WHEN (SELECT mes_actual FROM datos_hoy) = 0 THEN 0
        ELSE ROUND((SELECT recaudado_hasta_hoy FROM datos_hoy) / (SELECT mes_actual FROM datos_hoy) * 10, 2)
    END::numeric as proyeccion_recaudado_año,
    
    -- % de proyección
    CASE 
        WHEN (SELECT recaudable_año FROM total_año) = 0 THEN 0
        ELSE ROUND((CASE 
            WHEN (SELECT mes_actual FROM datos_hoy) = 0 THEN 0
            ELSE (SELECT recaudado_hasta_hoy FROM datos_hoy) / (SELECT mes_actual FROM datos_hoy) * 10
        END / (SELECT recaudable_año FROM total_año)) * 100, 2)
    END as porcentaje_proyeccion,
    
    CURRENT_DATE as fecha_calculo;

-- ==================== 7. CONFIRMAR CREACIÓN ====================

SELECT 
    'v_reporte_resumen_general' as vista,
    COUNT(*) as registros
FROM v_reporte_resumen_general

UNION ALL

SELECT 'v_reporte_por_carrera', COUNT(*) FROM v_reporte_por_carrera
UNION ALL
SELECT 'v_reporte_mes_a_mes', COUNT(*) FROM v_reporte_mes_a_mes
UNION ALL
SELECT 'v_reporte_top_mora', COUNT(*) FROM v_reporte_top_mora
UNION ALL
SELECT 'v_reporte_ejecutivo', COUNT(*) FROM v_reporte_ejecutivo
UNION ALL
SELECT 'v_reporte_proyeccion_año', COUNT(*) FROM v_reporte_proyeccion_año;

-- ==================== FIN IMPLEMENTACIÓN ====================
