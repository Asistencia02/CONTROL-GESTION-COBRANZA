-- ==================== DEBUG: Pagos por mes ====================

-- 1. Ver distribución de pagos por mes
SELECT 
    EXTRACT(MONTH FROM p.fecha_pago)::integer as mes,
    COUNT(*) as cantidad_pagos,
    SUM(p.monto_pagado) as monto_pagado
FROM pagos p
WHERE p.institucion_id = 2
  AND p.estado = 'PAGADO'
GROUP BY EXTRACT(MONTH FROM p.fecha_pago)::integer
ORDER BY mes;

-- 2. Ver mes actual
SELECT 
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual,
    CURRENT_DATE as hoy;

-- 3. Ver pagos de MESES FUTUROS (después de mes actual)
SELECT 
    COUNT(*) as pagos_meses_futuros,
    SUM(p.monto_pagado) as monto_meses_futuros
FROM pagos p
WHERE p.institucion_id = 2
  AND p.estado = 'PAGADO'
  AND EXTRACT(MONTH FROM p.fecha_pago)::integer > EXTRACT(MONTH FROM CURRENT_DATE)::integer;

-- 4. El problema: ¿La deuda_actual se calcula hasta mes_actual?
-- Validar función calcular_deuda_estudiante
SELECT 
    'Mes actual' as info,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as mes_actual;

-- Si la deuda_actual solo suma MARZO a MES_ACTUAL,
-- pero hay pagos de meses futuros,
-- entonces: pendiente_teórico = recaudable - cobrado_total
-- pero deuda_actual = recaudable_hasta_hoy - cobrado_hasta_hoy

-- 5. Lo que debería ser:
-- Recaudable hasta mes actual (no año completo)
SELECT 
    'CÁLCULO CORRECTO' as tipo,
    COUNT(DISTINCT e.id) as estudiantes,
    SUM(
        CASE 
            WHEN cp.tipo IN ('INSCRIPCION', 'SEGURO') THEN cp.monto
            WHEN cp.tipo = 'CUOTA' AND cp.mes >= 3 AND cp.mes <= EXTRACT(MONTH FROM CURRENT_DATE)::integer THEN cp.monto
            ELSE 0
        END
    ) as recaudable_hasta_hoy
FROM conceptos_pago cp
JOIN estudiantes e ON cp.carrera_id = e.carrera_id AND cp.institucion_id = e.institucion_id
WHERE cp.institucion_id = 2
  AND cp.año = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  AND e.estado <> 'NO_VIENE_MAS'
GROUP BY cp.institucion_id;
