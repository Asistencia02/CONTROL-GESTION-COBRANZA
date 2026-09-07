-- ==================== TABLA PARA REPORTES DE SINCRONIZACIÓN ====================
-- Crea tabla para almacenar los reportes del script v2.26

CREATE TABLE IF NOT EXISTS public.reportes_sincronizacion (
  id BIGSERIAL PRIMARY KEY,
  fecha_sincronizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- INSTITUCIÓN 1 (ISIPP)
  inst1_estudiantes_cargados INTEGER DEFAULT 0,
  inst1_estudiantes_nuevos INTEGER DEFAULT 0,
  inst1_estudiantes_actualizados INTEGER DEFAULT 0,
  inst1_pagos_creados INTEGER DEFAULT 0,
  inst1_conceptos_agrupados INTEGER DEFAULT 0,
  inst1_errores INTEGER DEFAULT 0,
  
  -- INSTITUCIÓN 2 (MILAGROS)
  inst2_estudiantes_cargados INTEGER DEFAULT 0,
  inst2_estudiantes_nuevos INTEGER DEFAULT 0,
  inst2_estudiantes_actualizados INTEGER DEFAULT 0,
  inst2_pagos_creados INTEGER DEFAULT 0,
  inst2_conceptos_agrupados INTEGER DEFAULT 0,
  inst2_errores INTEGER DEFAULT 0,
  
  -- TOTALES
  total_estudiantes_cargados INTEGER DEFAULT 0,
  total_estudiantes_nuevos INTEGER DEFAULT 0,
  total_estudiantes_actualizados INTEGER DEFAULT 0,
  total_pagos_creados INTEGER DEFAULT 0,
  total_conceptos_agrupados INTEGER DEFAULT 0,
  total_errores INTEGER DEFAULT 0,
  
  -- METADATA
  script_version VARCHAR(20) DEFAULT 'v2.26',
  estado_sincronizacion VARCHAR(50) DEFAULT 'COMPLETADA',
  
  CONSTRAINT unique_fecha_sync UNIQUE(DATE(fecha_sincronizacion))
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_reportes_fecha ON public.reportes_sincronizacion(fecha_sincronizacion DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.reportes_sincronizacion ENABLE ROW LEVEL SECURITY;

-- Política: Permitir SELECT a todos
CREATE POLICY "Permitir SELECT reportes_sincronizacion" ON public.reportes_sincronizacion
  FOR SELECT USING (true);

-- Política: Permitir INSERT/UPDATE solo a usuarios autenticados
CREATE POLICY "Permitir INSERT reportes_sincronizacion" ON public.reportes_sincronizacion
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir UPDATE reportes_sincronizacion" ON public.reportes_sincronizacion
  FOR UPDATE USING (true);

GRANT SELECT ON public.reportes_sincronizacion TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reportes_sincronizacion TO authenticated;
