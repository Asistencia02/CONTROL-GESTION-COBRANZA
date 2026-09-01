-- Actualizar tabla usuarios existente - VERSIÓN 3
-- Hacer email nullable si existe

ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL;

-- Agregar columnas faltantes si no existen
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(100) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contraseña VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'USER' CHECK (rol IN ('ADMIN', 'USER'));
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP;

-- Crear tabla usuario_modulos si no existe
CREATE TABLE IF NOT EXISTS usuario_modulos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo VARCHAR(50) NOT NULL CHECK (modulo IN ('dashboard', 'cobranzas', 'deudas', 'ventas', 'ventakiosco', 'gastos', 'reportes', 'cierre', 'configuracion', 'sincronizacion')),
  permitido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, modulo)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_usuarios_nombre ON usuarios(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuario_modulos_usuario ON usuario_modulos(usuario_id);

-- Row Level Security
ALTER TABLE usuario_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuario_modulos_select ON usuario_modulos FOR SELECT USING (true);
CREATE POLICY usuario_modulos_insert ON usuario_modulos FOR INSERT WITH CHECK (true);
CREATE POLICY usuario_modulos_update ON usuario_modulos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY usuario_modulos_delete ON usuario_modulos FOR DELETE USING (true);

-- Limpiar datos anteriores si existen
DELETE FROM usuarios WHERE nombre_completo IN (
  'FATIMA MEDINA', 'HUGO DUARTE', 'ALCIDES JARA', 'YOLI MEDINA', 
  'PROVEDURIA', 'KIOSCO', 'ADMIN'
);

-- Insertar usuarios predefinidos con email placeholder
INSERT INTO usuarios (nombre_completo, contraseña, rol, activo, email) VALUES
  ('FATIMA MEDINA', '123456', 'USER', true, 'fatima@mail.local'),
  ('HUGO DUARTE', '123456', 'USER', true, 'hugo@mail.local'),
  ('ALCIDES JARA', '123456', 'USER', true, 'alcides@mail.local'),
  ('YOLI MEDINA', '123456', 'USER', true, 'yoli@mail.local'),
  ('PROVEDURIA', '123456', 'USER', true, 'proveduria@mail.local'),
  ('KIOSCO', '123456', 'USER', true, 'kiosco@mail.local'),
  ('ADMIN', 'admin123', 'ADMIN', true, 'admin@mail.local')
ON CONFLICT (nombre_completo) DO UPDATE SET 
  contraseña = EXCLUDED.contraseña,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;
