-- ========================================================================
-- RPC: insertar_pagos_multiples_batch_upsert
-- Procesa 30+ pagos en UNA SOLA llamada (no 30 llamadas individuales)
-- ========================================================================

CREATE OR REPLACE FUNCTION insertar_pagos_multiples_batch_upsert(
  p_pagos JSONB
)
RETURNS TABLE(
  total_insertados INTEGER,
  total_actualizados INTEGER,
  total_detalles INTEGER,
  errores TEXT
) AS $$
DECLARE
  v_pago JSONB;
  v_pago_id BIGINT;
  v_detalle JSONB;
  v_count_insert INTEGER := 0;
  v_count_update INTEGER := 0;
  v_count_detalles INTEGER := 0;
  v_errores TEXT := '';
  v_existe BOOLEAN;
BEGIN
  
  -- Iterar sobre cada pago en el array
  FOR v_pago IN SELECT jsonb_array_elements(p_pagos)
  LOOP
    BEGIN
      -- Verificar si ya existe pago con este talonario
      SELECT EXISTS(
        SELECT 1 FROM pagos_multiples 
        WHERE numero_talonario = (v_pago->>'p_numero_talonario')
        AND institucion_id = (v_pago->>'p_institucion_id')::BIGINT
      ) INTO v_existe;
      
      IF v_existe THEN
        -- UPDATE: Actualizar pago existente
        UPDATE pagos_multiples 
        SET 
          monto_total = (v_pago->>'p_monto_total')::NUMERIC,
          cantidad_conceptos = (v_pago->>'p_cantidad_conceptos')::INTEGER,
          metodo_pago = v_pago->>'p_metodo_pago',
          updated_at = NOW()
        WHERE numero_talonario = (v_pago->>'p_numero_talonario')
        AND institucion_id = (v_pago->>'p_institucion_id')::BIGINT
        RETURNING id INTO v_pago_id;
        
        v_count_update := v_count_update + 1;
        
        -- BORRAR detalles antiguos
        DELETE FROM pagos_multiples_detalle WHERE pago_multiple_id = v_pago_id;
        
      ELSE
        -- INSERT: Crear nuevo pago
        INSERT INTO pagos_multiples 
          (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion, estado)
        VALUES 
          ((v_pago->>'p_institucion_id')::BIGINT,
           (v_pago->>'p_estudiante_id')::BIGINT,
           v_pago->>'p_numero_talonario',
           (v_pago->>'p_monto_total')::NUMERIC,
           (v_pago->>'p_cantidad_conceptos')::INTEGER,
           v_pago->>'p_metodo_pago',
           (v_pago->>'p_fecha_cobro')::DATE,
           v_pago->>'p_descripcion',
           'PAGADO')
        RETURNING id INTO v_pago_id;
        
        v_count_insert := v_count_insert + 1;
      END IF;
      
      -- INSERTAR detalles
      FOR v_detalle IN SELECT * FROM jsonb_array_elements(v_pago->'p_detalles')
      LOOP
        INSERT INTO pagos_multiples_detalle 
          (pago_multiple_id, concepto_id, monto_original, monto_pagado)
        VALUES 
          (v_pago_id,
           (v_detalle->>'concepto_id')::BIGINT,
           (v_detalle->>'monto_original')::NUMERIC,
           (v_detalle->>'monto_pagado')::NUMERIC);
        
        v_count_detalles := v_count_detalles + 1;
      END LOOP;
      
    EXCEPTION WHEN OTHERS THEN
      v_errores := v_errores || 'Error pago ' || v_pago->>'p_numero_talonario' || ': ' || SQLERRM || ' | ';
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_count_insert, v_count_update, v_count_detalles, v_errores;
  
END;
$$ LANGUAGE plpgsql;
