-- Crear tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre_completo VARCHAR(100) NOT NULL UNIQUE,
  contraseña VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'USER' CHECK (rol IN ('ADMIN', 'USER')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla usuario_modulos para permisos
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
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_modulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select ON usuarios FOR SELECT USING (true);
CREATE POLICY usuarios_insert ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY usuarios_update ON usuarios FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY usuario_modulos_select ON usuario_modulos FOR SELECT USING (true);
CREATE POLICY usuario_modulos_insert ON usuario_modulos FOR INSERT WITH CHECK (true);
CREATE POLICY usuario_modulos_update ON usuario_modulos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY usuario_modulos_delete ON usuario_modulos FOR DELETE USING (true);

-- Insertar usuarios predefinidos (las contraseñas deben ser hash en producción)
INSERT INTO usuarios (nombre_completo, contraseña, rol, activo) VALUES
  ('FATIMA MEDINA', '123456', 'USER', true),
  ('HUGO DUARTE', '123456', 'USER', true),
  ('ALCIDES JARA', '123456', 'USER', true),
  ('YOLI MEDINA', '123456', 'USER', true),
  ('PROVEDURIA', '123456', 'USER', true),
  ('KIOSCO', '123456', 'USER', true),
  ('ADMIN', 'admin123', 'ADMIN', true)
ON CONFLICT DO NOTHING;

-- Configurar permisos por defecto para usuarios normales (excluir algunos módulos)
-- Cada usuario puede ver: dashboard, reportes
-- PROVEDURIA ve: dashboard, ventas, reportes
-- KIOSCO ve: dashboard, ventakiosco, reportes
-- Otros usuarios ven según su rol
