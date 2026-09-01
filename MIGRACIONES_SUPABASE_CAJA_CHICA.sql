-- ==================== MIGRACIONES SUPABASE v2.8 - CAJA CHICA ====================

-- 1. ACTUALIZAR tabla venta_kiosco - Agregar campos de efectivo
ALTER TABLE venta_kiosco 
ADD COLUMN IF NOT EXISTS monto_entregado INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cambio INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS caja_chica_id BIGINT REFERENCES caja_chica(id) ON DELETE SET NULL;

-- 2. CREAR tabla caja_chica
CREATE TABLE IF NOT EXISTS caja_chica (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INTEGER NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  fecha_apertura DATE NOT NULL,
  fecha_cierre DATE DEFAULT NULL,
  saldo_inicial INTEGER NOT NULL DEFAULT 0,
  saldo_final INTEGER DEFAULT NULL,
  saldo_residual INTEGER NOT NULL DEFAULT 0,
  monto_transferido INTEGER DEFAULT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK(estado IN ('ABIERTA', 'CERRADA')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(institucion_id, fecha_apertura, estado) -- Solo una caja abierta por institución por día
);

-- 3. CREAR tabla caja_grande
CREATE TABLE IF NOT EXISTS caja_grande (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INTEGER NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  fecha_transferencia DATE NOT NULL,
  monto INTEGER NOT NULL,
  origen_caja_chica_id BIGINT REFERENCES caja_chica(id) ON DELETE SET NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA' CHECK(estado IN ('COMPLETADA', 'ANULADA')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. AGREGAR campo saldo_minimo_caja_chica a instituciones (CORRECCIÓN)
ALTER TABLE instituciones
ADD COLUMN IF NOT EXISTS saldo_minimo_caja_chica INTEGER DEFAULT 5000;

-- 5. CREAR índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_caja_chica_institucion ON caja_chica(institucion_id);
CREATE INDEX IF NOT EXISTS idx_caja_chica_estado ON caja_chica(estado);
CREATE INDEX IF NOT EXISTS idx_caja_chica_fecha ON caja_chica(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_caja_grande_institucion ON caja_grande(institucion_id);
CREATE INDEX IF NOT EXISTS idx_caja_grande_fecha ON caja_grande(fecha_transferencia);
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_caja ON venta_kiosco(caja_chica_id);

-- ==================== FIN MIGRACIONES ====================
