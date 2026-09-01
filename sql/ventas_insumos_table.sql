-- Crear tabla ventas_insumos para registrar ventas de insumos
-- La tabla almacena cada transaccion de venta de insumos

CREATE TABLE IF NOT EXISTS ventas_insumos (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INT NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  insumo_id INT NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal > 0),
  metodo_pago VARCHAR(20) DEFAULT 'EFECTIVO' CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE')),
  numero_talonario VARCHAR(50),
  fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
  estado VARCHAR(20) DEFAULT 'VENDIDO' CHECK (estado IN ('VENDIDO', 'ANULADO')),
  fecha_anulacion TIMESTAMP,
  motivo_anulacion TEXT,
  anulado_por VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_ventas_insumos_institucion ON ventas_insumos(institucion_id);
CREATE INDEX IF NOT EXISTS idx_ventas_insumos_insumo ON ventas_insumos(insumo_id);
CREATE INDEX IF NOT EXISTS idx_ventas_insumos_fecha ON ventas_insumos(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_insumos_estado ON ventas_insumos(estado);

-- Row Level Security
ALTER TABLE ventas_insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY ventas_insumos_select ON ventas_insumos FOR SELECT USING (true);
CREATE POLICY ventas_insumos_insert ON ventas_insumos FOR INSERT WITH CHECK (true);
CREATE POLICY ventas_insumos_update ON ventas_insumos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY ventas_insumos_delete ON ventas_insumos FOR DELETE USING (true);
