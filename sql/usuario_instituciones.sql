-- Agregar columnas a tabla usuarios
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS puede_cambiar_institucion BOOLEAN DEFAULT false;

-- Crear tabla usuario_instituciones para asignar instituciones específicas
CREATE TABLE IF NOT EXISTS public.usuario_instituciones (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  institucion_id INT NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  asignado_por_admin BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, institucion_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_instituciones_usuario ON public.usuario_instituciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_instituciones_institucion ON public.usuario_instituciones(institucion_id);

ALTER TABLE public.usuario_instituciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuario_instituciones_select ON public.usuario_instituciones;
CREATE POLICY usuario_instituciones_select ON public.usuario_instituciones FOR SELECT USING (true);

DROP POLICY IF EXISTS usuario_instituciones_insert ON public.usuario_instituciones;
CREATE POLICY usuario_instituciones_insert ON public.usuario_instituciones FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS usuario_instituciones_update ON public.usuario_instituciones;
CREATE POLICY usuario_instituciones_update ON public.usuario_instituciones FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS usuario_instituciones_delete ON public.usuario_instituciones;
CREATE POLICY usuario_instituciones_delete ON public.usuario_instituciones FOR DELETE USING (true);

-- Permitir cambio de institución solo a ADMIN por defecto
UPDATE public.usuarios SET puede_cambiar_institucion = true WHERE rol = 'ADMIN';

-- Asignar institución 2 (INSM) a todos los usuarios normales
-- Se asume que instituciones existen. Si no, cambiar el ID según sea necesario
INSERT INTO public.usuario_instituciones (usuario_id, institucion_id, asignado_por_admin)
SELECT u.id, 2, true
FROM public.usuarios u
WHERE u.nombre_completo IN (
  'FATIMA MEDINA', 'HUGO DUARTE', 'ALCIDES JARA', 'YOLI MEDINA',
  'PROVEDURIA', 'KIOSCO'
)
ON CONFLICT (usuario_id, institucion_id) DO NOTHING;

-- ADMIN puede ver todas las instituciones (se carga dinámicamente)
