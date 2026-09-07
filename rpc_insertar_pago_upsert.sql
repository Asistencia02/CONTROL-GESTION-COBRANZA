-- ========================================================================
-- RPC: insertar_pago_multiple_con_detalles_upsert
-- Descripción: INSERT/UPDATE inteligente con comparación de datos
-- Devuelve: accion (insertado/actualizado), detalles_insertados, pago_multiple_id
-- ========================================================================

CREATE OR REPLACE FUNCTION insertar_pago_multiple_con_detalles_upsert(
  p_institucion_id BIGINT,
  p_estudiante_id BIGINT,
  p_numero_talonario VARCHAR,
  p_monto_total NUMERIC,
  p_cantidad_conceptos INTEGER,
  p_metodo_pago VARCHAR,
  p_fecha_cobro DATE,
  p_descripcion TEXT,
  p_detalles JSONB
)
RETURNS TABLE(
  pago_multiple_id BIGINT, 
  detalles_insertados INTEGER,
  accion VARCHAR
) AS $$
DECLARE
  v_pago_id BIGINT;
  v_detalle JSONB;
  v_count INTEGER := 0;
  v_accion VARCHAR := 'insertado';
  v_existe BOOLEAN;
BEGIN
  
  -- Verificar si ya existe pago con este talonario
  SELECT EXISTS(
    SELECT 1 FROM pagos_multiples 
    WHERE numero_talonario = p_numero_talonario 
    AND institucion_id = p_institucion_id
  ) INTO v_existe;
  
  IF v_existe THEN
    -- UPDATE: Actualizar pago existente
    v_accion := 'actualizado';
    
    UPDATE pagos_multiples 
    SET 
      monto_total = p_monto_total,
      cantidad_conceptos = p_cantidad_conceptos,
      metodo_pago = p_metodo_pago,
      updated_at = NOW()
    WHERE numero_talonario = p_numero_talonario
    AND institucion_id = p_institucion_id
    RETURNING id INTO v_pago_id;
    
    -- BORRAR detalles antiguos
    DELETE FROM pagos_multiples_detalle WHERE pago_multiple_id = v_pago_id;
    
  ELSE
    -- INSERT: Crear nuevo pago
    v_accion := 'insertado';
    
    INSERT INTO pagos_multiples 
      (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion, estado)
    VALUES 
      (p_institucion_id, p_estudiante_id, p_numero_talonario, p_monto_total, p_cantidad_conceptos, p_metodo_pago, p_fecha_cobro, p_descripcion, 'PAGADO')
    RETURNING id INTO v_pago_id;
  END IF;
  
  -- INSERTAR nuevos detalles
  FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
  LOOP
    INSERT INTO pagos_multiples_detalle 
      (pago_multiple_id, concepto_id, monto_original, monto_pagado)
    VALUES 
      (v_pago_id, 
       (v_detalle->>'concepto_id')::BIGINT, 
       (v_detalle->>'monto_original')::NUMERIC, 
       (v_detalle->>'monto_pagado')::NUMERIC);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_pago_id, v_count, v_accion;
  
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- ÍNDICE UNIQUE para numero_talonario (para evitar duplicados)
-- ========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_pagos_multiples_talonario 
ON pagos_multiples(numero_talonario, institucion_id);
