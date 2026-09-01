-- ==================== CORREGIR CONTADOR DE "ESTUDIANTES EN MORA" ====================

DROP VIEW IF EXISTS v_reporte_por_carrera CASCADE;

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
    
    -- ESTUDIANTES EN MORA: Los que tienen deuda_actual > 0 (solo MARZO a MES_ACTUAL sin pagar)
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id ELSE NULL END)::integer as estudiantes_en_mora
    
FROM carreras c
LEFT JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
LEFT JOIN pagos p ON p.estudiante_id = e.id AND EXTRACT(YEAR FROM p.fecha_pago)::integer = EXTRACT(YEAR FROM CURRENT_DATE)::integer AND p.estado = 'PAGADO'
WHERE c.id IN (4, 5, 6)
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== VERIFICAR ====================

SELECT '✅ Vista corregida' as status;

SELECT * FROM v_reporte_por_carrera;

-- Validar: estudiantes en mora debería coincidir con los que tienen deuda_actual > 0
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT CASE WHEN e.deuda_actual > 0 THEN e.id ELSE NULL END) as con_deuda_actual,
    COUNT(DISTINCT e.id) as total_estudiantes
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;
