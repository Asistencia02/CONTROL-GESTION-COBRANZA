# 📊 QUERY PARA VERIFICAR PAGOS EN SUPABASE

Copia esta query en Supabase SQL Editor y ejecuta para ver qué datos hay realmente:

```sql
-- Ver resumen de pagos por institución y carrera
SELECT 
  e.carrera_id,
  c.nombre as carrera,
  COUNT(DISTINCT e.id) as total_estudiantes,
  COUNT(DISTINCT pm.estudiante_id) as estudiantes_con_pagos,
  SUM(pmd.monto_pagado) as total_pagado,
  COUNT(DISTINCT pmd.concepto_id) as conceptos_pagados
FROM estudiantes e
LEFT JOIN carreras c ON e.carrera_id = c.id
LEFT JOIN pagos_multiples pm ON e.id = pm.estudiante_id
LEFT JOIN pagos_multiples_detalle pmd ON pm.id = pmd.pagos_multiples_id
WHERE e.institucion_id = 2 AND e.estado = 'ACTIVO'
GROUP BY e.carrera_id, c.nombre
ORDER BY c.nombre;

-- Ver conceptos vencidos por carrera
SELECT 
  cp.carrera_id,
  c.nombre as carrera,
  cp.tipo,
  cp.mes,
  cp.año,
  COUNT(*) as cantidad,
  SUM(cp.monto) as monto_total
FROM conceptos_pago cp
LEFT JOIN carreras c ON cp.carrera_id = c.id
WHERE cp.institucion_id = 2 
  AND cp.activo = true
  AND (cp.año < 2026 OR (cp.año = 2026 AND cp.mes <= 8))
GROUP BY cp.carrera_id, c.nombre, cp.tipo, cp.mes, cp.año
ORDER BY c.nombre, cp.tipo, cp.mes DESC;

-- Ver pagos detallados por estudiante (ejemplo: Nivel Primaria)
SELECT 
  e.dni,
  e.nombre,
  e.apellido,
  c.nombre as carrera,
  COUNT(DISTINCT pm.id) as pagos,
  SUM(pmd.monto_pagado) as total_pagado
FROM estudiantes e
LEFT JOIN carreras c ON e.carrera_id = c.id
LEFT JOIN pagos_multiples pm ON e.id = pm.estudiante_id AND pm.estado != 'ANULADO'
LEFT JOIN pagos_multiples_detalle pmd ON pm.id = pmd.pagos_multiples_id
WHERE e.institucion_id = 2 
  AND e.carrera_id = 5 
  AND e.estado = 'ACTIVO'
GROUP BY e.id, e.dni, e.nombre, e.apellido, c.nombre
ORDER BY total_pagado DESC
LIMIT 20;
```

Ejecuta esto en Supabase → SQL Editor y dame los resultados.
