-- ==================== CREAR TABLA venta_kiosco ====================
-- Tabla para registrar ventas del kiosco escolar
-- Solo para INSM (institucion_id = 2)

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

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_institucion_id ON venta_kiosco(institucion_id);
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_fecha_venta ON venta_kiosco(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_institucion_fecha ON venta_kiosco(institucion_id, fecha_venta);

-- Habilitar Row Level Security (RLS)
ALTER TABLE venta_kiosco ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan ver las ventas del kiosco (opcional, según seguridad)
CREATE POLICY venta_kiosco_select ON venta_kiosco
  FOR SELECT
  USING (true);

CREATE POLICY venta_kiosco_insert ON venta_kiosco
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY venta_kiosco_update ON venta_kiosco
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY venta_kiosco_delete ON venta_kiosco
  FOR DELETE
  USING (true);

-- ==================== COMENTARIOS ====================
COMMENT ON TABLE venta_kiosco IS 'Tabla para registrar ventas del kiosco escolar - Solo INSM';
COMMENT ON COLUMN venta_kiosco.id IS 'ID único de la venta';
COMMENT ON COLUMN venta_kiosco.institucion_id IS 'ID de la institución (2 = INSM)';
COMMENT ON COLUMN venta_kiosco.producto IS 'Nombre del producto vendido';
COMMENT ON COLUMN venta_kiosco.cantidad IS 'Cantidad vendida';
COMMENT ON COLUMN venta_kiosco.precio_unitario IS 'Precio por unidad';
COMMENT ON COLUMN venta_kiosco.subtotal IS 'Total = cantidad × precio_unitario';
COMMENT ON COLUMN venta_kiosco.metodo_pago IS 'Forma de pago: EFECTIVO, TRANSFERENCIA, TARJETA, CHEQUE';
COMMENT ON COLUMN venta_kiosco.fecha_venta IS 'Fecha de la venta';
COMMENT ON COLUMN venta_kiosco.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN venta_kiosco.updated_at IS 'Fecha de última actualización';

-- ==================== DATOS DE PRUEBA (OPCIONAL) ====================
-- Descomenta si quieres agregar datos de ejemplo
/*
INSERT INTO venta_kiosco (institucion_id, producto, cantidad, precio_unitario, subtotal, metodo_pago, fecha_venta)
VALUES
  (2, 'Gaseosa 2L', 5, 2500.00, 12500.00, 'EFECTIVO', '2026-08-20'),
  (2, 'Sándwich de Jamón', 10, 3000.00, 30000.00, 'EFECTIVO', '2026-08-20'),
  (2, 'Jugo Natural', 8, 2000.00, 16000.00, 'EFECTIVO', '2026-08-20'),
  (2, 'Galletas', 15, 1500.00, 22500.00, 'EFECTIVO', '2026-08-21'),
  (2, 'Agua Embotellada', 20, 1000.00, 20000.00, 'EFECTIVO', '2026-08-21');
*/
