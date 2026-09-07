-- ==================== RPC CORREGIDO ====================
-- search_estudiantes_by_dni - BUSCA POR DNI Y INSTITUCIÓN
-- Uso: SELECT * FROM search_estudiantes_by_dni(1, ARRAY['10000678', '10000679'])

CREATE OR REPLACE FUNCTION search_estudiantes_by_dni(
  p_institucion_id BIGINT,
  dni_list TEXT[]
)
RETURNS TABLE(id BIGINT, dni TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.dni 
  FROM estudiantes e
  WHERE e.dni = ANY(dni_list)
  AND e.institucion_id = p_institucion_id;
END;
$$ LANGUAGE plpgsql;
