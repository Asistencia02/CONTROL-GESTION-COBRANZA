-- ==================== VERIFICAR CONCEPTOS EN SUPABASE ====================

-- 1. VER TODOS LOS CONCEPTOS DE LA INSTITUCIÓN (2)
SELECT 
  id,
  institucion_id,
  nombre,
  tipo,
  mes,
  monto,
  año,
  activo,
  dias_vencimiento,
  carrera_id
FROM conceptos_pago
WHERE institucion_id = 2
ORDER BY tipo, mes;

-- 2. CONTAR CONCEPTOS POR TIPO
SELECT 
  tipo,
  COUNT(*) as cantidad
FROM conceptos_pago
WHERE institucion_id = 2
GROUP BY tipo;

-- 3. VER CONCEPTOS SEGURO (debería haber solo 1)
SELECT 
  id,
  nombre,
  tipo,
  mes,
  monto,
  activo
FROM conceptos_pago
WHERE institucion_id = 2 AND tipo = 'SEGURO';

-- 4. VER CONCEPTOS CUOTA (debería haber 12, uno por mes)
SELECT 
  id,
  nombre,
  tipo,
  mes,
  monto,
  activo
FROM conceptos_pago
WHERE institucion_id = 2 AND tipo = 'CUOTA'
ORDER BY mes;

-- 5. VER CONCEPTOS INSCRIPCION
SELECT 
  id,
  nombre,
  tipo,
  mes,
  monto,
  activo
FROM conceptos_pago
WHERE institucion_id = 2 AND tipo = 'INSCRIPCION';

-- 6. VER ESTRUCTURA DE LA TABLA (tipos de datos)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'conceptos_pago'
ORDER BY ordinal_position;
