-- ========================================================================
-- RPC CORREGIDA: insertar_pagos_multiples_batch_upsert
-- Procesa múltiples pagos en UNA llamada (UPSERT)
-- ========================================================================

DROP FUNCTION IF EXISTS insertar_pagos_multiples_batch_upsert(jsonb) CASCADE;

CREATE OR REPLACE FUNCTION insertar_pagos_multiples_batch_upsert(p_pagos jsonb)
RETURNS jsonb AS $$
DECLARE
  v_pago jsonb;
  v_pago_id bigint;
  v_detalle jsonb;
  v_count_insert integer := 0;
  v_count_update integer := 0;
  v_count_detalles integer := 0;
  v_resultado jsonb;
BEGIN
  
  -- Iterar sobre cada pago en el array
  FOR v_pago IN SELECT jsonb_array_elements(p_pagos)
  LOOP
    BEGIN
      -- Intentar UPDATE primero
      UPDATE pagos_multiples 
      SET 
        monto_total = (v_pago->>'p_monto_total')::numeric,
        cantidad_conceptos = (v_pago->>'p_cantidad_conceptos')::integer,
        metodo_pago = v_pago->>'p_metodo_pago',
        updated_at = now()
      WHERE numero_talonario = (v_pago->>'p_numero_talonario')
      AND institucion_id = (v_pago->>'p_institucion_id')::bigint
      RETURNING id INTO v_pago_id;
      
      -- Si UPDATE modificó algo, es actualización
      IF FOUND THEN
        v_count_update := v_count_update + 1;
        
        -- Borrar detalles antiguos
        DELETE FROM pagos_multiples_detalle WHERE pago_multiple_id = v_pago_id;
        
      ELSE
        -- Si no existe, hacer INSERT
        INSERT INTO pagos_multiples 
          (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion, estado)
        VALUES 
          ((v_pago->>'p_institucion_id')::bigint,
           (v_pago->>'p_estudiante_id')::bigint,
           v_pago->>'p_numero_talonario',
           (v_pago->>'p_monto_total')::numeric,
           (v_pago->>'p_cantidad_conceptos')::integer,
           v_pago->>'p_metodo_pago',
           (v_pago->>'p_fecha_cobro')::date,
           v_pago->>'p_descripcion',
           'PAGADO')
        RETURNING id INTO v_pago_id;
        
        v_count_insert := v_count_insert + 1;
      END IF;
      
      -- Insertar detalles
      FOR v_detalle IN SELECT * FROM jsonb_array_elements(v_pago->'p_detalles')
      LOOP
        INSERT INTO pagos_multiples_detalle 
          (pago_multiple_id, concepto_id, monto_original, monto_pagado)
        VALUES 
          (v_pago_id,
           (v_detalle->>'concepto_id')::bigint,
           (v_detalle->>'monto_original')::numeric,
           (v_detalle->>'monto_pagado')::numeric);
        
        v_count_detalles := v_count_detalles + 1;
      END LOOP;
      
    EXCEPTION WHEN OTHERS THEN
      -- Continuar con el siguiente pago en caso de error
      CONTINUE;
    END;
  END LOOP;
  
  -- Retornar resultado como JSON
  v_resultado := jsonb_build_object(
    'total_insertados', v_count_insert,
    'total_actualizados', v_count_update,
    'total_detalles', v_count_detalles
  );
  
  RETURN v_resultado;
  
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- VERIFICAR que la función se creó correctamente
-- ========================================================================
-- SELECT * FROM information_schema.routines 
-- WHERE routine_name = 'insertar_pagos_multiples_batch_upsert';
