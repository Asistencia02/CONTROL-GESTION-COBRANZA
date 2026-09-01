-- ==================== REPORTE DETALLADO DE GESTIÓN DE COBRO ====================
-- Reporte para ENTENDER fácilmente qué se debe recaudar, qué se debería haber recaudado, y qué se recaudó

-- ==================== 1. RESUMEN GENERAL ====================

-- TOTAL RECAUDABLE DEL AÑO (MARZO a DICIEMBRE)
SELECT 
    'TOTAL_RECAUDABLE_AÑO' as indicador,
    SUM(cp.monto) as monto,
    COUNT(DISTINCT e.id) as estudiantes,
    ROUND(SUM(cp.monto) / COUNT(DISTINCT e.id), 2) as promedio_por_estudiante
FROM conceptos_pago cp
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY cp.institucion_id;

-- ==================== 2. MES ACTUAL vs AÑO ====================

-- LO QUE SE DEBERÍA RECAUDAR HASTA HOY
SELECT 
    'DEBERIA_RECAUDARSE_HASTA_HOY' as indicador,
    SUM(cp.monto) as monto,
    COUNT(DISTINCT e.id) as estudiantes,
    ROUND(SUM(cp.monto) / COUNT(DISTINCT e.id), 2) as promedio_por_estudiante
FROM conceptos_pago cp
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)
  AND e.estado <> 'NO_VIENE_MAS';

-- LO QUE REALMENTE SE RECAUDÓ
SELECT 
    'REALMENTE_RECAUDADO_HASTA_HOY' as indicador,
    SUM(p.monto_pagado) as monto,
    COUNT(DISTINCT p.estudiante_id) as estudiantes_que_pagaron,
    ROUND(SUM(p.monto_pagado) / COUNT(DISTINCT p.estudiante_id), 2) as promedio_por_estudiante
FROM pagos p
WHERE p.institucion_id = 2
  AND p.estado = 'PAGADO'
  AND EXTRACT(YEAR FROM p.fecha_pago) = 2026
  AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE);

-- ==================== 3. ANÁLISIS POR CARRERA ====================

SELECT 
    c.nombre as carrera,
    
    -- TOTALES DEL AÑO
    SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= 12 THEN cp.monto ELSE 0 END) as recaudable_año,
    
    -- HASTA HOY
    SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) as deberia_recaudarse_hasta_hoy,
    
    -- LO RECAUDADO
    SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END) as realmente_recaudado_hasta_hoy,
    
    -- LO PENDIENTE (hasta hoy)
    SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) - 
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END), 0) 
    as pendiente_hasta_hoy,
    
    -- PORCENTAJE DE COBRO
    ROUND(
        (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END), 0) / 
        NULLIF(SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END), 0)) * 100, 2
    ) as porcentaje_cobro_hasta_hoy,
    
    -- ESTUDIANTES
    COUNT(DISTINCT e.id) as total_estudiantes,
    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END) as estudiantes_que_pagaron,
    COUNT(DISTINCT e.id) - COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END) as estudiantes_en_mora
    
FROM carreras c
JOIN conceptos_pago cp ON cp.carrera_id = c.id
JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = cp.institucion_id
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre
ORDER BY recaudable_año DESC;

-- ==================== 4. COMPARATIVA MES A MES ====================

SELECT 
    EXTRACT(MONTH FROM CURRENT_DATE) as mes_actual,
    c.nombre as carrera,
    
    -- ESTE MES DEBERÍA RECAUDARSE
    SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) as deberia_recaudarse_este_mes,
    
    -- ESTE MES SE RECAUDÓ
    SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END) as realmente_recaudado_este_mes,
    
    -- DIFERENCIA
    SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) - 
    COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END), 0)
    as falta_recaudar_este_mes,
    
    -- PORCENTAJE
    ROUND(
        (COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END), 0) / 
        NULLIF(SUM(CASE WHEN cp.mes = EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END), 0)) * 100, 2
    ) as porcentaje_este_mes
    
FROM carreras c
JOIN conceptos_pago cp ON cp.carrera_id = c.id
JOIN estudiantes e ON e.carrera_id = c.id AND e.institucion_id = cp.institucion_id
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre
ORDER BY deberia_recaudarse_este_mes DESC;

-- ==================== 5. TOP 20 ESTUDIANTES EN MORA ====================

SELECT 
    e.dni,
    e.nombre || ' ' || e.apellido as nombre_completo,
    c.nombre as carrera,
    e.deuda_actual as deuda_actual_monto,
    
    -- Meses adeudados
    STRING_AGG(DISTINCT 
        CASE cp.mes 
            WHEN 3 THEN 'MAR' WHEN 4 THEN 'ABR' WHEN 5 THEN 'MAY' WHEN 6 THEN 'JUN'
            WHEN 7 THEN 'JUL' WHEN 8 THEN 'AGO' WHEN 9 THEN 'SEP' WHEN 10 THEN 'OCT'
            WHEN 11 THEN 'NOV' WHEN 12 THEN 'DIC'
        END, ', '
    ) as meses_adeudados,
    
    COUNT(DISTINCT CASE WHEN p.id IS NULL OR p.estado <> 'PAGADO' THEN cp.id ELSE NULL END) as cantidad_conceptos_adeudados
    
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
LEFT JOIN conceptos_pago cp ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id AND cp.año = 2026 AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)
LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id AND p.estado = 'PAGADO'
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
  AND e.deuda_actual > 0
GROUP BY e.id, e.dni, e.nombre, e.apellido, c.nombre, e.deuda_actual
ORDER BY e.deuda_actual DESC
LIMIT 20;

-- ==================== 6. RESUMEN EJECUTIVO (UNA SOLA CONSULTA) ====================

WITH resumen AS (
    SELECT 
        -- AÑO COMPLETO
        SUM(cp.monto) as recaudable_año,
        
        -- HASTA HOY
        SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) as deberia_recaudarse_hasta_hoy,
        
        -- RECAUDADO HASTA HOY
        SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END) as realmente_recaudado_hasta_hoy,
        
        -- PENDIENTE
        SUM(CASE WHEN cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE) THEN cp.monto ELSE 0 END) - 
        COALESCE(SUM(CASE WHEN p.estado = 'PAGADO' AND EXTRACT(MONTH FROM p.fecha_pago) >= 3 AND EXTRACT(MONTH FROM p.fecha_pago) <= EXTRACT(MONTH FROM CURRENT_DATE) THEN p.monto_pagado ELSE 0 END), 0)
        as pendiente_hasta_hoy,
        
        -- ESTUDIANTES
        COUNT(DISTINCT e.id) as total_estudiantes,
        COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END) as estudiantes_pagadores,
        COUNT(DISTINCT e.id) - COUNT(DISTINCT CASE WHEN p.id IS NOT NULL AND p.estado = 'PAGADO' THEN e.id ELSE NULL END) as estudiantes_en_mora
        
    FROM conceptos_pago cp
    JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
    LEFT JOIN pagos p ON p.concepto_id = cp.id AND p.estudiante_id = e.id
    WHERE cp.institucion_id = 2
      AND cp.año = 2026
      AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    -- TÍTULOS
    'RESUMEN EJECUTIVO' as titulo,
    
    -- AÑO
    recaudable_año as total_recaudable_año,
    ROUND(recaudable_año / total_estudiantes, 2) as promedio_recaudable_por_estudiante,
    
    -- MES ACTUAL
    deberia_recaudarse_hasta_hoy as deberia_recaudarse_hasta_hoy,
    realmente_recaudado_hasta_hoy as recaudado_hasta_hoy,
    pendiente_hasta_hoy as pendiente_hasta_hoy,
    
    -- PORCENTAJES
    ROUND((realmente_recaudado_hasta_hoy / NULLIF(debiera_recaudarse_hasta_hoy, 0)) * 100, 2) as porcentaje_cobro_hasta_hoy,
    ROUND(((deberia_recaudarse_hasta_hoy - realmente_recaudado_hasta_hoy) / NULLIF(deberia_recaudarse_hasta_hoy, 0)) * 100, 2) as porcentaje_pendiente_hasta_hoy,
    
    -- ESTUDIANTES
    total_estudiantes,
    estudiantes_pagadores,
    estudiantes_en_mora,
    ROUND((estudiantes_en_mora::numeric / NULLIF(total_estudiantes, 0)) * 100, 2) as porcentaje_estudiantes_en_mora
    
FROM resumen;
