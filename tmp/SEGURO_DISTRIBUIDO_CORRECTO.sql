-- ==================== RECÁLCULO CORRECTO: SEGURO DISTRIBUIDO ====================

-- Estructura:
-- - INSCRIPCIÓN: $10.000 (pago único, vence en MARZO)
-- - CUOTA: $10.000 × mes (MARZO a DICIEMBRE = 10 meses)
-- - SEGURO: $15.000 distribuido en 10 cuotas de $1.500/mes (MARZO a DICIEMBRE)

-- PASO 1: Recaudable POR ALUMNO hasta mes actual (AGOSTO = mes 8)
-- INSCRIPCIÓN: $10.000 (vence en MARZO)
-- CUOTAS: 6 × $10.000 (MARZO a AGOSTO) = $60.000
-- SEGURO distribuido: 6 × $1.500 (MARZO a AGOSTO) = $9.000
-- TOTAL: $79.000

SELECT 
    'POR ALUMNO hasta AGOSTO' as metrica,
    10000 as inscripcion,
    60000 as cuotas,
    9000 as seguro_distribuido,
    79000 as total;

-- PASO 2: TOTAL para 624 alumnos
SELECT 
    'TOTAL 624 ALUMNOS hasta AGOSTO' as metrica,
    (624 * 10000) as inscripcion_total,
    (624 * 60000) as cuotas_total,
    (624 * 9000) as seguro_total,
    (624 * 79000) as recaudable_total;

-- PASO 3: Ver cómo está calculado deuda_actual actualmente
-- Debería ser: para cada estudiante, sumar conceptos de MARZO-AGOSTO sin pagar
SELECT 
    COUNT(*) as estudiantes,
    SUM(deuda_actual) as total_deuda_actual,
    ROUND(AVG(deuda_actual), 2) as promedio_deuda,
    MIN(deuda_actual) as min_deuda,
    MAX(deuda_actual) as max_deuda
FROM estudiantes
WHERE institucion_id = 2
  AND estado <> 'NO_VIENE_MAS';

-- PASO 4: Validación
WITH datos AS (
    SELECT 
        (624 * 79000)::numeric as rec_hasta_hoy,
        (SELECT SUM(monto_pagado) FROM pagos WHERE institucion_id = 2 AND estado = 'PAGADO' AND EXTRACT(MONTH FROM fecha_pago)::integer <= 8)::numeric as cobrado_hasta_hoy,
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

-- PASO 5: Si la deuda_actual no coincide, ver por carrera
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT e.id) as estudiantes,
    SUM(e.deuda_actual) as total_deuda,
    ROUND(AVG(e.deuda_actual), 2) as promedio_deuda_estudiante
FROM estudiantes e
JOIN carreras c ON e.carrera_id = c.id
WHERE e.institucion_id = 2
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY c.id, c.nombre;
