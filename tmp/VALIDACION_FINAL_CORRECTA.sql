-- ==================== VALIDACIÓN FINAL CORRECTA ====================

WITH datos AS (
    SELECT 
        -- Recaudable hasta agosto (INSCRIPCIÓN + CUOTAS 6 meses + SEGURO 6 meses distribuido)
        (624 * (10000 + 60000 + 9000))::numeric as rec_hasta_hoy,
        
        -- Cobrado real (solo pagos de MARZO a AGOSTO)
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= 8)::numeric as cobrado_hasta_hoy,
        
        -- Deuda actual (lo que debe cada estudiante de MARZO a AGOSTO)
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS')::numeric as deuda_actual,
        
        -- Total pagado en el año (incluye adelantados)
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO')::numeric as cobrado_total_año
)
SELECT 
    ROUND(rec_hasta_hoy, 2) as recaudable_hasta_agosto,
    ROUND(cobrado_hasta_hoy, 2) as cobrado_hasta_agosto,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND(rec_hasta_hoy - cobrado_hasta_hoy, 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual) < 100000 THEN '✅ COHERENTE (margen <$100k)'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual), 2)::text
    END as validacion_mes_actual,
    
    ROUND(cobrado_total_año, 2) as cobrado_total_año_completo
FROM datos;

-- ==================== RESUMEN GENERAL ====================

SELECT 
    '📊 RESUMEN GENERAL' as titulo,
    NULL::text as descripcion
    
UNION ALL

SELECT 
    'Estudiantes activos',
    '624'
    
UNION ALL

SELECT 
    'Recaudable AÑO COMPLETO (MAR-DIC)',
    '$' || TO_CHAR(624 * 125000, '9,999,999,999')
    
UNION ALL

SELECT 
    'Recaudable hasta AGOSTO',
    '$' || TO_CHAR(624 * 79000, '9,999,999,999')
    
UNION ALL

SELECT 
    'Cobrado hasta AGOSTO',
    '$' || TO_CHAR((SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= 8), '9,999,999,999')
    
UNION ALL

SELECT 
    'Pendiente hasta AGOSTO',
    '$' || TO_CHAR(624 * 79000 - (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= 8), '9,999,999,999')
    
UNION ALL

SELECT 
    'Deuda actual (sin pagar)',
    '$' || TO_CHAR((SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS'), '9,999,999,999')
    
UNION ALL

SELECT 
    'Cobrado total AÑO (incl. adelantados)',
    '$' || TO_CHAR((SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO'), '9,999,999,999')
    
UNION ALL

SELECT 
    'En mora (con deuda)',
    (SELECT COUNT(DISTINCT id) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS' AND deuda_actual > 0)::text || ' estudiantes'
    
UNION ALL

SELECT 
    'Porcentaje de cobro (hasta AGO)',
    ROUND(
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= 8) / 
        (624 * 79000) * 100, 2)::text || '%';
