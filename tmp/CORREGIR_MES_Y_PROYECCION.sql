-- ==================== CORREGIR v_reporte_mes_a_mes ====================

DROP VIEW IF EXISTS v_reporte_mes_a_mes CASCADE;

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes
)
SELECT 
    c.nombre as carrera,
    (SELECT mes FROM mes_actual) as mes_actual,
    
    -- DEBERÍA (MARZO a MES_ACTUAL)
    COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) as deberia_recaudarse_este_mes,
    
    -- COBRÓ (MARZO a MES_ACTUAL)
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0)::numeric as realmente_recaudado_este_mes,
    
    -- FALTA
    (COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) - 
     COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0))::numeric as falta_recaudar_este_mes,
    
    -- PORCENTAJE
    CASE 
        WHEN COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) = 0 THEN 0
        ELSE ROUND(
            (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0) / 
            NULLIF(COUNT(DISTINCT e.id)::numeric * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500), 0)) * 100, 2)
        )
    END as porcentaje_este_mes
    
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND p.institucion_id = 2
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY deberia_recaudarse_este_mes DESC;

-- ==================== CORREGIR v_reporte_proyeccion_año ====================

DROP VIEW IF EXISTS v_reporte_proyeccion_año CASCADE;

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
    (SELECT total FROM cobrado_hoy)::numeric as recaudado_hasta_hoy,
    (624 * 125000)::numeric as recaudable_año,
    
    -- PROYECCIÓN: (Cobrado hasta hoy / Meses transcurridos) × 12
    CASE 
        WHEN (SELECT mes FROM mes_actual) = 0 THEN 0
        ELSE ROUND((SELECT total FROM cobrado_hoy) / (SELECT mes FROM mes_actual)::numeric * 12, 2)
    END::numeric as proyeccion_recaudado_año,
    
    -- PORCENTAJE de cumplimiento
    CASE 
        WHEN (624 * 125000) = 0 THEN 0
        ELSE ROUND(
            (CASE 
                WHEN (SELECT mes FROM mes_actual) = 0 THEN 0
                ELSE (SELECT total FROM cobrado_hoy) / (SELECT mes FROM mes_actual)::numeric * 12
            END / (624 * 125000)) * 100, 2)
        )
    END as porcentaje_proyeccion,
    
    CURRENT_DATE as fecha_calculo;

-- ==================== VERIFICAR ====================

SELECT '✅ Vistas corregidas' as status;

SELECT * FROM v_reporte_mes_a_mes;
SELECT * FROM v_reporte_proyeccion_año;
