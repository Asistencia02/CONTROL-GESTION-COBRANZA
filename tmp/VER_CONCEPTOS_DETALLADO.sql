-- ==================== VER QUÉ CONCEPTOS EXISTEN ====================

-- 1. Ver desglose por tipo y carrera
SELECT 
    c.nombre as carrera,
    cp.tipo,
    COUNT(*) as cantidad,
    SUM(cp.monto) as monto_total
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.mes >= 3 AND cp.mes <= 12
GROUP BY c.id, c.nombre, cp.tipo
ORDER BY c.id, cp.tipo;

-- 2. Ver específicamente SEGURO
SELECT 
    c.nombre as carrera,
    cp.tipo,
    cp.mes,
    COUNT(*) as cantidad
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'SEGURO'
GROUP BY c.id, c.nombre, cp.tipo, cp.mes;

-- 3. Ver INSCRIPCIÓN
SELECT 
    c.nombre as carrera,
    cp.tipo,
    COUNT(*) as cantidad
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'INSCRIPCION'
GROUP BY c.id, c.nombre, cp.tipo;

-- 4. Ver CUOTA
SELECT 
    c.nombre as carrera,
    COUNT(*) as cantidad
FROM conceptos_pago cp
JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2
  AND cp.año = 2026
  AND cp.tipo = 'CUOTA'
GROUP BY c.id, c.nombre;
