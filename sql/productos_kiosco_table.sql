-- ==================== CREAR TABLA productos_kiosco ====================
-- Tabla para gestionar el catálogo y stock del kiosco escolar

CREATE TABLE IF NOT EXISTS productos_kiosco (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INT NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario > 0),
  stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INT DEFAULT 5,
  categoria TEXT NOT NULL DEFAULT 'Otros',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_institucion ON productos_kiosco(institucion_id);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_activo ON productos_kiosco(activo);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_categoria ON productos_kiosco(categoria);

-- RLS
ALTER TABLE productos_kiosco ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_kiosco_select ON productos_kiosco FOR SELECT USING (true);
CREATE POLICY productos_kiosco_insert ON productos_kiosco FOR INSERT WITH CHECK (true);
CREATE POLICY productos_kiosco_update ON productos_kiosco FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY productos_kiosco_delete ON productos_kiosco FOR DELETE USING (true);

COMMENT ON TABLE productos_kiosco IS 'Catálogo de productos del kiosco con control de stock';
COMMENT ON COLUMN productos_kiosco.institucion_id IS 'ID de institución (2 = INSM)';
COMMENT ON COLUMN productos_kiosco.nombre IS 'Nombre del producto';
COMMENT ON COLUMN productos_kiosco.precio_unitario IS 'Precio de venta';
COMMENT ON COLUMN productos_kiosco.stock_actual IS 'Cantidad disponible';
COMMENT ON COLUMN productos_kiosco.stock_minimo IS 'Alerta de stock bajo';
COMMENT ON COLUMN productos_kiosco.categoria IS 'Categoría del producto';
COMMENT ON COLUMN productos_kiosco.activo IS 'Si está disponible para venta';
