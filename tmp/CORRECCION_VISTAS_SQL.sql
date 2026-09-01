-- ==================== CORRECCIÓN DE VISTAS ====================
-- El problema: Las vistas estaban filtrando "debería hasta hoy"
-- La solución: Las comparativas deben ser TOTAL RECAUDABLE vs TOTAL COBRADO

-- ==================== 1. CORREGIR v_reporte_resumen_general ====================

DROP VIEW IF EXISTS v_reporte_resumen_general CASCADE;

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
    'PAGADO_HASTA_HOY' as periodo,
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

-- ==================== 2. CORREGIR v_reporte_por_carrera ====================

DROP VIEW IF EXISTS v_reporte_por_carrera CASCADE;

CREATE OR REPLACE VIEW v_reporte_por_carrera AS
SELECT 
    c.id as carrera_id,
    c.nombre as carrera,
    
    -- TOTAL RECAUDABLE DEL AÑO (MARZO a DICIEMBRE)
    SUM(cp.monto)::numeric as recaudable_año,
    
    -- LO REALMENTE COBRADO (TODOS LOS PAGOS, sin filtro de mes)
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado,
    
    -- LO PENDIENTE (Recaudable - Cobrado)
    (SUM(cp.monto) - COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' THEN p.monto_pagado ELSE 0 END), 0))::numeric as pendiente,
    
    -- PORCENTAJE DE COBRO (Total cobrado / Total recaudable)
    CASE 
        WHEN SUM(cp.monto) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' THEN p.monto_pagado ELSE 0 END), 0) / 
            SUM(cp.monto)) * 100, 2
        )
    END as porcentaje_cobro,
    
    -- ESTUDIANTES
    COUNT(DISTINCT e.id)::integer as total_estudiantes,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END)::integer as estudiantes_pagadores,
    (COUNT(DISTINCT e.id) - COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END))::integer as estudiantes_en_mora
    
FROM carreras c
LEFT JOIN conceptos_pago cp ON cp.carrera_id = c.id AND cp.institucion_id = 2 AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer AND cp.mes >= 3 AND cp.mes <= 12
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== 3. CORREGIR v_reporte_mes_a_mes ====================

DROP VIEW IF EXISTS v_reporte_mes_a_mes CASCADE;

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
SELECT 
    c.nombre as carrera,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
    
    -- ESTE MES DEBERÍA RECAUDARSE (solo conceptos de este mes)
    SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto ELSE 0 END)::numeric as deberia_recaudarse_este_mes,
    
    -- ESTE MES SE RECAUDÓ (pagos de este mes)
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
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY deberia_recaudarse_este_mes DESC;

-- ==================== 4. CORREGIR v_reporte_ejecutivo ====================

DROP VIEW IF EXISTS v_reporte_ejecutivo CASCADE;

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
resumen_cobrado AS (
    SELECT 
        COALESCE(SUM(p.monto_pagado), 0) as total_cobrado,
        COUNT(DISTINCT p.estudiante_id) as estudiantes_pagadores
    FROM pagos p
    JOIN estudiantes e ON p.estudiante_id = e.id
    WHERE p.institucion_id = 2
      AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND p.estado = 'PAGADO'
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    -- AÑO COMPLETO
    (SELECT recaudable_año FROM resumen_año)::numeric as total_recaudable_año,
    (SELECT ROUND(recaudable_año / total_estudiantes, 2) FROM resumen_año)::numeric as promedio_recaudable_por_estudiante,
    
    -- COBRADO
    (SELECT total_cobrado FROM resumen_cobrado)::numeric as recaudado_hasta_hoy,
    ((SELECT recaudable_año FROM resumen_año) - (SELECT total_cobrado FROM resumen_cobrado))::numeric as pendiente_hasta_hoy,
    
    -- PORCENTAJES
    CASE 
        WHEN (SELECT recaudable_año FROM resumen_año) = 0 THEN 0
        ELSE ROUND(((SELECT total_cobrado FROM resumen_cobrado) / (SELECT recaudable_año FROM resumen_año)) * 100, 2)
    END as porcentaje_cobro,
    
    CASE 
        WHEN (SELECT recaudable_año FROM resumen_año) = 0 THEN 0
        ELSE ROUND((((SELECT recaudable_año FROM resumen_año) - (SELECT total_cobrado FROM resumen_cobrado)) / (SELECT recaudable_año FROM resumen_año)) * 100, 2)
    END as porcentaje_pendiente,
    
    -- ESTUDIANTES
    (SELECT total_estudiantes FROM resumen_año)::integer as total_estudiantes,
    (SELECT estudiantes_pagadores FROM resumen_cobrado)::integer as estudiantes_pagadores,
    ((SELECT total_estudiantes FROM resumen_año) - (SELECT estudiantes_pagadores FROM resumen_cobrado))::integer as estudiantes_en_mora,
    
    ROUND(
        (((SELECT total_estudiantes FROM resumen_año) - (SELECT estudiantes_pagadores FROM resumen_cobrado))::numeric / NULLIF((SELECT total_estudiantes FROM resumen_año), 0)) * 100, 
        2
    ) as porcentaje_estudiantes_en_mora,
    
    CURRENT_DATE as fecha_reporte;

-- ==================== VERIFICAR ====================

SELECT 'Vistas corregidas' as status;

-- Ver resumen
SELECT * FROM v_reporte_ejecutivo;

-- Ver por carrera
SELECT * FROM v_reporte_por_carrera;

-- Ver mes a mes
SELECT * FROM v_reporte_mes_a_mes;
