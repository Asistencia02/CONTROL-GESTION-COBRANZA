-- Ejecuta estos comandos SQL en Supabase

-- 1. CREAR TABLA productos_kiosco
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

CREATE INDEX IF NOT EXISTS idx_productos_kiosco_institucion ON productos_kiosco(institucion_id);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_activo ON productos_kiosco(activo);
CREATE INDEX IF NOT EXISTS idx_productos_kiosco_categoria ON productos_kiosco(categoria);

ALTER TABLE productos_kiosco ENABLE ROW LEVEL SECURITY;

CREATE POLICY productos_kiosco_select ON productos_kiosco FOR SELECT USING (true);
CREATE POLICY productos_kiosco_insert ON productos_kiosco FOR INSERT WITH CHECK (true);
CREATE POLICY productos_kiosco_update ON productos_kiosco FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY productos_kiosco_delete ON productos_kiosco FOR DELETE USING (true);

-- 2. CREAR TABLA venta_kiosco (si no existe)
CREATE TABLE IF NOT EXISTS venta_kiosco (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INT NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  producto TEXT NOT NULL,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario > 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal > 0),
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE')),
  fecha_venta DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_venta_kiosco_institucion_id ON venta_kiosco(institucion_id);
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_fecha_venta ON venta_kiosco(fecha_venta);

ALTER TABLE venta_kiosco ENABLE ROW LEVEL SECURITY;

CREATE POLICY venta_kiosco_select ON venta_kiosco FOR SELECT USING (true);
CREATE POLICY venta_kiosco_insert ON venta_kiosco FOR INSERT WITH CHECK (true);
CREATE POLICY venta_kiosco_update ON venta_kiosco FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY venta_kiosco_delete ON venta_kiosco FOR DELETE USING (true);
