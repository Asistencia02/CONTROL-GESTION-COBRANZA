-- ==================== ARREGLAR CÁLCULO DE RECAUDABLE_HASTA_HOY ====================

-- El problema: estamos sumando conceptos SIN agrupar por estudiante
-- Debería ser: (Estudiantes × Conceptos vencidos hasta mes actual)

-- PASO 1: Ver mes actual
SELECT 
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
    CURRENT_DATE as hoy;

-- PASO 2: Calcular recaudable_hasta_hoy CORRECTAMENTE
-- = INSCRIPCIÓN (1 × estudiantes) + SEGURO (1 × estudiantes) + CUOTAS (MARZO a MES_ACTUAL × estudiantes)

WITH datos_correctos AS (
    SELECT 
        'INSCRIPCIÓN' as tipo,
        COUNT(DISTINCT e.id) as estudiantes,
        1 as conceptos_por_estudiante,
        10000 as monto_concepto,
        COUNT(DISTINCT e.id) * 10000 as total
    FROM estudiantes e
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
    
    UNION ALL
    
    SELECT 
        'SEGURO' as tipo,
        COUNT(DISTINCT e.id) as estudiantes,
        1 as conceptos_por_estudiante,
        1500 as monto_concepto,
        COUNT(DISTINCT e.id) * 1500 as total
    FROM estudiantes e
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
    
    UNION ALL
    
    SELECT 
        'CUOTAS (MAR-AGO)' as tipo,
        COUNT(DISTINCT e.id) as estudiantes,
        (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) as conceptos_por_estudiante,
        10000 as monto_concepto,
        COUNT(DISTINCT e.id) * (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000 as total
    FROM estudiantes e
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    tipo,
    estudiantes,
    conceptos_por_estudiante,
    monto_concepto,
    total
FROM datos_correctos
ORDER BY tipo;

-- PASO 3: Total recaudable hasta hoy
WITH datos_correctos AS (
    SELECT 
        COUNT(DISTINCT e.id) * 10000 as inscripcion,
        COUNT(DISTINCT e.id) * 1500 as seguro,
        COUNT(DISTINCT e.id) * (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000 as cuotas
    FROM estudiantes e
    WHERE e.institucion_id = 2 AND e.estado <> 'NO_VIENE_MAS'
)
SELECT 
    'Recaudable hasta hoy' as metrica,
    ROUND(inscripcion + seguro + cuotas, 2) as valor,
    ROUND(inscripcion, 2) as inscripcion,
    ROUND(seguro, 2) as seguro,
    ROUND(cuotas, 2) as cuotas
FROM datos_correctos;

-- PASO 4: Cobrado hasta hoy (SOLO de MARZO a MES_ACTUAL)
SELECT 
    'Cobrado hasta hoy (MAR-AGO)' as metrica,
    ROUND(SUM(monto_pagado), 2) as valor,
    COUNT(*) as cantidad_pagos
FROM pagos
WHERE institucion_id = 2
  AND estado = 'PAGADO'
  AND EXTRACT(MONTH FROM fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer;

-- PASO 5: VALIDACIÓN CORRECTA
WITH datos AS (
    SELECT 
        624 as estudiantes,
        (624 * 10000 + 624 * 1500 + 624 * (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000)::numeric as rec_hasta_hoy,
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= EXTRACT(MONTH FROM CURRENT_DATE)::integer)::numeric as cobrado_hasta_hoy,
        (SELECT SUM(deuda_actual) FROM estudiantes WHERE institucion_id = 2 AND estado <> 'NO_VIENE_MAS')::numeric as deuda_actual
)
SELECT 
    ROUND(rec_hasta_hoy, 2) as recaudable_hasta_hoy,
    ROUND(cobrado_hasta_hoy, 2) as cobrado_hasta_hoy,
    ROUND(deuda_actual, 2) as deuda_actual,
    ROUND(rec_hasta_hoy - cobrado_hasta_hoy, 2) as pendiente_teórico,
    CASE 
        WHEN ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual) < 1000 THEN '✅ COHERENTE'
        ELSE '⚠️ Diferencia: ' || ROUND(ABS((rec_hasta_hoy - cobrado_hasta_hoy) - deuda_actual), 2)::text
    END as validacion
FROM datos;
