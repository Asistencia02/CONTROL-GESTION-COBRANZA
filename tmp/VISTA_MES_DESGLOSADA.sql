-- ==================== REESCRIBIR v_reporte_mes_a_mes CORRECTAMENTE ====================

DROP VIEW IF EXISTS v_reporte_mes_a_mes CASCADE;

CREATE OR REPLACE VIEW v_reporte_mes_a_mes AS
WITH mes_actual AS (
    SELECT EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes,
           TO_CHAR(CURRENT_DATE, 'Month')::text as mes_nombre
),
datos_por_carrera AS (
    SELECT 
        c.id as carrera_id,
        c.nombre as carrera,
        COUNT(DISTINCT e.id) as cantidad_estudiantes,
        
        -- INSCRIPCIÓN (1 pago, vence MARZO)
        COUNT(DISTINCT e.id) * 10000 as inscripcion_total,
        
        -- CUOTAS (MARZO a MES_ACTUAL)
        COUNT(DISTINCT e.id) * ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 as cuotas_total,
        
        -- SEGURO DISTRIBUIDO (MARZO a MES_ACTUAL, 1.500 x mes)
        COUNT(DISTINCT e.id) * ((SELECT mes FROM mes_actual) - 3 + 1) * 1500 as seguro_total,
        
        -- TOTAL DEBERÍA (INSCRIPCIÓN + CUOTAS + SEGURO hasta mes actual)
        COUNT(DISTINCT e.id) * (10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 10000 + ((SELECT mes FROM mes_actual) - 3 + 1) * 1500) as deberia_cobrar,
        
        -- TOTAL COBRADO (REAL, solo pagos hasta mes actual)
        COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago)::integer <= (SELECT mes FROM mes_actual) THEN p.monto_pagado ELSE 0 END), 0) as cobre_real
        
    FROM carreras c
    LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
    LEFT JOIN pagos p ON p.estudiante_id = e.id AND p.institucion_id = 2
    WHERE c.id IN (4, 5, 6)
    GROUP BY c.id, c.nombre
)
SELECT 
    carrera,
    cantidad_estudiantes,
    (SELECT mes FROM mes_actual)::integer as mes_actual,
    (SELECT mes_nombre FROM mes_actual)::text as mes_nombre,
    
    -- DESGLOSE: INSCRIPCIÓN
    inscripcion_total::numeric as inscripcion_deberia,
    
    -- DESGLOSE: CUOTAS
    cuotas_total::numeric as cuotas_deberia,
    
    -- DESGLOSE: SEGURO
    seguro_total::numeric as seguro_deberia,
    
    -- TOTAL DEBERÍA COBRAR (MARZO a MES_ACTUAL)
    deberia_cobrar::numeric as deberia_cobrar_total,
    
    -- TOTAL COBRÉ (REAL)
    cobre_real::numeric as cobre_real_total,
    
    -- DIFERENCIA (FALTA o SOBRA)
    (deberia_cobrar - cobre_real)::numeric as diferencia,
    
    -- TEXTO: Si es positivo = FALTA, si es negativo = SOBRA
    CASE 
        WHEN (deberia_cobrar - cobre_real) > 0 THEN 'FALTA'
        WHEN (deberia_cobrar - cobre_real) < 0 THEN 'SOBRA'
        ELSE 'IGUAL'
    END as estado_diferencia,
    
    -- PORCENTAJE DE CUMPLIMIENTO
    CASE 
        WHEN deberia_cobrar = 0 THEN 0
        ELSE ROUND((cobre_real / NULLIF(deberia_cobrar, 0)) * 100, 2)
    END as porcentaje_cumplimiento
    
FROM datos_por_carrera
ORDER BY deberia_cobrar DESC;

-- ==================== VERIFICAR ====================

SELECT '✅ Vista corregida' as status;

SELECT * FROM v_reporte_mes_a_mes;
