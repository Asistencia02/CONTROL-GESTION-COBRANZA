-- ========== VERIFICAR SI CONCEPTOS ESTÁN DUPLICADOS ==========

-- Ver cuántos conceptos hay por carrera
SELECT 
  c.nombre as carrera,
  COUNT(DISTINCT cp.id) as total_conceptos_unicos,
  COUNT(cp.id) as total_conceptos_registros
FROM conceptos_pago cp
JOIN carreras c ON c.id = cp.carrera_id
WHERE cp.institucion_id = 2 AND cp.activo = true
GROUP BY c.id, c.nombre
ORDER BY c.nombre;

-- Ver si hay conceptos duplicados (mismo tipo, mismo mes, misma carrera)
SELECT 
  c.nombre as carrera,
  cp.tipo,
  cp.mes,
  cp.año,
  COUNT(*) as cantidad,
  SUM(cp.monto) as monto_total
FROM conceptos_pago cp
JOIN carreras c ON c.id = cp.carrera_id
WHERE cp.institucion_id = 2 AND cp.activo = true
GROUP BY c.id, c.nombre, cp.tipo, cp.mes, cp.año
HAVING COUNT(*) > 1
ORDER BY c.nombre, cantidad DESC;

-- Ver TODOS los conceptos por carrera (para análisis manual)
SELECT 
  c.nombre as carrera,
  cp.id,
  cp.nombre,
  cp.tipo,
  cp.mes,
  cp.año,
  cp.monto
FROM conceptos_pago cp
JOIN carreras c ON c.id = cp.carrera_id
WHERE cp.institucion_id = 2 AND cp.activo = true
ORDER BY c.nombre, cp.tipo, cp.mes
