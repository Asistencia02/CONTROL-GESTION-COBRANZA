CREATE OR REPLACE FUNCTION insertar_pago_multiple_con_detalles_v2(
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
RETURNS TABLE(pago_multiple_id BIGINT, detalles_insertados INTEGER) AS $$
DECLARE
  v_pago_id BIGINT;
  v_detalle JSONB;
  v_count INTEGER := 0;
BEGIN
  -- INSERT con ON CONFLICT: evita duplicados si numero_talonario ya existe
  INSERT INTO pagos_multiples 
    (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion, estado)
  VALUES 
    (p_institucion_id, p_estudiante_id, p_numero_talonario, p_monto_total, p_cantidad_conceptos, p_metodo_pago, p_fecha_cobro, p_descripcion, 'PAGADO')
  ON CONFLICT (numero_talonario) 
  DO UPDATE SET 
    monto_total = p_monto_total,
    cantidad_conceptos = p_cantidad_conceptos,
    metodo_pago = p_metodo_pago,
    updated_at = NOW()
  RETURNING id INTO v_pago_id;
  
  -- BORRAR detalles antiguos (si fue upsert)
  DELETE FROM pagos_multiples_detalle WHERE pago_multiple_id = v_pago_id;
  
  -- INSERTAR nuevos detalles
  FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
  LOOP
    INSERT INTO pagos_multiples_detalle 
      (pago_multiple_id, concepto_id, monto_original, monto_pagado)
    VALUES 
      (v_pago_id, (v_detalle->>'concepto_id')::BIGINT, (v_detalle->>'monto_original')::NUMERIC, (v_detalle->>'monto_pagado')::NUMERIC);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_pago_id, v_count;
END;
$$ LANGUAGE plpgsql;
