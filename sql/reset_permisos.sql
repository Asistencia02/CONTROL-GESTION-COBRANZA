-- Limpiar permisos anteriores y resetear a configuración default
DELETE FROM public.usuario_modulos;

-- Insertar permisos default:
-- ADMIN: todos
-- PROVEDURIA: dashboard, ventas, reportes
-- KIOSCO: dashboard, ventakiosco, reportes
-- Otros: dashboard, reportes

WITH usuarios_ids AS (
  SELECT id, nombre_completo
  FROM public.usuarios
  WHERE nombre_completo IN (
    'FATIMA MEDINA', 'HUGO DUARTE', 'ALCIDES JARA', 'YOLI MEDINA',
    'PROVEDURIA', 'KIOSCO', 'ADMIN'
  )
)
INSERT INTO public.usuario_modulos (usuario_id, modulo, permitido)
SELECT
  u.id,
  m.modulo,
  CASE
    WHEN ur.rol = 'ADMIN' THEN true
    WHEN u.nombre_completo = 'PROVEDURIA' THEN m.modulo IN ('dashboard', 'ventas', 'reportes')
    WHEN u.nombre_completo = 'KIOSCO' THEN m.modulo IN ('dashboard', 'ventakiosco', 'reportes')
    ELSE m.modulo IN ('dashboard', 'reportes')
  END AS permitido
FROM usuarios_ids u
CROSS JOIN (
  VALUES
    ('dashboard'), ('cobranzas'), ('deudas'), ('ventas'), ('ventakiosco'),
    ('gastos'), ('reportes'), ('cierre'), ('configuracion'), ('sincronizacion')
) AS m(modulo)
CROSS JOIN public.usuarios ur
WHERE ur.id = u.id;
