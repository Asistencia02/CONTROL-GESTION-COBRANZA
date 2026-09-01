-- ==================== VALIDACIÓN CON SEGURO CORRECTO ====================
-- SEGURO: 10 cuotas de $1.500 (MARZO a DICIEMBRE), NO 1 cuota

-- PASO 1: Ver cómo están los conceptos SEGURO en la base
SELECT 
    cp.id,
    cp.tipo,
    cp.mes,
    cp.monto,
    COUNT(*) OVER (PARTITION BY cp.carrera_id, cp.tipo, cp.mes) as duplicados
FROM conceptos_pago cp
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'SEGURO'
ORDER BY cp.carrera_id, cp.mes;

-- PASO 2: Ver TODOS los conceptos y su distribución
SELECT 
    c.nombre as carrera,
    cp.tipo,
    COUNT(*) as cantidad,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
GROUP BY c.id, c.nombre, cp.tipo
ORDER BY c.id, cp.tipo;

-- PASO 3: Si SEGURO es 1 concepto de $1.500, necesitamos CREAR 10 más
-- Primero, verificar cuántos SEGURO hay por carrera
SELECT 
    c.nombre as carrera,
    COUNT(DISTINCT cp.id) as conceptos_seguro
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'SEGURO'
GROUP BY c.id, c.nombre;

-- PASO 4: Recaudable correcto POR ALUMNO
-- INSCRIPCIÓN (10.000) + CUOTAS MARZO-AGOSTO (6×10.000 = 60.000) + SEGURO MARZO-AGOSTO (6×1.500 = 9.000) = 79.000
SELECT 
    'Por alumno hasta AGO' as metrica,
    10000 as inscripcion,
    (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000 as cuotas,
    (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 1500 as seguro,
    10000 + (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 10000 + (EXTRACT(MONTH FROM CURRENT_DATE)::integer - 3 + 1) * 1500 as total;

-- PASO 5: Recaudable total hasta hoy
SELECT 
    'Total hasta hoy' as metrica,
    624 * 10000 as inscripcion_total,
    624 * 6 * 10000 as cuotas_total,
    624 * 6 * 1500 as seguro_total,
    (624 * 10000 + 624 * 6 * 10000 + 624 * 6 * 1500) as total_recaudable_hasta_hoy;

-- PASO 6: VALIDACIÓN FINAL
WITH datos AS (
    SELECT 
        (624 * 10000 + 624 * 6 * 10000 + 624 * 6 * 1500)::numeric as rec_hasta_hoy,
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
